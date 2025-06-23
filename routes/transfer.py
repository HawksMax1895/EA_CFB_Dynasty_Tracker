from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Player, Team, Season

transfer_bp = Blueprint('transfer', __name__)

@transfer_bp.route('/transfer-portal', methods=['POST'])
def add_transfer_portal():
    data = request.json
    team_id = data.get('team_id')
    season_id = data.get('season_id')
    transfers = data.get('transfers', [])
    if not team_id or not season_id or not isinstance(transfers, list):
        return jsonify({'error': 'team_id, season_id, and transfers list are required'}), 400
    created_players = []
    for transfer in transfers:
        name = transfer.get('name')
        position = transfer.get('position')
        previous_school = transfer.get('previous_school')
        ovr_rating = transfer.get('ovr_rating')
        if not name or not position:
            continue
        player = Player(
            name=name,
            position=position,
            team_id=team_id,
            current_year='TR',
            career_stats=f'Transferred from {previous_school}' if previous_school else None
        )
        db.session.add(player)
        db.session.flush()
        created_players.append(player.player_id)
    db.session.commit()
    return jsonify({'created_player_ids': created_players}), 201

@transfer_bp.route('/transfer-portal', methods=['GET'])
def get_transfer_portal():
    team_id = request.args.get('team_id', type=int)
    season_id = request.args.get('season_id', type=int)
    if not team_id or not season_id:
        return jsonify({'error': 'team_id and season_id are required'}), 400
    # Assume transfers are players with current_year 'TR' and matching team/season
    transfers = Player.query.filter_by(team_id=team_id, current_year='TR').all()
    return jsonify([
        {'player_id': t.player_id, 'name': t.name, 'position': t.position, 'career_stats': t.career_stats}
        for t in transfers
    ]) 