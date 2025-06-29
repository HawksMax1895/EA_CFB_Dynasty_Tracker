from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Player, Team, Season

transfer_bp = Blueprint('transfer', __name__)

# Create a simple Transfer model for storing committed transfers
class Transfer(db.Model):
    __tablename__ = 'transfers'
    transfer_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    position = db.Column(db.String(8), nullable=False)
    previous_school = db.Column(db.String(64))
    ovr_rating = db.Column(db.Integer)
    recruit_stars = db.Column(db.Integer)  # NEW: star rating
    recruit_rank_pos = db.Column(db.Integer)  # NEW: positional rank
    dev_trait = db.Column(db.String(16))
    height = db.Column(db.String(8))
    weight = db.Column(db.Integer)
    state = db.Column(db.String(2))
    current_status = db.Column(db.String(8))
    team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'))
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.season_id'))
    committed = db.Column(db.Boolean, default=True)

@transfer_bp.route('/transfer-portal', methods=['POST'])
def add_transfer_portal():
    data = request.json
    team_id = data.get('team_id')
    season_id = data.get('season_id')
    transfers = data.get('transfers', [])
    if not team_id or not season_id or not isinstance(transfers, list):
        return jsonify({'error': 'team_id, season_id, and transfers list are required'}), 400
    created_transfers = []
    for transfer in transfers:
        name = transfer.get('name')
        position = transfer.get('position')
        previous_school = transfer.get('previous_school')
        ovr_rating = transfer.get('ovr_rating')
        recruit_stars = transfer.get('recruit_stars')  # NEW
        recruit_rank_pos = transfer.get('recruit_rank_pos')  # NEW
        dev_trait = transfer.get('dev_trait')
        height = transfer.get('height')
        weight = transfer.get('weight')
        state = transfer.get('state')
        current_status = transfer.get('current_status', 'SO')
        if not name or not position:
            continue
        transfer_obj = Transfer(
            name=name,
            position=position,
            previous_school=previous_school,
            ovr_rating=ovr_rating,
            recruit_stars=recruit_stars,  # NEW
            recruit_rank_pos=recruit_rank_pos,
            dev_trait=dev_trait,
            height=height,
            weight=weight,
            state=state,
            current_status=current_status,
            team_id=team_id,
            season_id=season_id,
            committed=True
        )
        db.session.add(transfer_obj)
        created_transfers.append(transfer_obj.transfer_id)
    db.session.commit()
    return jsonify({'created_transfer_ids': created_transfers}), 201

@transfer_bp.route('/transfer-portal', methods=['GET'])
def get_transfer_portal():
    team_id = request.args.get('team_id', type=int)
    season_id = request.args.get('season_id', type=int)
    if not team_id or not season_id:
        return jsonify({'error': 'team_id and season_id are required'}), 400
    
    transfers = Transfer.query.filter_by(
        team_id=team_id,
        season_id=season_id,
        committed=True
    ).all()
    
    return jsonify([
        {
            'transfer_id': t.transfer_id,
            'name': t.name,
            'position': t.position,
            'recruit_stars': t.recruit_stars,
            'recruit_rank_pos': t.recruit_rank_pos,
            'dev_trait': t.dev_trait,
            'height': t.height,
            'weight': t.weight,
            'state': t.state,
            'ovr_rating': t.ovr_rating,
            'previous_school': t.previous_school,
            'current_status': t.current_status
        }
        for t in transfers
    ]) 