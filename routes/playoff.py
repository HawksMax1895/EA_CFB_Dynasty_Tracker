from flask import Blueprint, request, jsonify
from extensions import db
from models import Game

playoff_bp = Blueprint('playoff', __name__)

@playoff_bp.route('/seasons/<int:season_id>/bracket', methods=['POST'])
def create_or_update_bracket(season_id):
    data = request.json
    games = data.get('games', [])
    if not isinstance(games, list):
        return jsonify({'error': 'games must be a list'}), 400
    created_games = []
    for g in games:
        home_team_id = g.get('home_team_id')
        away_team_id = g.get('away_team_id')
        week = g.get('week')
        playoff_round = g.get('playoff_round')
        if not home_team_id or not away_team_id or not week or not playoff_round:
            continue
        game = Game(
            season_id=season_id,
            week=week,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            game_type='Playoff',
            playoff_round=playoff_round
        )
        db.session.add(game)
        db.session.flush()
        created_games.append(game.game_id)
    db.session.commit()
    return jsonify({'created_game_ids': created_games}), 201

@playoff_bp.route('/seasons/<int:season_id>/playoff-result', methods=['POST'])
def add_playoff_result(season_id):
    data = request.json
    game_id = data.get('game_id')
    home_score = data.get('home_score')
    away_score = data.get('away_score')
    playoff_round = data.get('playoff_round')
    if not game_id or home_score is None or away_score is None:
        return jsonify({'error': 'game_id, home_score, and away_score are required'}), 400
    from models import Game
    game = Game.query.get(game_id)
    if not game or game.season_id != season_id:
        return jsonify({'error': 'Game not found for this season'}), 404
    game.home_score = home_score
    game.away_score = away_score
    if playoff_round:
        game.playoff_round = playoff_round
    db.session.commit()
    return jsonify({'message': 'Playoff result updated', 'game_id': game_id}), 200 