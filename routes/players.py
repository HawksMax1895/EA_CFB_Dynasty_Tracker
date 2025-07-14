from flask import Blueprint, request, jsonify, Response
from extensions import db
from models import Player, PlayerSeason, Team, Season, AwardWinner, HonorWinner, Award, Honor
from routes import logger
from typing import Dict, List, Any, Optional, Union

players_bp = Blueprint('players', __name__)

@players_bp.route('/players/<int:player_id>', methods=['GET'])
def get_player(player_id: int) -> Response:
    """
    Retrieve detailed information for a specific player.
    
    Args:
        player_id (int): ID of the player to retrieve
        
    Returns:
        Response: JSON object containing player information including player_id,
        name, position, team_id, class, dev_trait, height, weight, state,
        recruit_stars, awards, and ovr_rating from the most recent season.
        
    Raises:
        404: If player is not found
        
    Note:
        Current season information (class, dev_trait, height, weight, awards,
        ovr_rating) is retrieved from the most recent PlayerSeason record.
    """
    player = Player.query.get_or_404(player_id)
    # Get the most recent PlayerSeason to get current class and dynamic info
    current_season = Season.query.order_by(Season.year.desc()).first()
    current_ps = None
    if current_season:
        current_ps = PlayerSeason.query.filter_by(
            player_id=player.player_id, 
            season_id=current_season.season_id
        ).first()
    return jsonify({
        'player_id': player.player_id,
        'name': player.name,
        'position': player.position,
        'team_id': player.team_id,
        'class': current_ps.current_year if current_ps else None,
        'current_year': current_ps.current_year if current_ps else None,
        'dev_trait': current_ps.dev_trait if current_ps else None,
        'height': current_ps.height if current_ps else None,
        'weight': current_ps.weight if current_ps else None,
        'speed': current_ps.speed if current_ps else None,
        'state': player.state,
        'recruit_stars': player.recruit_stars,
        'awards': current_ps.awards if current_ps else None,
        'ovr_rating': current_ps.ovr_rating if current_ps else None
    })

@players_bp.route('/teams/<int:team_id>/players', methods=['POST'])
def add_player_to_team(team_id: int) -> Response:
    """
    Add a new player to a specific team.
    
    Args:
        team_id (int): ID of the team to add the player to
        
    Expected JSON payload:
        name (str): Player name (required)
        position (str): Player position (required)
        ovr_rating (int): Player overall rating (required)
        season_id (int): Season ID for the player season (required)
        current_year (str, optional): Player class year (default: 'FR')
        recruit_stars (int, optional): Recruit star rating (default: 3)
        speed (int, optional): Player speed rating (default: 70)
        dev_trait (str, optional): Development trait (default: 'Normal')
        height (str, optional): Player height (default: '')
        weight (int, optional): Player weight (default: 200)
        state (str, optional): Player state (default: '')
        
    Returns:
        Response: JSON object with player_id, name, and position on successful creation,
        or error message with 400 status code on validation failure.
        
    Raises:
        400: If required fields are missing
    """
    data = request.json
    name = data.get('name')
    position = data.get('position')
    ovr_rating = data.get('ovr_rating')
    season_id = data.get('season_id')
    current_year = data.get('current_year', 'FR')
    
    # Additional player stats
    recruit_stars = data.get('recruit_stars', 3)
    speed = data.get('speed', 70)
    dev_trait = data.get('dev_trait', 'Normal')
    height = data.get('height', '')
    weight = data.get('weight', 200)
    state = data.get('state', '')
    redshirt_used = data.get('redshirt_used', False)
    redshirted = data.get('redshirted', False)
    
    if not all([name, position, ovr_rating, season_id]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    player = Player(
        name=name,
        position=position,
        team_id=team_id,
        recruit_stars=recruit_stars,
        state=state,
        redshirt_used=redshirt_used or redshirted
    )
    db.session.add(player)
    db.session.commit()
    
    player_season = PlayerSeason(
        player_id=player.player_id,
        season_id=season_id,
        team_id=team_id,
        ovr_rating=ovr_rating,
        player_class=current_year,
        current_year=current_year,
        redshirted=redshirted,
        speed=speed,
        dev_trait=dev_trait,
        weight=weight,
        height=height
    )
    db.session.add(player_season)
    db.session.commit()
    return jsonify({'player_id': player.player_id, 'name': player.name, 'position': player.position}), 201

@players_bp.route('/players/<int:player_id>/seasons', methods=['POST'])
def add_or_update_player_season(player_id: int) -> Response:
    """
    Add or update a player's season record.
    
    Args:
        player_id (int): ID of the player to add/update season for
        
    Expected JSON payload:
        season_id (int): Season ID (required)
        team_id (int): Team ID (required)
        ovr_rating (int): Player overall rating (required)
        current_year (str, optional): Player class year (default: 'FR')
        
    Returns:
        Response: JSON object with player_season_id on successful creation/update,
        or error message with 400 status code on validation failure.
        
    Raises:
        400: If required fields are missing
        
    Note:
        If a PlayerSeason record already exists for the player/season/team combination,
        it will be updated. Otherwise, a new record will be created.
    """
    data = request.json
    season_id = data.get('season_id')
    team_id = data.get('team_id')
    ovr_rating = data.get('ovr_rating')
    current_year = data.get('current_year', 'FR')
    if not all([season_id, team_id, ovr_rating]):
        return jsonify({'error': 'Missing required fields'}), 400

    # Try to find an existing PlayerSeason
    player_season = PlayerSeason.query.filter_by(
        player_id=player_id,
        season_id=season_id,
        team_id=team_id
    ).first()

    if player_season:
        player_season.ovr_rating = ovr_rating
        player_season.player_class = current_year
        # update other fields if needed
    else:
        player_season = PlayerSeason(
            player_id=player_id,
            season_id=season_id,
            team_id=team_id,
            ovr_rating=ovr_rating,
            player_class=current_year,
            current_year=current_year,
            redshirted=False
        )
        db.session.add(player_season)

    db.session.commit()
    return jsonify({'player_season_id': player_season.player_season_id}), 201

@players_bp.route('/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id: int) -> Response:
    """
    Delete a specific player from the system.
    
    Args:
        player_id (int): ID of the player to delete
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If player is not found
        
    Note:
        This will also delete all related PlayerSeason, AwardWinner, and HonorWinner records.
    """
    from models import PlayerSeason, AwardWinner, HonorWinner
    
    player = Player.query.get_or_404(player_id)
    
    # Delete related records first
    PlayerSeason.query.filter_by(player_id=player_id).delete()
    AwardWinner.query.filter_by(player_id=player_id).delete()
    HonorWinner.query.filter_by(player_id=player_id).delete()
    
    # Now delete the player
    db.session.delete(player)
    db.session.commit()
    return jsonify({'message': 'Player deleted'})

@players_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/players', methods=['GET'])
def get_team_roster_for_season(season_id: int, team_id: int) -> Response:
    """
    Retrieve the complete roster for a specific team in a specific season.
    
    Args:
        season_id (int): ID of the season to get roster for
        team_id (int): ID of the team to get roster for
        
    Returns:
        Response: JSON array containing all players on the team's roster including
        player details, season statistics, redshirt status, and career redshirt
        information. Each player includes comprehensive stats and ratings.
        
    Note:
        Includes redshirt status for the current season and whether the player
        has ever redshirted in their career. All offensive and defensive
        statistics are included for each player.
    """
    # Join PlayerSeason with Player to fetch player info in a single query
    query = (
        db.session.query(PlayerSeason, Player)
        .join(Player, PlayerSeason.player_id == Player.player_id)
        .filter(PlayerSeason.season_id == season_id, PlayerSeason.team_id == team_id)
    )
    result = [
        {
            'player_id': ps.player_id,
            'name': player.name,
            'position': player.position,
            'current_year': ps.current_year,
            'dev_trait': ps.dev_trait,
            'height': ps.height,
            'weight': ps.weight,
            'state': player.state,
            'recruit_stars': player.recruit_stars,
            'redshirted': ps.redshirted,
            'has_ever_redshirted': player.redshirt_used or db.session.query(PlayerSeason.redshirted).filter(
                PlayerSeason.player_id == ps.player_id,
                PlayerSeason.redshirted == True
            ).count() > 0,
            'ovr_rating': ps.ovr_rating,
            'player_class': ps.player_class,
            'pass_yards': ps.pass_yards,
            'pass_tds': ps.pass_tds,
            'rush_yards': ps.rush_yards,
            'rush_tds': ps.rush_tds,
            'rec_yards': ps.rec_yards,
            'rec_tds': ps.rec_tds,
            'tackles': ps.tackles,
            'sacks': ps.sacks,
            'interceptions': ps.interceptions,
            'awards': ps.awards
        }
        for ps, player in query.all()
    ]
    return jsonify(result)

@players_bp.route('/players/<int:player_id>/career', methods=['GET'])
def get_player_career(player_id: int) -> Response:
    """
    Retrieve complete career statistics for a specific player.
    
    Args:
        player_id (int): ID of the player to get career stats for
        
    Returns:
        Response: JSON object containing comprehensive career statistics including
        season-by-season breakdown, career totals, career averages, career highs,
        and team information for each season.
        
    Note:
        Returns empty array if player has no career records. Statistics are
        aggregated across all seasons and include both totals and averages.
        Career highs are calculated for relevant statistical categories.
    """
    from models import PlayerSeason, Team, Season
    # Join PlayerSeason with Team and Season to get team names and season years
    season_team_query = (
        db.session.query(PlayerSeason, Team.name, Season.year)
        .join(Team, PlayerSeason.team_id == Team.team_id)
        .join(Season, PlayerSeason.season_id == Season.season_id)
        .filter(PlayerSeason.player_id == player_id)
        .order_by(PlayerSeason.season_id)
    )
    seasons = [ps for ps, _, _ in season_team_query]
    team_names = {ps.player_season_id: team_name for ps, team_name, _ in season_team_query}
    season_years = {ps.player_season_id: year for ps, _, year in season_team_query}
    if not seasons:
        return jsonify([])

    # Aggregate sums and maxes
    def sum_stat(attr: str) -> int:
        return sum(getattr(ps, attr) or 0 for ps in seasons)
    def max_stat(attr: str) -> int:
        return max((getattr(ps, attr) or 0) for ps in seasons)
    def safe_div(n: Optional[int], d: Optional[int]) -> float:
        if n is None or d is None or d == 0:
            return 0
        return n / d

    games_played = sum_stat('games_played')
    completions = sum_stat('completions')
    attempts = sum_stat('attempts')
    pass_yards = sum_stat('pass_yards')
    pass_tds = sum_stat('pass_tds')
    interceptions = sum_stat('interceptions')
    rush_attempts = sum_stat('rush_attempts')
    rush_yards = sum_stat('rush_yards')
    rush_tds = sum_stat('rush_tds')
    rush_fumbles = sum_stat('rush_fumbles')
    longest_rush = max_stat('longest_rush')
    receptions = sum_stat('receptions')
    rec_yards = sum_stat('rec_yards')
    rec_tds = sum_stat('rec_tds')
    rec_drops = sum_stat('rec_drops')
    longest_rec = max_stat('longest_rec')
    tackles = sum_stat('tackles')
    tfl = sum_stat('tfl')
    sacks = sum_stat('sacks')
    forced_fumbles = sum_stat('forced_fumbles')
    def_tds = sum_stat('def_tds')

    # Calculate averages
    pass_comp_pct = safe_div(completions, attempts) * 100 if attempts > 0 else 0
    pass_ypa = safe_div(pass_yards, attempts) if attempts > 0 else 0
    rush_ypc = safe_div(rush_yards, rush_attempts) if rush_attempts > 0 else 0
    rec_ypc = safe_div(rec_yards, receptions) if receptions > 0 else 0
    
    career_stats = {
        'games_played': games_played,
        'passing': {
            'completions': completions,
            'attempts': attempts,
            'completion_pct': round(pass_comp_pct, 1),
            'yards': pass_yards,
            'yards_per_attempt': round(pass_ypa, 1),
            'touchdowns': pass_tds,
            'interceptions': interceptions
        },
        'rushing': {
            'attempts': rush_attempts,
            'yards': rush_yards,
            'yards_per_carry': round(rush_ypc, 1),
            'touchdowns': rush_tds,
            'longest': longest_rush,
            'fumbles': rush_fumbles
        },
        'receiving': {
            'receptions': receptions,
            'yards': rec_yards,
            'yards_per_catch': round(rec_ypc, 1),
            'touchdowns': rec_tds,
            'longest': longest_rec,
            'drops': rec_drops
        },
        'defense': {
            'tackles': tackles,
            'tfl': tfl,
            'sacks': sacks,
            'forced_fumbles': forced_fumbles,
            'defensive_touchdowns': def_tds
        },
        'seasons': [
            {
                'season_id': ps.season_id,
                'year': season_years.get(ps.player_season_id),
                'team_name': team_names.get(ps.player_season_id),
                'team_id': ps.team_id,
                'games_played': ps.games_played or 0,
                'ovr_rating': ps.ovr_rating,
                'current_year': ps.current_year,
                'redshirted': ps.redshirted,
                # Add all stat fields for frontend table rendering
                'completions': ps.completions,
                'attempts': ps.attempts,
                'completion_pct': (round(safe_div(ps.completions, ps.attempts) * 100, 1) if ps.attempts else 0),
                'pass_yards': ps.pass_yards,
                'pass_tds': ps.pass_tds,
                'interceptions': ps.interceptions,
                'rush_attempts': ps.rush_attempts,
                'rush_yards': ps.rush_yards,
                'rush_tds': ps.rush_tds,
                'receptions': ps.receptions,
                'rec_yards': ps.rec_yards,
                'rec_tds': ps.rec_tds,
                'tackles': ps.tackles,
                'tfl': ps.tfl,
                'sacks': ps.sacks,
                'forced_fumbles': ps.forced_fumbles,
                'def_tds': ps.def_tds,
            }
            for ps in seasons
        ]
    }
    
    return jsonify(career_stats)

@players_bp.route('/players/<int:player_id>/redshirt', methods=['POST'])
def set_redshirt(player_id: int) -> Response:
    """
    Set redshirt status for a player in a specific season.
    
    Args:
        player_id (int): ID of the player to set redshirt status for
        
    Expected JSON payload:
        redshirted (bool, optional): Whether player is redshirted (default: False)
        season_id (int): Season ID to set redshirt status for (required)
        
    Returns:
        Response: JSON object with player_id and redshirted status on completion,
        or error message with appropriate status code on failure.
        
    Raises:
        400: If season_id is not provided
        404: If PlayerSeason record is not found
    """
    data = request.json
    redshirted = data.get('redshirted', False)
    season_id = data.get('season_id')
    
    if not season_id:
        return jsonify({'error': 'season_id is required'}), 400
    
    ps = PlayerSeason.query.filter_by(
        player_id=player_id, 
        season_id=season_id
    ).first()
    
    if not ps:
        return jsonify({'error': 'PlayerSeason not found'}), 404

    ps.redshirted = redshirted
    player = Player.query.get(player_id)
    if redshirted:
        player.redshirt_used = True
    else:
        other_rs = db.session.query(PlayerSeason).filter(
            PlayerSeason.player_id == player_id,
            PlayerSeason.redshirted == True,
            PlayerSeason.season_id != season_id
        ).count() > 0
        player.redshirt_used = other_rs

    db.session.commit()
    return jsonify({'player_id': player_id, 'redshirted': ps.redshirted})

@players_bp.route('/players', methods=['GET'])
def get_all_players() -> Response:
    """
    Retrieve all players for the current season on a specific team.
    
    Query Parameters:
        team_id (int, optional): Team ID to get players for (default: 1)
        
    Returns:
        Response: JSON array containing all players on the specified team's
        current roster including player details, statistics, redshirt status,
        and ratings.
        
    Note:
        Only returns players who have PlayerSeason records for the current season.
        Redshirt status includes both current season redshirt and whether the
        player has ever redshirted in previous seasons. Returns empty array
        if no current season exists.
    """
    # Get the current season (you might want to make this configurable)
    current_season = Season.query.order_by(Season.year.desc()).first()
    logger.debug(f"Current season: {current_season}")
    if not current_season:
        logger.debug("No current season found.")
        return jsonify([])
    
    # Get team_id from query params (default to team 1 for now)
    team_id = request.args.get('team_id', type=int, default=1)
    logger.debug(f"team_id: {team_id}")
    
    # Only return players who are on the current roster (have PlayerSeason records)
    query = (
        db.session.query(Player, PlayerSeason)
        .join(PlayerSeason, Player.player_id == PlayerSeason.player_id)
        .filter(
            PlayerSeason.season_id == current_season.season_id,
            PlayerSeason.team_id == team_id
        )
    )
    logger.debug(f"Query SQL: {str(query.statement.compile(compile_kwargs={'literal_binds': True}))}")
    results = query.all()
    logger.debug(f"Number of players found: {len(results)}")

    # Determine if each player previously redshirted before the current season
    prior_rs_lookup = {
        p.player_id: (
            PlayerSeason.query.filter(
                PlayerSeason.player_id == p.player_id,
                PlayerSeason.redshirted == True,
                PlayerSeason.season_id < current_season.season_id,
            ).count()
            > 0
        )
        for p, _ in results
    }
    
    return jsonify([
        {
            'player_id': p.player_id,
            'name': p.name,
            'position': p.position,
            'team_id': p.team_id,
            'class': ps.current_year,
            'ovr_rating': ps.ovr_rating,
            'redshirted': ps.redshirted and prior_rs_lookup.get(p.player_id, False),
            'recruit_stars': p.recruit_stars,
            'dev_trait': ps.dev_trait,
            'height': ps.height,
            'weight': ps.weight,
            'state': p.state,
            'pass_yards': ps.pass_yards,
            'pass_tds': ps.pass_tds,
            'rush_yards': ps.rush_yards,
            'rush_tds': ps.rush_tds,
            'rec_yards': ps.rec_yards,
            'rec_tds': ps.rec_tds,
            'tackles': ps.tackles,
            'sacks': ps.sacks,
            'interceptions': ps.interceptions,
            'awards': ps.awards
        }
        for p, ps in results
    ])

@players_bp.route('/players/<int:player_id>/seasons/<int:season_id>/stats', methods=['PUT'])
def update_player_season_stats(player_id: int, season_id: int) -> Response:
    """
    Update statistical data for a player in a specific season.
    
    Args:
        player_id (int): ID of the player to update stats for
        season_id (int): ID of the season to update stats for
        
    Expected JSON payload (all fields optional):
        Various statistical fields including ovr_rating, games_played,
        passing stats (completions, attempts, pass_yards, pass_tds, interceptions),
        rushing stats (rush_attempts, rush_yards, rush_tds, longest_rush, rush_fumbles),
        receiving stats (receptions, rec_yards, rec_tds, longest_rec, rec_drops),
        defensive stats (tackles, tfl, sacks, forced_fumbles, def_tds), and awards.
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If PlayerSeason record is not found
    """
    data = request.json
    player_season = PlayerSeason.query.filter_by(
        player_id=player_id,
        season_id=season_id
    ).first()
    
    if not player_season:
        return jsonify({'error': 'PlayerSeason not found'}), 404
    
    # Update all the stats that can be modified
    stat_fields = [
        'ovr_rating', 'games_played', 'completions', 'attempts', 'pass_yards', 
        'pass_tds', 'interceptions', 'rush_attempts', 'rush_yards', 'rush_tds',
        'longest_rush', 'rush_fumbles', 'receptions', 'rec_yards', 'rec_tds',
        'longest_rec', 'rec_drops', 'tackles', 'tfl', 'sacks', 'forced_fumbles',
        'def_tds', 'awards'
    ]
    
    for field in stat_fields:
        if field in data:
            setattr(player_season, field, data[field])
    
    db.session.commit()
    return jsonify({'message': 'Player season stats updated'})

@players_bp.route('/players/<int:player_id>/profile', methods=['PATCH'])
def update_player_profile(player_id: int) -> Response:
    """
    Update profile information for a player in the current season.
    
    Args:
        player_id (int): ID of the player to update profile for
        
    Expected JSON payload (all fields optional):
        height (str): Player height
        weight (int): Player weight
        dev_trait (str): Development trait
        
    Returns:
        Response: JSON object with success message on completion,
        or error message with appropriate status code on failure.
        
    Raises:
        404: If no current season exists or PlayerSeason record is not found
        400: If no valid fields are provided to update
    """
    data = request.json
    # Find the most recent season for this player
    current_season = Season.query.order_by(Season.year.desc()).first()
    if not current_season:
        return jsonify({'error': 'No current season found'}), 404
    ps = PlayerSeason.query.filter_by(player_id=player_id, season_id=current_season.season_id).first()
    if not ps:
        return jsonify({'error': 'PlayerSeason not found for current season'}), 404
    updated = False
    for field in ['height', 'weight', 'dev_trait']:
        if field in data:
            setattr(ps, field, data[field])
            updated = True
    if updated:
        db.session.commit()
        return jsonify({'message': 'Player profile updated'})
    else:
        return jsonify({'error': 'No valid fields to update'}), 400

@players_bp.route('/seasons/<int:season_id>/players', methods=['GET'])
def get_all_players_for_season(season_id: int) -> Response:
    """
    Retrieve all players participating in a specific season.
    
    Args:
        season_id (int): ID of the season to get players for
        
    Returns:
        Response: JSON array containing all players in the season including
        player_id, name, position, team_id, and team_name for each player.
        
    Note:
        Only returns players who have PlayerSeason records for the specified season.
    """
    # Join PlayerSeason, Player, and Team to get all players for the season with team info
    query = (
        db.session.query(Player.player_id, Player.name, Player.position, Team.team_id, Team.name.label('team_name'))
        .join(PlayerSeason, Player.player_id == PlayerSeason.player_id)
        .join(Team, PlayerSeason.team_id == Team.team_id)
        .filter(PlayerSeason.season_id == season_id)
    )
    players = [
        {
            'player_id': player_id,
            'name': name,
            'position': position,
            'team_id': team_id,
            'team_name': team_name
        }
        for player_id, name, position, team_id, team_name in query.all()
    ]
    return jsonify(players)

@players_bp.route('/players/<int:player_id>/awards', methods=['GET'])
def get_player_awards(player_id: int) -> Response:
    """
    Retrieve all awards won by a specific player.
    
    Args:
        player_id (int): ID of the player to get awards for
        
    Returns:
        Response: JSON array containing all awards won by the player including
        award_winner_id, award_name, award_description, team_name, season_year,
        and season_id for each award.
    """
    award_winners = AwardWinner.query.filter_by(player_id=player_id).all()
    
    result = []
    for aw in award_winners:
        award = Award.query.get(aw.award_id)
        team = Team.query.get(aw.team_id)
        season = Season.query.get(aw.season_id)
        
        result.append({
            'award_winner_id': aw.award_winner_id,
            'award_name': award.name if award else None,
            'award_description': award.description if award else None,
            'team_name': team.name if team else None,
            'season_year': season.year if season else None,
            'season_id': aw.season_id
        })
    
    return jsonify(result)

@players_bp.route('/players/<int:player_id>/honors', methods=['GET'])
def get_player_honors(player_id: int) -> Response:
    """
    Retrieve all honors won by a specific player.
    
    Args:
        player_id (int): ID of the player to get honors for
        
    Returns:
        Response: JSON array containing all honors won by the player including
        honor_winner_id, honor_name, honor_side, team_name, season_year,
        season_id, and week for each honor.
    """
    honor_winners = HonorWinner.query.filter_by(player_id=player_id).all()
    
    result = []
    for hw in honor_winners:
        honor = Honor.query.get(hw.honor_id)
        team = Team.query.get(hw.team_id)
        season = Season.query.get(hw.season_id)
        
        result.append({
            'honor_winner_id': hw.honor_winner_id,
            'honor_name': honor.name if honor else None,
            'honor_side': honor.side if honor else None,
            'team_name': team.name if team else None,
            'season_year': season.year if season else None,
            'season_id': hw.season_id,
            'week': hw.week
        })
    
    return jsonify(result)

@players_bp.route('/players/<int:player_id>/rating-development', methods=['GET'])
def get_player_rating_development(player_id: int) -> Response:
    """
    Retrieve rating development data for a specific player across all seasons.
    
    Args:
        player_id (int): ID of the player to get rating development for
        
    Returns:
        Response: JSON object containing player name and chart data with
        season-by-season rating progression including season_year, ovr_rating,
        current_year, redshirted status, and team_name for each season.
        
    Raises:
        404: If player is not found
        
    Note:
        Data is ordered by season year (ascending) for proper chart visualization.
        Includes redshirt status and team information for context.
    """
    player = Player.query.get_or_404(player_id)
    
    # Get all player seasons for this player, ordered by year
    player_seasons = db.session.query(
        PlayerSeason.player_season_id,
        PlayerSeason.ovr_rating,
        PlayerSeason.current_year,
        PlayerSeason.redshirted,
        Season.year.label('season_year'),
        Team.name.label('team_name')
    ).join(
        Season, PlayerSeason.season_id == Season.season_id
    ).join(
        Team, PlayerSeason.team_id == Team.team_id
    ).filter(
        PlayerSeason.player_id == player_id
    ).order_by(
        Season.year.asc()
    ).all()
    
    # Prepare data for the chart
    chart_data = []
    for ps in player_seasons:
        chart_data.append({
            "season_year": ps.season_year,
            "ovr_rating": ps.ovr_rating,
            "current_year": ps.current_year,
            "redshirted": ps.redshirted,
            "team_name": ps.team_name
        })
    
    return jsonify({
        "player_name": player.name,
        "chart_data": chart_data
    }) 

@players_bp.route('/players/<int:player_id>/leave', methods=['POST'])
def set_player_leaving(player_id: int):
    """
    Mark a player as leaving (will leave team after this season).
    """
    player = Player.query.get_or_404(player_id)
    player.leaving = True
    from extensions import db
    db.session.commit()
    return jsonify({'message': f'Player {player_id} marked as leaving.'})

@players_bp.route('/players/<int:player_id>/leave', methods=['DELETE'])
def cancel_player_leaving(player_id: int):
    """
    Cancel a player's 'leaving after season' status.
    """
    player = Player.query.get_or_404(player_id)
    player.leaving = False
    from extensions import db
    db.session.commit()
    return jsonify({'message': f'Player {player_id} leaving status cancelled.'})

@players_bp.route('/players/<int:player_id>/comprehensive', methods=['PUT'])
def update_player_comprehensive(player_id: int) -> Response:
    """
    Update comprehensive player information including both Player and PlayerSeason data.
    
    Args:
        player_id (int): ID of the player to update
        
    Expected JSON payload (all fields optional):
        # Player table fields
        name (str): Player name
        position (str): Player position
        recruit_stars (int): Recruit star rating
        recruit_rank_nat (int): National ranking
        state (str): State abbreviation
        
        # PlayerSeason table fields (for current season)
        ovr_rating (int): Overall rating
        current_year (str): Class year (FR, SO, JR, SR)
        redshirted (bool): Whether player is redshirted
        speed (int): Speed rating
        dev_trait (str): Development trait
        height (str): Height (e.g., 6'2")
        weight (int): Weight in pounds
        
    Returns:
        Response: JSON object with success message on completion,
        or error message with appropriate status code on failure.
        
    Raises:
        404: If player is not found or no current season exists
        400: If no valid fields are provided to update
    """
    player = Player.query.get_or_404(player_id)
    data = request.json
    
    # Find the most recent season for this player
    current_season = Season.query.order_by(Season.year.desc()).first()
    if not current_season:
        return jsonify({'error': 'No current season found'}), 404
    
    ps = PlayerSeason.query.filter_by(player_id=player_id, season_id=current_season.season_id).first()
    if not ps:
        return jsonify({'error': 'PlayerSeason not found for current season'}), 404
    
    updated = False
    
    # Update Player table fields
    player_fields = ['name', 'position', 'recruit_stars', 'recruit_rank_nat', 'state']
    for field in player_fields:
        if field in data:
            setattr(player, field, data[field])
            updated = True
    
    # Update PlayerSeason table fields
    season_fields = [
        'ovr_rating', 'current_year', 'redshirted', 'speed', 'dev_trait', 
        'height', 'weight'
    ]
    for field in season_fields:
        if field in data:
            setattr(ps, field, data[field])
            updated = True
    
    if updated:
        db.session.commit()
        return jsonify({'message': 'Player updated successfully'})
    else:
        return jsonify({'error': 'No valid fields to update'}), 400 