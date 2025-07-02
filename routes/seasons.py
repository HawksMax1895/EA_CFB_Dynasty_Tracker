from flask import Blueprint, request, jsonify # type: ignore
from marshmallow import ValidationError
from extensions import db
from models import Season, Conference, TeamSeason, Game, Team, PlayerSeason, AwardWinner, Honor
from schemas import CreateSeasonSchema
import datetime

seasons_bp = Blueprint('seasons', __name__)

@seasons_bp.route('/seasons', methods=['GET'])
def get_seasons():
    seasons = Season.query.all()
    return jsonify([{'season_id': s.season_id, 'year': s.year} for s in seasons])

@seasons_bp.route('/seasons', methods=['POST'])
def create_season():
    data = request.json or {}
    try:
        validated = CreateSeasonSchema().load(data)
    except ValidationError as err:
        return jsonify(err.messages), 400
    year = validated.get('year')
    if not year:
        # Find the most recent season and increment year
        last_season = Season.query.order_by(Season.year.desc()).first()
        if last_season:
            year = last_season.year + 1
        else:
            year = datetime.datetime.now().year
    if Season.query.filter_by(year=year).first():
        return jsonify({'error': f'Season for year {year} already exists'}), 400
    season = Season(year=year)
    db.session.add(season)
    db.session.flush()  # Get season_id

    # Find the user-controlled team
    user_team = Team.query.filter_by(is_user_controlled=True).first()
    if not user_team:
        # If no user team exists, create a default one or use the first team
        user_team = Team.query.first()
        if not user_team:
            return jsonify({'error': 'No teams found in database'}), 400

    # Create bye week games for weeks 0-16
    for week in range(17):
        game = Game(
            season_id=season.season_id, 
            week=week, 
            home_team_id=user_team.team_id, 
            away_team_id=user_team.team_id,
            game_type="Bye Week"
        )
        db.session.add(game)

    # --- NEW: Create TeamSeason records for all teams ---
    all_teams = Team.query.all()
    # Get previous season's AP poll (final_rank 1-25)
    prev_season = Season.query.order_by(Season.year.desc()).filter(Season.year < year).first()
    prev_ap_poll = {}
    if prev_season:
        prev_team_seasons = TeamSeason.query.filter_by(season_id=prev_season.season_id).all()
        for ts in prev_team_seasons:
            if ts.final_rank and ts.final_rank <= 25:
                prev_ap_poll[ts.team_id] = ts.final_rank
    for team in all_teams:
        # Use the team's primary_conference_id
        conference_id = team.primary_conference_id
        if not conference_id:
            # Fallback: assign to first conference if not set
            first_conf = Conference.query.first()
            conference_id = first_conf.conference_id if first_conf else None
        # Set final_rank from previous season if in AP poll
        final_rank = prev_ap_poll.get(team.team_id)
        ts = TeamSeason(team_id=team.team_id, season_id=season.season_id, conference_id=conference_id, final_rank=final_rank)
        db.session.add(ts)

    # --- NEW: Automatically generate empty 12-team playoff bracket ---
    # Bracket structure:
    # First Round: 4 games (5v12, 6v11, 7v10, 8v9)
    # Quarterfinals: 4 games (1vG4, 2vG3, 3vG2, 4vG1)
    # Semifinals: 2 games (G5vG8, G6vG7)
    # Championship: 1 game (G9vG10)
    playoff_games = [
        # First Round (week 17)
        {"week": 17, "playoff_round": "First Round"},
        {"week": 17, "playoff_round": "First Round"},
        {"week": 17, "playoff_round": "First Round"},
        {"week": 17, "playoff_round": "First Round"},
        # Quarterfinals (week 18)
        {"week": 18, "playoff_round": "Quarterfinals"},
        {"week": 18, "playoff_round": "Quarterfinals"},
        {"week": 18, "playoff_round": "Quarterfinals"},
        {"week": 18, "playoff_round": "Quarterfinals"},
        # Semifinals (week 19)
        {"week": 19, "playoff_round": "Semifinals"},
        {"week": 19, "playoff_round": "Semifinals"},
        # Championship (week 20)
        {"week": 20, "playoff_round": "Championship"},
    ]
    for g in playoff_games:
        game = Game(
            season_id=season.season_id,
            week=g["week"],
            home_team_id=None,
            away_team_id=None,
            game_type="Playoff",
            playoff_round=g["playoff_round"]
        )
        db.session.add(game)
    # --- END NEW ---

    db.session.commit()
    db.session.expire_all()  # Ensure session is up-to-date

    # Debug: print all seasons after commit
    all_seasons = Season.query.order_by(Season.year).all()
    print('All seasons after commit:', [(s.season_id, s.year) for s in all_seasons])

    # --- NEW: Automatically progress players from the previous season ---
    if prev_season:
        try:
            from routes.season_actions import progress_players_logic
            print(f'Progressing players for prev_season.year={prev_season.year}, prev_season.season_id={prev_season.season_id}')
            progression_result = progress_players_logic(prev_season.season_id)
            print(f"Player progression completed: {progression_result}")
        except Exception as e:
            print(f"Error during player progression: {e}")
            pass

    return jsonify({'season_id': season.season_id, 'year': season.year}), 201

@seasons_bp.route('/conferences', methods=['GET'])
def get_conferences():
    conferences = Conference.query.all()
    return jsonify([{'conference_id': c.conference_id, 'name': c.name, 'tier': c.tier} for c in conferences])

@seasons_bp.route('/conferences', methods=['POST'])
def create_conference():
    data = request.json
    name = data.get('name')
    tier = data.get('tier')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    conference = Conference(name=name, tier=tier)
    db.session.add(conference)
    db.session.commit()
    return jsonify({'conference_id': conference.conference_id, 'name': conference.name, 'tier': conference.tier}), 201

@seasons_bp.route('/seasons/<int:season_id>', methods=['GET'])
def get_season(season_id):
    season = Season.query.get_or_404(season_id)
    return jsonify({'season_id': season.season_id, 'year': season.year})

@seasons_bp.route('/seasons/<int:season_id>/teams', methods=['GET'])
def get_teams_in_season(season_id):
    all_param = request.args.get('all', 'false').lower() == 'true'
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    teams = {t.team_id: t for t in Team.query.all()}
    conferences = {c.conference_id: c for c in Conference.query.all()}
    if all_param:
        # Return all teams for the season
        return jsonify([
            {
                'team_id': ts.team_id,
                'team_name': teams[ts.team_id].name if ts.team_id in teams else None,
                'is_user_controlled': teams[ts.team_id].is_user_controlled if ts.team_id in teams else None,
                'logo_url': teams[ts.team_id].logo_url if ts.team_id in teams else None,
                'conference_id': ts.conference_id,
                'conference_name': conferences[ts.conference_id].name if ts.conference_id in conferences else None,
                'wins': ts.wins,
                'losses': ts.losses,
                'conference_wins': ts.conference_wins,
                'conference_losses': ts.conference_losses,
                'points_for': ts.points_for,
                'points_against': ts.points_against,
                'pass_yards': ts.pass_yards,
                'rush_yards': ts.rush_yards,
                'pass_tds': ts.pass_tds,
                'rush_tds': ts.rush_tds,
                'off_ppg': ts.off_ppg,
                'def_ppg': ts.def_ppg,
                'offense_yards': ts.offense_yards,
                'defense_yards': ts.defense_yards,
                'sacks': ts.sacks,
                'interceptions': ts.interceptions,
                'prestige': ts.prestige,
                'team_rating': ts.team_rating,
                'final_rank': ts.final_rank,
                'recruiting_rank': ts.recruiting_rank,
                'offense_yards_rank': ts.offense_yards_rank,
                'defense_yards_rank': ts.defense_yards_rank,
                'pass_yards_rank': ts.pass_yards_rank,
                'rush_yards_rank': ts.rush_yards_rank,
                'pass_tds_rank': ts.pass_tds_rank,
                'rush_tds_rank': ts.rush_tds_rank,
                'off_ppg_rank': ts.off_ppg_rank,
                'def_ppg_rank': ts.def_ppg_rank,
                'sacks_rank': ts.sacks_rank,
                'interceptions_rank': ts.interceptions_rank,
                'points_for_rank': ts.points_for_rank,
                'points_against_rank': ts.points_against_rank
            }
            for ts in team_seasons
        ])
    # Only include top 25 by final_rank
    top_25 = sorted([ts for ts in team_seasons if ts.final_rank and ts.final_rank <= 25], key=lambda ts: ts.final_rank)[:25]
    return jsonify([
        {
            'team_id': ts.team_id,
            'team_name': teams[ts.team_id].name if ts.team_id in teams else None,
            'is_user_controlled': teams[ts.team_id].is_user_controlled if ts.team_id in teams else None,
            'logo_url': teams[ts.team_id].logo_url if ts.team_id in teams else None,
            'conference_id': ts.conference_id,
            'conference_name': conferences[ts.conference_id].name if ts.conference_id in conferences else None,
            'wins': ts.wins,
            'losses': ts.losses,
            'conference_wins': ts.conference_wins,
            'conference_losses': ts.conference_losses,
            'points_for': ts.points_for,
            'points_against': ts.points_against,
            'pass_yards': ts.pass_yards,
            'rush_yards': ts.rush_yards,
            'pass_tds': ts.pass_tds,
            'rush_tds': ts.rush_tds,
            'off_ppg': ts.off_ppg,
            'def_ppg': ts.def_ppg,
            'sacks': ts.sacks,
            'interceptions': ts.interceptions,
            'prestige': ts.prestige,
            'team_rating': ts.team_rating,
            'final_rank': ts.final_rank,
            'recruiting_rank': ts.recruiting_rank,
            'national_rank': i + 1
        }
        for i, ts in enumerate(top_25)
    ])

@seasons_bp.route('/seasons/<int:season_id>/teams/<int:team_id>', methods=['PUT'])
def update_team_season(season_id, team_id):
    ts = TeamSeason.query.filter_by(season_id=season_id, team_id=team_id).first()
    if not ts:
        # Create a new TeamSeason if it doesn't exist
        team = Team.query.get(team_id)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
        conference_id = team.primary_conference_id
        ts = TeamSeason(team_id=team_id, season_id=season_id, conference_id=conference_id)
        db.session.add(ts)
    data = request.json
    for field in [
        'wins', 'losses', 'conference_wins', 'conference_losses', 'points_for', 'points_against',
        'offense_yards', 'defense_yards', 'pass_yards', 'rush_yards', 'pass_tds', 'rush_tds',
        'off_ppg', 'def_ppg', 'sacks', 'interceptions', 'prestige', 'team_rating', 'final_rank',
        'recruiting_rank', 'conference_id',
        'offense_yards_rank', 'defense_yards_rank', 'pass_yards_rank', 'rush_yards_rank',
        'pass_tds_rank', 'rush_tds_rank', 'off_ppg_rank', 'def_ppg_rank', 'sacks_rank',
        'interceptions_rank', 'points_for_rank', 'points_against_rank'
    ]:
        if field in data:
            setattr(ts, field, data[field])
    db.session.commit()
    return jsonify({'message': 'Team season updated'})

@seasons_bp.route('/seasons/<int:season_id>/leaders', methods=['GET'])
def get_season_leaders(season_id):
    # Example: top 5 in passing yards, rushing yards, receiving yards
    leaders = {}
    stat_fields = [
        ('pass_yards', 'Passing Yards'),
        ('rush_yards', 'Rushing Yards'),
        ('rec_yards', 'Receiving Yards')
    ]
    for field, label in stat_fields:
        top = PlayerSeason.query.filter_by(season_id=season_id).order_by(getattr(PlayerSeason, field).desc()).limit(5).all()
        leaders[label] = [
            {
                'player_id': ps.player_id,
                'team_id': ps.team_id,
                'value': getattr(ps, field, 0)
            } for ps in top if getattr(ps, field, None) is not None
        ]
    return jsonify(leaders)

@seasons_bp.route('/seasons/<int:season_id>/standings', methods=['GET'])
def get_season_standings(season_id):
    # Group by conference with a join to avoid repeated conference lookups
    query = (
        db.session.query(TeamSeason, Conference.name)
        .outerjoin(Conference, TeamSeason.conference_id == Conference.conference_id)
        .filter(TeamSeason.season_id == season_id)
    )

    standings = {}
    for ts, conf_name in query.all():
        conf_key = conf_name if conf_name else str(ts.conference_id)
        if conf_key not in standings:
            standings[conf_key] = []
        standings[conf_key].append({
            'team_id': ts.team_id,
            'wins': ts.wins,
            'losses': ts.losses,
            'prestige': ts.prestige,
            'team_rating': ts.team_rating
        })
    return jsonify(standings)

@seasons_bp.route('/conferences/<int:conference_id>/teams', methods=['GET'])
def get_conference_teams(conference_id):
    season_id = request.args.get('season_id', type=int)
    teams = Team.query.filter_by(primary_conference_id=conference_id).all()
    team_map = {t.team_id: t for t in teams}
    conference = Conference.query.get(conference_id)
    team_seasons = {ts.team_id: ts for ts in TeamSeason.query.filter_by(conference_id=conference_id, season_id=season_id).all()} if season_id else {}
    result = []
    for team in teams:
        ts = team_seasons.get(team.team_id)
        result.append({
            'team_id': team.team_id,
            'team_name': team.name,
            'logo_url': team.logo_url,
            'abbreviation': team.abbreviation,
            'wins': ts.wins if ts else 0,
            'losses': ts.losses if ts else 0,
            'conference_wins': ts.conference_wins if ts else 0,
            'conference_losses': ts.conference_losses if ts else 0,
            'points_for': ts.points_for if ts else None,
            'points_against': ts.points_against if ts else None,
            'pass_yards': ts.pass_yards if ts else None,
            'rush_yards': ts.rush_yards if ts else None,
            'pass_tds': ts.pass_tds if ts else None,
            'rush_tds': ts.rush_tds if ts else None,
            'off_ppg': ts.off_ppg if ts else None,
            'def_ppg': ts.def_ppg if ts else None,
            'sacks': ts.sacks if ts else None,
            'interceptions': ts.interceptions if ts else None,
            'prestige': ts.prestige if ts else None,
            'team_rating': ts.team_rating if ts else None,
            'final_rank': ts.final_rank if ts else None,
            'recruiting_rank': ts.recruiting_rank if ts else None,
            'conference_name': conference.name if conference else None
        })
    return jsonify(result)

@seasons_bp.route('/seasons/<int:season_id>/promotion_relegation', methods=['GET'])
def get_promotion_relegation(season_id):
    prev_season = Season.query.filter(Season.season_id < season_id).order_by(Season.season_id.desc()).first()
    if not prev_season:
        return jsonify({'message': 'No previous season to compare.'})
    current = TeamSeason.query.filter_by(season_id=season_id).all()
    previous = TeamSeason.query.filter_by(season_id=prev_season.season_id).all()
    prev_conf = {ts.team_id: ts.conference_id for ts in previous}

    # Prefetch conference names to avoid repeated lookups
    conf_ids = {ts.conference_id for ts in current} | set(prev_conf.values())
    conf_map = {
        c.conference_id: c.name
        for c in Conference.query.filter(Conference.conference_id.in_(conf_ids)).all()
    }

    changes = []
    for ts in current:
        prev_cid = prev_conf.get(ts.team_id)
        if prev_cid and prev_cid != ts.conference_id:
            changes.append({
                'team_id': ts.team_id,
                'from_conference': conf_map.get(prev_cid, prev_cid),
                'to_conference': conf_map.get(ts.conference_id, ts.conference_id)
            })
    return jsonify(changes)

@seasons_bp.route('/seasons/<int:season_id>', methods=['DELETE'])
def delete_season(season_id):
    season = Season.query.get_or_404(season_id)
    # Only allow deleting the latest season
    latest_season = Season.query.order_by(Season.year.desc()).first()
    if not latest_season or latest_season.season_id != season_id:
        return jsonify({'error': 'Only the latest season can be deleted.'}), 400

    # Delete all related data
    # TeamSeason
    TeamSeason.query.filter_by(season_id=season_id).delete()
    # Game
    Game.query.filter_by(season_id=season_id).delete()
    # PlayerSeason
    PlayerSeason.query.filter_by(season_id=season_id).delete()
    # AwardWinner
    AwardWinner.query.filter_by(season_id=season_id).delete()
    # Honor
    Honor.query.filter_by(season_id=season_id).delete()
    # Recruit (if exists)
    try:
        from routes.recruiting import Recruit
        Recruit.query.filter_by(season_id=season_id).delete()
    except Exception:
        pass
    # Transfer (if exists)
    try:
        from routes.transfer import Transfer
        Transfer.query.filter_by(season_id=season_id).delete()
    except Exception:
        pass
    # Finally, delete the season itself
    db.session.delete(season)
    db.session.commit()
    return jsonify({'message': f'Season {season.year} and all related data deleted.'}), 200
