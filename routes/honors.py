from flask import Blueprint, request, jsonify, Response
from extensions import db
from models import Honor, Player, Team, Season, HonorWinner, Conference

honors_bp = Blueprint('honors', __name__)

@honors_bp.route('/honors/types', methods=['POST'])
def create_honor_type() -> Response:
    data = request.json
    name = data.get('name')
    side = data.get('side')
    conference_id = data.get('conference_id')
    
    if not name:
        return jsonify({'error': 'name is required'}), 400
    
    # Convert empty string to None for side
    if side == 'none' or side == '':
        side = None
    
    # Convert empty string to None for conference_id
    if conference_id == 'none' or conference_id == '':
        conference_id = None
    elif conference_id:
        conference_id = int(conference_id)
    
    honor = Honor(name=name, side=side, conference_id=conference_id)
    db.session.add(honor)
    db.session.commit()
    
    return jsonify({
        'honor_id': honor.honor_id,
        'name': honor.name,
        'side': honor.side,
        'conference_id': honor.conference_id
    }), 201

@honors_bp.route('/honors/types', methods=['GET'])
def get_honor_types() -> Response:
    honors = Honor.query.all()
    return jsonify([
        {
            'honor_id': h.honor_id,
            'name': h.name,
            'side': h.side,
            'conference_id': h.conference_id,
            'conference_name': Conference.query.get(h.conference_id).name if h.conference_id else None
        }
        for h in honors
    ])

@honors_bp.route('/honors/types/<int:honor_id>', methods=['PUT'])
def update_honor_type(honor_id: int) -> Response:
    honor = Honor.query.get_or_404(honor_id)
    data = request.json
    
    if 'name' in data:
        honor.name = data['name']
    if 'side' in data:
        honor.side = data['side'] if data['side'] != 'none' else None
    if 'conference_id' in data:
        honor.conference_id = int(data['conference_id']) if data['conference_id'] != 'none' else None
    
    db.session.commit()
    
    return jsonify({
        'honor_id': honor.honor_id,
        'name': honor.name,
        'side': honor.side,
        'conference_id': honor.conference_id
    })

@honors_bp.route('/honors/types/<int:honor_id>', methods=['DELETE'])
def delete_honor_type(honor_id: int) -> Response:
    honor = Honor.query.get_or_404(honor_id)
    db.session.delete(honor)
    db.session.commit()
    return jsonify({'message': 'Honor type deleted'})

@honors_bp.route('/honors/types/<int:honor_id>/requires-week', methods=['GET'])
def check_honor_requires_week(honor_id: int) -> Response:
    honor = Honor.query.get_or_404(honor_id)
    requires_week = "Player of the Week" in honor.name
    return jsonify({
        'honor_id': honor.honor_id,
        'name': honor.name,
        'requires_week': requires_week
    })

@honors_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/honors', methods=['POST'])
def add_honors(season_id: int, team_id: int) -> Response:
    data = request.json
    honors = data.get('honors', [])
    if not isinstance(honors, list):
        return jsonify({'error': 'honors must be a list'}), 400
    created = []
    for h in honors:
        player_id = h.get('player_id')
        honor_id = h.get('honor_id')
        week = h.get('week')
        if not player_id or not honor_id:
            continue
        
        # Get the honor type to check if week is required
        honor = Honor.query.get(honor_id)
        if not honor:
            continue
            
        # Check if this honor type requires a week (Player of the Week honors)
        requires_week = "Player of the Week" in honor.name
        
        if requires_week and (week is None or week == ''):
            return jsonify({'error': f'Week is required for {honor.name}'}), 400
        
        # For non-weekly honors, ensure week is None
        if not requires_week:
            week = None
            
        honor_winner = HonorWinner(
            player_id=player_id, 
            team_id=team_id, 
            season_id=season_id, 
            honor_id=honor_id,
            week=week
        )
        db.session.add(honor_winner)
        db.session.flush()
        created.append(honor_winner.honor_winner_id)
    db.session.commit()
    return jsonify({'created_honor_winner_ids': created}), 201

@honors_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/honors', methods=['GET'])
def get_honors(season_id: int, team_id: int) -> Response:
    honor_winners = HonorWinner.query.filter_by(season_id=season_id, team_id=team_id).all()
    return jsonify([
        {
            'honor_winner_id': hw.honor_winner_id, 
            'player_id': hw.player_id, 
            'honor_id': hw.honor_id,
            'week': hw.week,
            'honor_name': Honor.query.get(hw.honor_id).name if hw.honor_id else None
        }
        for hw in honor_winners
    ])

@honors_bp.route('/honors', methods=['GET'])
def get_all_honors() -> Response:
    honor_winners = HonorWinner.query.all()
    return jsonify([
        {
            'honor_winner_id': hw.honor_winner_id,
            'player_id': hw.player_id,
            'player_name': Player.query.get(hw.player_id).name if hw.player_id else None,
            'team_id': hw.team_id,
            'team_name': Team.query.get(hw.team_id).name if hw.team_id else None,
            'season_id': hw.season_id,
            'season_year': Season.query.get(hw.season_id).year if hw.season_id else None,
            'honor_id': hw.honor_id,
            'honor_name': Honor.query.get(hw.honor_id).name if hw.honor_id else None,
            'week': hw.week
        }
        for hw in honor_winners
    ])

@honors_bp.route('/seasons/<int:season_id>/honors', methods=['GET'])
def get_honors_by_season(season_id: int) -> Response:
    honor_winners = HonorWinner.query.filter_by(season_id=season_id).all()
    return jsonify([
        {
            'honor_winner_id': hw.honor_winner_id,
            'player_id': hw.player_id,
            'player_name': Player.query.get(hw.player_id).name if hw.player_id else None,
            'team_id': hw.team_id,
            'team_name': Team.query.get(hw.team_id).name if hw.team_id else None,
            'season_id': hw.season_id,
            'season_year': Season.query.get(hw.season_id).year if hw.season_id else None,
            'honor_id': hw.honor_id,
            'honor_name': Honor.query.get(hw.honor_id).name if hw.honor_id else None,
            'honor_side': Honor.query.get(hw.honor_id).side if hw.honor_id else None,
            'honor_conference_id': Honor.query.get(hw.honor_id).conference_id if hw.honor_id else None,
            'week': hw.week
        }
        for hw in honor_winners
    ]) 