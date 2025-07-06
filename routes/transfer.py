from flask import Blueprint, request, jsonify, Response
from extensions import db
from models import Player, Team, Season, PlayerSeason

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
def add_transfer_portal() -> Response:
    """
    Add transfer portal entries for a specific team in a specific season.
    
    Expected JSON payload:
        team_id (int): ID of the team to add transfers for (required)
        season_id (int): ID of the season to add transfers for (required)
        transfers (list): List of transfer objects (required)
        
    Each transfer object should contain:
        name (str): Transfer name (required)
        position (str): Transfer position (required)
        previous_school (str, optional): Previous school attended
        ovr_rating (int, optional): Overall rating
        recruit_stars (int, optional): Recruit star rating
        recruit_rank_pos (int, optional): Position ranking
        dev_trait (str, optional): Development trait
        height (str, optional): Height
        weight (int, optional): Weight
        state (str, optional): State
        current_status (str, optional): Current academic status (default: 'SO')
        
    Returns:
        Response: JSON object with created_transfer_ids array and 201 status code
        on success, or error message with appropriate status code on failure.
        
    Raises:
        400: If required fields are missing or transfers is not a list
        404: If season is not found
        
    Note:
        Only transfers with valid name and position are created. Invalid transfers
        are silently skipped without error.
    """
    data = request.json
    team_id = data.get('team_id')
    season_id = data.get('season_id')
    transfers = data.get('transfers', [])
    if not team_id or not season_id or not isinstance(transfers, list):
        return jsonify({'error': 'team_id, season_id, and transfers list are required'}), 400
    season = Season.query.get(season_id)
    if not season:
        return jsonify({'error': 'Season not found'}), 404

    # Note: progression and future_seasons variables are defined but not used in current implementation
    # future_seasons = (
    #     Season.query.filter(Season.year >= season.year)
    #     .order_by(Season.year)
    #     .all()
    # )

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
        db.session.flush()
        created_transfers.append(transfer_obj.transfer_id)

    db.session.commit()
    return jsonify({'created_transfer_ids': created_transfers}), 201

@transfer_bp.route('/transfer-portal', methods=['GET'])
def get_transfer_portal() -> Response:
    """
    Retrieve the transfer portal entries for a specific team in a specific season.
    
    Query Parameters:
        team_id (int): ID of the team to get transfers for (required)
        season_id (int): ID of the season to get transfers for (required)
        
    Returns:
        Response: JSON array containing all committed transfers for the team/season
        including transfer_id, name, position, recruit_stars, recruit_rank_pos,
        dev_trait, height, weight, state, ovr_rating, previous_school, and current_status.
        
    Raises:
        400: If team_id or season_id are not provided
    """
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

@transfer_bp.route('/transfer-portal/<int:transfer_id>', methods=['PUT'])
def update_transfer(transfer_id: int) -> Response:
    """
    Update information for a specific transfer.
    
    Args:
        transfer_id (int): ID of the transfer to update
        
    Expected JSON payload (all fields optional):
        name (str): Transfer name
        position (str): Transfer position
        previous_school (str): Previous school attended
        ovr_rating (int): Overall rating
        recruit_stars (int): Recruit star rating
        recruit_rank_pos (int): Position ranking
        dev_trait (str): Development trait
        height (str): Height
        weight (int): Weight
        state (str): State
        current_status (str): Current academic status
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If transfer is not found
    """
    transfer = Transfer.query.get(transfer_id)
    if not transfer:
        return jsonify({'error': 'Transfer not found'}), 404
    
    data = request.json
    transfer.name = data.get('name', transfer.name)
    transfer.position = data.get('position', transfer.position)
    transfer.previous_school = data.get('previous_school', transfer.previous_school)
    transfer.ovr_rating = data.get('ovr_rating', transfer.ovr_rating)
    transfer.recruit_stars = data.get('recruit_stars', transfer.recruit_stars)
    transfer.recruit_rank_pos = data.get('recruit_rank_pos', transfer.recruit_rank_pos)
    transfer.dev_trait = data.get('dev_trait', transfer.dev_trait)
    transfer.height = data.get('height', transfer.height)
    transfer.weight = data.get('weight', transfer.weight)
    transfer.state = data.get('state', transfer.state)
    transfer.current_status = data.get('current_status', transfer.current_status)
    
    db.session.commit()
    return jsonify({'message': 'Transfer updated successfully'}), 200

@transfer_bp.route('/transfer-portal/<int:transfer_id>', methods=['DELETE'])
def delete_transfer(transfer_id: int) -> Response:
    """
    Delete a specific transfer from the system.
    
    Args:
        transfer_id (int): ID of the transfer to delete
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If transfer is not found
    """
    transfer = Transfer.query.get(transfer_id)
    if not transfer:
        return jsonify({'error': 'Transfer not found'}), 404
    
    db.session.delete(transfer)
    db.session.commit()
    return jsonify({'message': 'Transfer deleted successfully'}), 200 