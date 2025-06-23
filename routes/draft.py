from flask import Blueprint, request, jsonify
from extensions import db
from models import Player

draft_bp = Blueprint('draft', __name__)

@draft_bp.route('/drafted-players', methods=['POST'])
def add_drafted_players():
    data = request.json
    season_id = data.get('season_id')
    drafted_players = data.get('drafted_players', [])
    if not season_id or not isinstance(drafted_players, list):
        return jsonify({'error': 'season_id and drafted_players list are required'}), 400
    updated_players = []
    for d in drafted_players:
        player_id = d.get('player_id')
        draft_round = d.get('draft_round')
        if not player_id or not draft_round:
            continue
        player = Player.query.get(player_id)
        if player:
            player.drafted_year = season_id
            # Optionally store draft_round in career_stats or another field
            db.session.add(player)
            updated_players.append(player_id)
    db.session.commit()
    return jsonify({'updated_player_ids': updated_players}), 201 