from flask import Blueprint, request, jsonify
from extensions import db
from models import Honor, Player, Team, Season

honors_bp = Blueprint('honors', __name__)

@honors_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/honors', methods=['POST'])
def add_honors(season_id, team_id):
    data = request.json
    honors = data.get('honors', [])
    if not isinstance(honors, list):
        return jsonify({'error': 'honors must be a list'}), 400
    created = []
    for h in honors:
        player_id = h.get('player_id')
        honor_type = h.get('honor_type')
        if not player_id or not honor_type:
            continue
        honor = Honor(player_id=player_id, team_id=team_id, season_id=season_id, honor_type=honor_type)
        db.session.add(honor)
        db.session.flush()
        created.append(honor.honor_id)
    db.session.commit()
    return jsonify({'created_honor_ids': created}), 201

@honors_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/honors', methods=['GET'])
def get_honors(season_id, team_id):
    honors = Honor.query.filter_by(season_id=season_id, team_id=team_id).all()
    return jsonify([
        {'honor_id': h.honor_id, 'player_id': h.player_id, 'honor_type': h.honor_type}
        for h in honors
    ])

@honors_bp.route('/honors', methods=['GET'])
def get_all_honors():
    honors = Honor.query.all()
    return jsonify([
        {
            'honor_id': h.honor_id,
            'player_id': h.player_id,
            'player_name': Player.query.get(h.player_id).name if h.player_id else None,
            'team_id': h.team_id,
            'team_name': Team.query.get(h.team_id).name if h.team_id else None,
            'season_id': h.season_id,
            'season_year': Season.query.get(h.season_id).year if h.season_id else None,
            'honor_type': h.honor_type
        }
        for h in honors
    ]) 