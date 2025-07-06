from flask import Blueprint, request, jsonify, Response
from extensions import db
from models import Game, TeamSeason, Conference, Team
from routes import logger
from typing import Dict, List, Any, Optional, Union

games_bp = Blueprint('games', __name__)

@games_bp.route('/games/<int:season_id>', methods=['GET'])
def get_games_for_season(season_id: int) -> Response:
    """
    Retrieve all games for a specific season.
    
    Args:
        season_id (int): ID of the season to get games for
        
    Returns:
        Response: JSON array containing all games in the season ordered by week
        and game_id. Each game includes game_id, season_id, week, home_team_id,
        away_team_id, home_score, away_score, game_type, and playoff_round.
    """
    games = Game.query.filter_by(season_id=season_id).order_by(Game.week.asc(), Game.game_id.asc()).all()
    return jsonify([{
        'game_id': g.game_id,
        'season_id': g.season_id,
        'week': g.week,
        'home_team_id': g.home_team_id,
        'away_team_id': g.away_team_id,
        'home_score': g.home_score,
        'away_score': g.away_score,
        'game_type': g.game_type,
        'playoff_round': g.playoff_round
    } for g in games])

@games_bp.route('/games/<int:season_id>', methods=['POST'])
def create_game(season_id: int) -> Response:
    """
    Create a new game in a specific season.
    
    Args:
        season_id (int): ID of the season to create the game in
        
    Expected JSON payload:
        week (int): Week number (required)
        home_team_id (int): Home team ID (required)
        away_team_id (int): Away team ID (required)
        game_type (str, optional): Type of game (default: 'Regular Season')
        playoff_round (int, optional): Playoff round number
        
    Returns:
        Response: JSON object with created game information and 201 status code
        on success, or error message with 400 status code on validation failure.
        
    Raises:
        400: If required fields (week, home_team_id, away_team_id) are missing
    """
    data = request.json
    week = data.get('week')
    home_team_id = data.get('home_team_id')
    away_team_id = data.get('away_team_id')
    game_type = data.get('game_type', 'Regular Season')
    playoff_round = data.get('playoff_round')
    
    if not all([week, home_team_id, away_team_id]):
        return jsonify({'error': 'week, home_team_id, and away_team_id are required'}), 400
    
    game = Game(
        season_id=season_id,
        week=week,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        game_type=game_type,
        playoff_round=playoff_round
    )
    db.session.add(game)
    db.session.commit()
    
    return jsonify({
        'game_id': game.game_id,
        'season_id': game.season_id,
        'week': game.week,
        'home_team_id': game.home_team_id,
        'away_team_id': game.away_team_id,
        'game_type': game.game_type,
        'playoff_round': game.playoff_round
    }), 201

@games_bp.route('/games/<int:game_id>', methods=['PUT'])
def update_game(game_id: int) -> Response:
    """
    Update information for a specific game.
    
    Args:
        game_id (int): ID of the game to update
        
    Expected JSON payload (all fields optional):
        home_score (int): Home team score
        away_score (int): Away team score
        home_team_id (int): Home team ID
        away_team_id (int): Away team ID
        game_type (str): Type of game
        playoff_round (int): Playoff round number
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If game is not found
    """
    game = Game.query.get_or_404(game_id)
    data = request.json
    
    if 'home_score' in data:
        game.home_score = data['home_score']
    if 'away_score' in data:
        game.away_score = data['away_score']
    if 'home_team_id' in data:
        game.home_team_id = data['home_team_id']
    if 'away_team_id' in data:
        game.away_team_id = data['away_team_id']
    if 'game_type' in data:
        game.game_type = data['game_type']
    if 'playoff_round' in data:
        game.playoff_round = data['playoff_round']
    if 'overtime' in data:
        game.overtime = data['overtime']
    
    db.session.commit()
    return jsonify({'message': 'Game updated successfully'})

@games_bp.route('/games/<int:game_id>', methods=['DELETE'])
def delete_game(game_id: int) -> Response:
    """
    Delete a specific game from the system.
    
    Args:
        game_id (int): ID of the game to delete
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If game is not found
    """
    game = Game.query.get_or_404(game_id)
    db.session.delete(game)
    db.session.commit()
    return jsonify({'message': 'Game deleted successfully'})

@games_bp.route('/games/<int:season_id>/week/<int:week>', methods=['GET'])
def get_games_for_week(season_id: int, week: int) -> Response:
    """
    Retrieve all games for a specific week in a specific season.
    
    Args:
        season_id (int): ID of the season to get games for
        week (int): Week number to get games for
        
    Returns:
        Response: JSON array containing all games in the specified week including
        game_id, season_id, week, home_team_id, away_team_id, home_score,
        away_score, game_type, and playoff_round.
    """
    games = Game.query.filter_by(season_id=season_id, week=week).all()
    return jsonify([{
        'game_id': g.game_id,
        'season_id': g.season_id,
        'week': g.week,
        'home_team_id': g.home_team_id,
        'away_team_id': g.away_team_id,
        'home_score': g.home_score,
        'away_score': g.away_score,
        'game_type': g.game_type,
        'playoff_round': g.playoff_round
    } for g in games])

@games_bp.route('/seasons/<int:season_id>/games', methods=['GET'])
def get_games_in_season(season_id: int) -> Response:
    """
    Retrieve games for a specific season with enhanced information.
    
    Args:
        season_id (int): ID of the season to get games for
        
    Query Parameters:
        type (str, optional): Filter by game type - 'regular' for non-playoff games,
                             'playoff' for playoff games (default: 'regular')
                             
    Returns:
        Response: JSON array containing games with enhanced information including
        team names, conference game status, overtime information, and all basic
        game details. Games are ordered by week.
        
    Note:
        Includes team names and determines if each game is a conference game
        by comparing team conference assignments for the season.
    """
    game_type = request.args.get('type', 'regular')
    query = Game.query.filter_by(season_id=season_id)

    if game_type == 'regular':
        query = query.filter(Game.game_type != 'Playoff')
    elif game_type == 'playoff':
        query = query.filter_by(game_type='Playoff')

    games = query.order_by(Game.week.asc()).all()
    teams = {t.team_id: t for t in Team.query.all()}
    team_seasons = {
        ts.team_id: ts
        for ts in TeamSeason.query.filter_by(season_id=season_id).all()
    }

    result = []
    for g in games:
        home_ts = team_seasons.get(g.home_team_id)
        away_ts = team_seasons.get(g.away_team_id)
        is_conf_game = (
            home_ts is not None
            and away_ts is not None
            and home_ts.conference_id == away_ts.conference_id
        )
        result.append({
            'game_id': g.game_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'home_team_name': teams.get(g.home_team_id).name if teams.get(g.home_team_id) else None,
            'away_team_id': g.away_team_id,
            'away_team_name': teams.get(g.away_team_id).name if teams.get(g.away_team_id) else None,
            'home_score': g.home_score,
            'away_score': g.away_score,
            'game_type': g.game_type,
            'playoff_round': g.playoff_round,
            'overtime': g.overtime,
            'is_conference_game': is_conf_game,
        })

    return jsonify(result)

@games_bp.route('/games/<int:game_id>', methods=['GET'])
def get_game(game_id: int) -> Response:
    """
    Retrieve detailed information for a specific game.
    
    Args:
        game_id (int): ID of the game to retrieve
        
    Returns:
        Response: JSON object containing game information including game_id,
        season_id, week, home_team_id, away_team_id, home_score, away_score,
        game_type, playoff_round, and overtime status.
        
    Raises:
        404: If game is not found
    """
    game = Game.query.get_or_404(game_id)
    return jsonify({
        'game_id': game.game_id,
        'season_id': game.season_id,
        'week': game.week,
        'home_team_id': game.home_team_id,
        'away_team_id': game.away_team_id,
        'home_score': game.home_score,
        'away_score': game.away_score,
        'game_type': game.game_type,
        'playoff_round': game.playoff_round,
        'overtime': game.overtime
    })

@games_bp.route('/games/<int:game_id>/details', methods=['GET'])
def get_game_details(game_id: int) -> Response:
    """
    Retrieve detailed game information including placeholder for player statistics.
    
    Args:
        game_id (int): ID of the game to get details for
        
    Returns:
        Response: JSON object containing game information including game_id,
        season_id, week, home_team_id, away_team_id, home_score, away_score,
        game_type, playoff_round, and overtime status.
        
    Raises:
        404: If game is not found
        
    Note:
        Currently returns basic game information. Per-game player statistics
        are not yet modeled in the database schema.
    """
    game = Game.query.get_or_404(game_id)
    # Placeholder: per-game player stats not modeled, so just return game info
    return jsonify({
        'game_id': game.game_id,
        'season_id': game.season_id,
        'week': game.week,
        'home_team_id': game.home_team_id,
        'away_team_id': game.away_team_id,
        'home_score': game.home_score,
        'away_score': game.away_score,
        'game_type': game.game_type,
        'playoff_round': game.playoff_round,
        'overtime': game.overtime
    })

@games_bp.route('/games', methods=['GET'])
def get_all_games() -> Response:
    """
    Retrieve all games in the system.
    
    Returns:
        Response: JSON array containing all games with comprehensive information
        including game_id, season_id, week, home_team_id, away_team_id,
        home_score, away_score, game_type, playoff_round, neutral_site status,
        and overtime status.
    """
    games = Game.query.all()
    return jsonify([
        {
            'game_id': g.game_id,
            'season_id': g.season_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'away_team_id': g.away_team_id,
            'home_score': g.home_score,
            'away_score': g.away_score,
            'game_type': g.game_type,
            'playoff_round': g.playoff_round,
            'neutral_site': g.neutral_site,
            'overtime': g.overtime
        }
        for g in games
    ]) 