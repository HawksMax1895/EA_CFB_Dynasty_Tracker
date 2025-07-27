from flask import Blueprint, request, jsonify, Response
from marshmallow import ValidationError
from extensions import db
from models import Season, Conference, TeamSeason, Game, Team, PlayerSeason, AwardWinner, Honor, HonorWinner
from schemas import CreateSeasonSchema
from routes import logger
from typing import Dict, List, Any, Optional, Union
import datetime

seasons_bp = Blueprint('seasons', __name__)

@seasons_bp.route('/seasons', methods=['GET'])
def get_seasons() -> Response:
    """
    Retrieve all seasons in the system, ordered by year (descending).
    
    Returns:
        Response: JSON array containing all seasons with season_id and year,
        ordered from most recent to oldest.
    """
    seasons = Season.query.order_by(Season.year.desc()).all()
    return jsonify([{'season_id': s.season_id, 'year': s.year} for s in seasons])

@seasons_bp.route('/seasons', methods=['POST'])
def create_season() -> Response:
    """
    Create a new season in the system.
    
    Expected JSON payload:
        year (int): Year of the season to create (required)
        
    Returns:
        Response: JSON object with season_id, year, and success message
        on successful creation, or error message with appropriate status code.
        
    Raises:
        400: If year is invalid or season already exists
        422: If payload validation fails
        
    Note:
        Automatically progresses players from the previous season when a new
        season is created. Logs errors during player progression but continues
        execution even if progression fails.
    """
    # Load and validate the incoming JSON (may be empty)
    incoming_json = request.get_json(silent=True) or {}
    try:
        data = CreateSeasonSchema().load(incoming_json)
    except ValidationError as e:
        return jsonify({'error': e.messages}), 400

    # Determine the year: use provided value or auto-increment from latest season
    season_year = data.get('year')
    if season_year is None:
        last_season = Season.query.order_by(Season.year.desc()).first()
        if last_season is not None:
            season_year = last_season.year + 1
        else:
            # If no seasons exist yet, default to current calendar year
            season_year = datetime.datetime.now().year

    # Check if season already exists
    if Season.query.filter_by(year=season_year).first():
        return jsonify({'error': f'Season {season_year} already exists'}), 400

    # Create the new season
    new_season = Season(year=season_year)
    db.session.add(new_season)
    db.session.commit()
    
    # Debug: print all seasons after commit
    all_seasons = Season.query.order_by(Season.year).all()
    logger.debug(f'All seasons after commit: {[(s.season_id, s.year) for s in all_seasons]}')

    # --- NEW: Automatically create TeamSeason records and copy Top 25 from previous season ---
    teams = Team.query.all()
    prev_season = Season.query.filter(Season.season_id < new_season.season_id).order_by(Season.season_id.desc()).first()
    prev_team_seasons = {ts.team_id: ts for ts in TeamSeason.query.filter_by(season_id=prev_season.season_id).all()} if prev_season else {}
    for team in teams:
        ts = TeamSeason(team_id=team.team_id, season_id=new_season.season_id, conference_id=team.primary_conference_id)
        # Copy final_rank from previous season if present
        if team.team_id in prev_team_seasons and prev_team_seasons[team.team_id].final_rank:
            ts.final_rank = prev_team_seasons[team.team_id].final_rank
        db.session.add(ts)
    db.session.commit()

    # --- NEW: Generate bye-week schedule for user-controlled team only ---
    # Use a 17-week calendar (weeks 0-16)
    TOTAL_SEASON_WEEKS = 16
    user_team = next((team for team in teams if getattr(team, 'is_user_controlled', False)), None)
    bye_games = []
    if user_team:
        for week in range(TOTAL_SEASON_WEEKS + 1):
            bye_games.append(Game(
                season_id=new_season.season_id,
                week=week,
                home_team_id=user_team.team_id,
                away_team_id=None,
                game_type="Bye Week"
            ))
        db.session.add_all(bye_games)
        db.session.commit()
        print(f"Created bye-week schedule for user-controlled team {user_team.name}: {len(bye_games)} games across {TOTAL_SEASON_WEEKS + 1} weeks.")
    else:
        print("No user-controlled team found. No bye weeks created.")
    
    # --- NEW: Automatically progress players from the previous season ---
    prev_season = Season.query.filter(Season.season_id < new_season.season_id).order_by(Season.season_id.desc()).first()
    if prev_season:
        try:
            from routes.season_actions import progress_players_logic
            logger.info(f'Progressing players for prev_season.year={prev_season.year}, prev_season.season_id={prev_season.season_id}')
            progression_result = progress_players_logic(prev_season.season_id)
            logger.info(f"Player progression completed: {progression_result}")
        except (ImportError, AttributeError, ValueError, RuntimeError) as e:
            logger.error(f"Error during player progression: {e}")
            # Log error but continue execution
    
    return jsonify({
        'season_id': new_season.season_id,
        'year': new_season.year,
        'message': f'Season {new_season.year} created successfully'
    }), 201

@seasons_bp.route('/conferences', methods=['GET'])
def get_conferences() -> Response:
    """
    Retrieve all conferences in the system.
    
    Returns:
        Response: JSON array containing all conferences with conference_id and name.
    """
    conferences = Conference.query.all()
    return jsonify([{'conference_id': c.conference_id, 'name': c.name} for c in conferences])

@seasons_bp.route('/conferences', methods=['POST'])
def create_conference() -> Response:
    """
    Create a new conference in the system.
    
    Expected JSON payload:
        name (str): Name of the conference to create (required)
        
    Returns:
        Response: JSON object with conference_id and name on successful creation,
        or error message with 400 status code on validation failure.
        
    Raises:
        400: If conference name is not provided
    """
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Conference name is required'}), 400
    
    conference = Conference(name=name)
    db.session.add(conference)
    db.session.commit()
    return jsonify({'conference_id': conference.conference_id, 'name': conference.name}), 201

@seasons_bp.route('/seasons/<int:season_id>', methods=['GET'])
def get_season(season_id: int) -> Response:
    """
    Retrieve information for a specific season.
    
    Args:
        season_id (int): ID of the season to retrieve
        
    Returns:
        Response: JSON object containing season_id and year for the specified season.
        
    Raises:
        404: If season is not found
    """
    season = Season.query.get_or_404(season_id)
    return jsonify({'season_id': season.season_id, 'year': season.year})

# --- Helper for robust conference record calculation for user team ---
def calculate_user_team_conference_record(team_id: int, season_id: int) -> tuple[int, int]:
    """
    Calculate conference wins and losses for a specific team in a specific season.
    
    This helper function provides a robust calculation of conference record by
    analyzing actual game results rather than relying on stored values.
    
    Args:
        team_id (int): ID of the team to calculate conference record for
        season_id (int): ID of the season to calculate record for
        
    Returns:
        tuple[int, int]: Tuple of (conference_wins, conference_losses)
        
    Note:
        Only counts games where both teams are in the same conference and
        the game has been played (scores are not None and not both 0).
        Bye weeks are excluded from the calculation.
    """
    from models import Game, TeamSeason
    # Build a mapping: (season_id, team_id) -> conference_id
    team_conf_map = {(ts.season_id, ts.team_id): ts.conference_id for ts in TeamSeason.query.filter_by(season_id=season_id).all()}
    all_games = (
        Game.query.filter(
            ((Game.home_team_id == team_id) | (Game.away_team_id == team_id)) &
            (Game.season_id == season_id)
        ).order_by(Game.week.asc()).all()
    )
    conf_wins = 0
    conf_losses = 0
    for g in all_games:
        if getattr(g, 'game_type', None) == 'Bye Week':
            continue
        if g.home_score is None or g.away_score is None or (g.home_score == 0 and g.away_score == 0):
            continue
        home_conf = team_conf_map.get((g.season_id, g.home_team_id))
        away_conf = team_conf_map.get((g.season_id, g.away_team_id))
        if not home_conf or not away_conf:
            continue
        if home_conf != away_conf:
            continue  # Not a conference game
        is_home = g.home_team_id == team_id
        is_away = g.away_team_id == team_id
        if not (is_home or is_away):
            continue
        team_score = g.home_score if is_home else g.away_score
        opp_score = g.away_score if is_home else g.home_score
        if team_score > opp_score:
            conf_wins += 1
        elif team_score < opp_score:
            conf_losses += 1
    return conf_wins, conf_losses

@seasons_bp.route('/seasons/<int:season_id>/teams', methods=['GET'])
def get_teams_in_season(season_id: int) -> Response:
    """
    Retrieve all teams participating in a specific season.
    
    Args:
        season_id (int): ID of the season to get teams for
        
    Query Parameters:
        all (bool): If 'true', returns all teams. If 'false' or not provided,
                   returns only top 25 teams by final ranking.
                   
    Returns:
        Response: JSON array containing team information including team details,
        conference information, season statistics, and rankings. For user-controlled
        teams, conference record is calculated dynamically from game results.
        
    Note:
        When 'all' parameter is false, only teams ranked in the top 25 by
        final_rank are returned. User-controlled team conference records are
        calculated from actual game results for accuracy.
    """
    all_param = request.args.get('all', 'false').lower() == 'true'
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    teams = {t.team_id: t for t in Team.query.all()}
    conferences = {c.conference_id: c for c in Conference.query.all()}
    user_team_id = None
    for t in teams.values():
        if getattr(t, 'is_user_controlled', False):
            user_team_id = t.team_id
            break
    if all_param:
        # Return all teams for the season
        return jsonify([
            {
                'team_id': ts.team_id,
                'team_name': teams[ts.team_id].name if ts.team_id in teams else None,
                'is_user_controlled': teams[ts.team_id].is_user_controlled if ts.team_id in teams else None,
                'logo_url': teams[ts.team_id].logo_url if ts.team_id in teams else None,
                'primary_conference_id': teams[ts.team_id].primary_conference_id if ts.team_id in teams else None,
                'conference_id': ts.conference_id,
                'conference_name': conferences[ts.conference_id].name if ts.conference_id in conferences else None,
                'wins': ts.wins,
                'losses': ts.losses,
                'conference_wins': (calculate_user_team_conference_record(ts.team_id, season_id)[0] if ts.team_id == user_team_id else ts.conference_wins),
                'conference_losses': (calculate_user_team_conference_record(ts.team_id, season_id)[1] if ts.team_id == user_team_id else ts.conference_losses),
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
            'primary_conference_id': teams[ts.team_id].primary_conference_id if ts.team_id in teams else None,
            'conference_id': ts.conference_id,
            'conference_name': conferences[ts.conference_id].name if ts.conference_id in conferences else None,
            'wins': ts.wins,
            'losses': ts.losses,
            'conference_wins': (calculate_user_team_conference_record(ts.team_id, season_id)[0] if ts.team_id == user_team_id else ts.conference_wins),
            'conference_losses': (calculate_user_team_conference_record(ts.team_id, season_id)[1] if ts.team_id == user_team_id else ts.conference_losses),
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
            'team_rating': ts.team_rating,
            'final_rank': ts.final_rank,
            'recruiting_rank': ts.recruiting_rank,
            'national_rank': i + 1
        }
        for i, ts in enumerate(top_25)
    ])

@seasons_bp.route('/seasons/<int:season_id>/teams/<int:team_id>', methods=['PUT'])
def update_team_season(season_id: int, team_id: int) -> Response:
    """
    Update or create team season statistics for a specific team in a specific season.
    
    Args:
        season_id (int): ID of the season to update
        team_id (int): ID of the team to update
        
    Expected JSON payload (all fields optional):
        Various statistical fields including wins, losses, conference_wins,
        conference_losses, points_for, points_against, offensive/defensive stats,
        rankings, and team ratings.
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If team is not found
        
    Note:
        If no TeamSeason record exists for the team/season combination,
        one will be created automatically using the team's primary conference.
    """
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
        'off_ppg', 'def_ppg', 'sacks', 'interceptions', 'team_rating', 'final_rank',
        'recruiting_rank', 'conference_id',
        'offense_yards_rank', 'defense_yards_rank', 'pass_yards_rank', 'rush_yards_rank',
        'pass_tds_rank', 'rush_tds_rank', 'off_ppg_rank', 'def_ppg_rank', 'sacks_rank',
        'interceptions_rank', 'points_for_rank', 'points_against_rank',
        'manual_conference_position'
    ]:
        if field in data:
            setattr(ts, field, data[field])
    db.session.commit()
    return jsonify({'message': 'Team season updated'})

@seasons_bp.route('/seasons/<int:season_id>/leaders', methods=['GET'])
def get_season_leaders(season_id: int) -> Response:
    """
    Retrieve statistical leaders for a specific season.
    
    Args:
        season_id (int): ID of the season to get leaders for
        
    Returns:
        Response: JSON object containing top 5 players in each statistical category
        including Passing Yards, Rushing Yards, and Receiving Yards. Each category
        contains player_id, team_id, and value for each leader.
    """
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
def get_season_standings(season_id: int) -> Response:
    """
    Retrieve conference standings for a specific season.
    
    Args:
        season_id (int): ID of the season to get standings for
        
    Returns:
        Response: JSON object containing standings grouped by conference name.
        Each conference contains an array of teams with team_id, wins, losses,
        prestige, and team_rating.
        
    Note:
        Teams without a conference are grouped under their conference_id as a string.
    """
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
def get_conference_teams(conference_id: int) -> Response:
    """
    Retrieve all teams in a specific conference for a specific season.
    
    Args:
        conference_id (int): ID of the conference to get teams for
        
    Query Parameters:
        season_id (int, optional): Specific season to get team data for.
                                 If not provided, returns basic team information only.
                                 
    Returns:
        Response: JSON array containing team information including team details,
        season statistics, and conference standings. Teams are sorted by
        conference record when season_id is provided.
        
    Note:
        When season_id is provided, teams are sorted by conference record
        using the shared get_conference_standings helper function.
    """
    season_id = request.args.get('season_id', type=int)
    from models import Team, TeamSeason, Conference
    teams = Team.query.filter_by(primary_conference_id=conference_id).all()
    team_map = {t.team_id: t for t in teams}
    conference = Conference.query.get(conference_id)
    team_seasons = {ts.team_id: ts for ts in TeamSeason.query.filter_by(conference_id=conference_id, season_id=season_id).all()} if season_id else {}
    # Use shared helper for standings
    conf_team_entries_sorted = get_conference_standings(conference_id, season_id) if season_id else []
    result = []
    for entry in conf_team_entries_sorted:
        team = team_map.get(entry['team_id'])
        ts = team_seasons.get(entry['team_id'])
        result.append({
            'team_id': team.team_id,
            'team_name': team.name,
            'logo_url': team.logo_url,
            'abbreviation': team.abbreviation,
            'wins': ts.wins if ts else 0,
            'losses': ts.losses if ts else 0,
            'conference_wins': entry['conference_wins'],
            'conference_losses': entry['conference_losses'],
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
            'team_rating': ts.team_rating if ts else None,
            'final_rank': ts.final_rank if ts else None,
            'recruiting_rank': ts.recruiting_rank if ts else None,
            'conference_name': conference.name if conference else None
        })
    return jsonify(result)

@seasons_bp.route('/seasons/<int:season_id>/promotion_relegation', methods=['GET'])
def get_promotion_relegation(season_id: int) -> Response:
    """
    Retrieve conference changes (promotion/relegation) between the current season and previous season.
    
    Args:
        season_id (int): ID of the current season to compare against previous season
        
    Returns:
        Response: JSON array containing teams that changed conferences between seasons.
        Each entry includes team_id, from_conference, and to_conference.
        
    Note:
        Returns empty array if no previous season exists or no teams changed conferences.
        Conference names are prefetched to avoid repeated database lookups.
    """
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
def delete_season(season_id: int) -> Response:
    """
    Delete a specific season and all related data.
    
    Args:
        season_id (int): ID of the season to delete
        
    Returns:
        Response: JSON object with success message on completion,
        or error message with appropriate status code on failure.
        
    Raises:
        404: If season is not found
        400: If attempting to delete a season that is not the latest
        
    Note:
        Only the latest season can be deleted. This prevents accidental deletion
        of historical data. All related data including TeamSeason, Game, PlayerSeason,
        AwardWinner, Honor, Recruit, and Transfer records are also deleted.
        Errors during deletion of optional data (recruits, transfers) are logged
        but do not prevent the deletion from completing.
    """
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
    # Honor winners (season-specific)
    HonorWinner.query.filter_by(season_id=season_id).delete()
    # Recruit (if exists)
    try:
        from routes.recruiting import Recruit
        Recruit.query.filter_by(season_id=season_id).delete()
    except (ImportError, AttributeError, ValueError, RuntimeError) as e:
        # Log error but continue execution
        logger.error(f"Error deleting recruits: {e}")
    # Transfer (if exists)
    try:
        from routes.transfer import Transfer
        Transfer.query.filter_by(season_id=season_id).delete()
    except (ImportError, AttributeError, ValueError, RuntimeError) as e:
        # Log error but continue execution
        logger.error(f"Error deleting transfers: {e}")
    # Finally, delete the season itself
    db.session.delete(season)
    db.session.commit()
    return jsonify({'message': f'Season {season.year} and all related data deleted.'}), 200

@seasons_bp.route('/seasons/<int:season_id>/update_stats', methods=['POST'])
def update_season_stats(season_id: int) -> Response:
    """
    Update all TeamSeason stats for a season, including points, PPG, team rating, and final_rank from rankings API.
    Returns updated stats for all teams in the season.
    """
    from utils_teamseason_stats import update_teamseason_stats_for_season, fetch_top_25_ranks
    top_25_ranks = fetch_top_25_ranks(season_id)
    update_teamseason_stats_for_season(season_id, top_25_ranks=top_25_ranks)
    # Return updated team_season stats for frontend
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    result = []
    for ts in team_seasons:
        result.append({
            'team_id': ts.team_id,
            'season_id': ts.season_id,
            'points_for': ts.points_for,
            'points_against': ts.points_against,
            'off_ppg': ts.off_ppg,
            'def_ppg': ts.def_ppg,
            'team_rating': ts.team_rating,
            'final_rank': ts.final_rank
        })
    return jsonify(result)

# --- Shared helper for conference standings ---
def get_conference_standings(conference_id: int, season_id: int) -> list[dict[str, Any]]:
    """
    Calculate conference standings for a specific conference in a specific season.
    
    This shared helper function provides consistent conference standings calculation
    across multiple endpoints, with special handling for user-controlled teams.
    
    Args:
        conference_id (int): ID of the conference to calculate standings for
        season_id (int): ID of the season to calculate standings for
        
    Returns:
        list[dict[str, Any]]: List of team entries sorted by conference record.
        Each entry contains team_id, conference_wins, conference_losses, and
        manual_conference_position if set.
        
    Note:
        For user-controlled teams, conference record is calculated from actual
        game results for accuracy. For other teams, stored values are used.
        Teams can be sorted by manual position if set, otherwise by conference
        record (wins descending, losses ascending, team_id ascending).
    """
    from models import Team, TeamSeason, Game
    teams = Team.query.filter_by(primary_conference_id=conference_id).all()
    team_seasons = {ts.team_id: ts for ts in TeamSeason.query.filter_by(conference_id=conference_id, season_id=season_id).all()}
    # Build a mapping: (season_id, team_id) -> conference_id
    team_conf_map = {(ts.season_id, ts.team_id): ts.conference_id for ts in TeamSeason.query.filter_by(season_id=season_id).all()}
    all_games = Game.query.filter_by(season_id=season_id).all()
    conf_team_entries = []
    for team_entry in teams:
        ts = team_seasons.get(team_entry.team_id)
        manual_pos = ts.manual_conference_position if ts else None
        if team_entry.is_user_controlled:
            # Robust conference record calculation for user team only
            conf_wins = 0
            conf_losses = 0
            for g in all_games:
                if getattr(g, 'game_type', None) == 'Bye Week':
                    continue
                if g.home_score is None or g.away_score is None or (g.home_score == 0 and g.away_score == 0):
                    continue
                home_conf = team_conf_map.get((g.season_id, g.home_team_id))
                away_conf = team_conf_map.get((g.season_id, g.away_team_id))
                if not home_conf or not away_conf:
                    continue
                if home_conf != away_conf:
                    continue
                is_home = g.home_team_id == team_entry.team_id
                is_away = g.away_team_id == team_entry.team_id
                if not (is_home or is_away):
                    continue
                team_score = g.home_score if is_home else g.away_score
                opp_score = g.away_score if is_home else g.home_score
                if team_score > opp_score:
                    conf_wins += 1
                elif team_score < opp_score:
                    conf_losses += 1
        else:
            conf_wins = ts.conference_wins if ts else 0
            conf_losses = ts.conference_losses if ts else 0
        conf_team_entries.append({
            'team_id': team_entry.team_id,
            'conference_wins': conf_wins,
            'conference_losses': conf_losses,
            'manual_conference_position': manual_pos
        })
    # If any team has manual_conference_position set, sort by it (nulls last)
    if any(e['manual_conference_position'] is not None for e in conf_team_entries):
        conf_team_entries_sorted = sorted(
            conf_team_entries,
            key=lambda x: (x['manual_conference_position'] if x['manual_conference_position'] is not None else 9999)
        )
    else:
        # Sort by conference_wins DESC, conference_losses ASC, team_id ASC
        conf_team_entries_sorted = sorted(
            conf_team_entries,
            key=lambda x: (-x['conference_wins'], x['conference_losses'], x['team_id'])
        )
    return conf_team_entries_sorted

# --- END SHARED HELPER ---
