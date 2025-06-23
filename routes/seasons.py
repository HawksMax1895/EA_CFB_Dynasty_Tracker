from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Season, Conference, TeamSeason, Game, Team, Player
import datetime

seasons_bp = Blueprint('seasons', __name__)

@seasons_bp.route('/seasons', methods=['GET'])
def get_seasons():
    seasons = Season.query.all()
    return jsonify([{'season_id': s.season_id, 'year': s.year} for s in seasons])

@seasons_bp.route('/seasons', methods=['POST'])
def create_season():
    data = request.json or {}
    year = data.get('year')
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
    db.session.commit()
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
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    return jsonify([
        {
            'team_id': ts.team_id,
            'conference_id': ts.conference_id,
            'wins': ts.wins,
            'losses': ts.losses,
            'points_for': ts.points_for,
            'points_against': ts.points_against,
            'prestige': ts.prestige,
            'team_rating': ts.team_rating,
            'final_rank': ts.final_rank,
            'recruiting_rank': ts.recruiting_rank
        }
        for ts in team_seasons
    ])

@seasons_bp.route('/seasons/<int:season_id>/teams/<int:team_id>', methods=['PUT'])
def update_team_season(season_id, team_id):
    ts = TeamSeason.query.filter_by(season_id=season_id, team_id=team_id).first_or_404()
    data = request.json
    for field in ['wins', 'losses', 'points_for', 'points_against', 'offense_yards', 'defense_yards', 'prestige', 'team_rating', 'final_rank', 'recruiting_rank', 'conference_id']:
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
    # Group by conference
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    standings = {}
    for ts in team_seasons:
        conf = Conference.query.get(ts.conference_id)
        conf_name = conf.name if conf else str(ts.conference_id)
        if conf_name not in standings:
            standings[conf_name] = []
        standings[conf_name].append({
            'team_id': ts.team_id,
            'wins': ts.wins,
            'losses': ts.losses,
            'prestige': ts.prestige,
            'team_rating': ts.team_rating
        })
    return jsonify(standings)

@seasons_bp.route('/seasons/<int:season_id>/bracket', methods=['GET'])
def get_season_bracket(season_id):
    games = Game.query.filter_by(season_id=season_id, game_type='Playoff').all()
    bracket = {}
    for g in games:
        round_name = g.playoff_round or 'Unknown'
        if round_name not in bracket:
            bracket[round_name] = []
        bracket[round_name].append({
            'game_id': g.game_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'away_team_id': g.away_team_id,
            'home_score': g.home_score,
            'away_score': g.away_score
        })
    return jsonify(bracket)

@seasons_bp.route('/conferences/<int:conference_id>/teams', methods=['GET'])
def get_conference_teams(conference_id):
    season_id = request.args.get('season_id', type=int)
    if season_id:
        team_seasons = TeamSeason.query.filter_by(conference_id=conference_id, season_id=season_id).all()
        teams = [Team.query.get(ts.team_id) for ts in team_seasons]
    else:
        teams = Team.query.filter_by(primary_conference_id=conference_id).all()
    return jsonify([
        {'team_id': t.team_id, 'name': t.name, 'abbreviation': t.abbreviation}
        for t in teams if t is not None
    ])

@seasons_bp.route('/seasons/<int:season_id>/promotion_relegation', methods=['GET'])
def get_promotion_relegation(season_id):
    prev_season = Season.query.filter(Season.season_id < season_id).order_by(Season.season_id.desc()).first()
    if not prev_season:
        return jsonify({'message': 'No previous season to compare.'})
    current = TeamSeason.query.filter_by(season_id=season_id).all()
    previous = TeamSeason.query.filter_by(season_id=prev_season.season_id).all()
    prev_conf = {ts.team_id: ts.conference_id for ts in previous}
    changes = []
    for ts in current:
        prev_cid = prev_conf.get(ts.team_id)
        if prev_cid and prev_cid != ts.conference_id:
            changes.append({
                'team_id': ts.team_id,
                'from_conference': Conference.query.get(prev_cid).name if Conference.query.get(prev_cid) else prev_cid,
                'to_conference': Conference.query.get(ts.conference_id).name if Conference.query.get(ts.conference_id) else ts.conference_id
            })
    return jsonify(changes)

@seasons_bp.route('/seasons/<int:season_id>/progress_players', methods=['POST'])
def progress_players(season_id):
    PROGRESSION_MAP = {"FR": "SO", "SO": "JR", "JR": "SR", "SR": "GR", "GR": "GR"}
    players = Player.query.all()
    progressed = []
    redshirted = []
    for player in players:
        if player.redshirted:
            player.redshirted = False  # Remove redshirt for next year
            redshirted.append(player.player_id)
            continue
        if player.current_year in PROGRESSION_MAP:
            player.current_year = PROGRESSION_MAP[player.current_year]
            progressed.append(player.player_id)
    db.session.commit()
    return jsonify({"progressed_player_ids": progressed, "redshirted_player_ids": redshirted}), 200 