from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Game

games_bp = Blueprint('games', __name__)

@games_bp.route('/seasons/<int:season_id>/games', methods=['GET'])
def get_games_in_season(season_id):
    games = Game.query.filter_by(season_id=season_id).all()
    return jsonify([
        {'game_id': g.game_id, 'week': g.week, 'home_team_id': g.home_team_id, 'away_team_id': g.away_team_id, 'home_score': g.home_score, 'away_score': g.away_score, 'game_type': g.game_type, 'playoff_round': g.playoff_round}
        for g in games
    ])

@games_bp.route('/games/<int:game_id>', methods=['GET'])
def get_game(game_id):
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
        'playoff_round': game.playoff_round
    })

@games_bp.route('/games', methods=['POST'])
def create_game():
    data = request.json
    season_id = data.get('season_id')
    week = data.get('week')
    home_team_id = data.get('home_team_id')
    away_team_id = data.get('away_team_id')
    if not all([season_id, week, home_team_id, away_team_id]):
        return jsonify({'error': 'Missing required fields'}), 400
    game = Game(season_id=season_id, week=week, home_team_id=home_team_id, away_team_id=away_team_id)
    db.session.add(game)
    db.session.commit()
    return jsonify({'game_id': game.game_id}), 201

@games_bp.route('/games/<int:game_id>', methods=['PUT'])
def update_game(game_id):
    game = Game.query.get_or_404(game_id)
    data = request.json
    game.home_score = data.get('home_score', game.home_score)
    game.away_score = data.get('away_score', game.away_score)
    game.game_type = data.get('game_type', game.game_type)
    game.playoff_round = data.get('playoff_round', game.playoff_round)
    db.session.commit()
    return jsonify({'game_id': game.game_id})

@games_bp.route('/games/<int:game_id>/details', methods=['GET'])
def get_game_details(game_id):
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
        'playoff_round': game.playoff_round
    })

@games_bp.route('/games', methods=['GET'])
def get_all_games():
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
            'neutral_site': g.neutral_site
        }
        for g in games
    ]) 