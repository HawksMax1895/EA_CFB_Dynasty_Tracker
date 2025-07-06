from flask import Blueprint, request, jsonify, Response
from extensions import db
from models import Player, Team, Season, PlayerSeason, Recruit

recruiting_bp = Blueprint('recruiting', __name__)

@recruiting_bp.route('/recruiting-class', methods=['POST'])
def add_recruiting_class() -> Response:
    """
    Add a recruiting class for a specific team in a specific season.
    
    Expected JSON payload:
        team_id (int): ID of the team to add recruits for (required)
        season_id (int): ID of the season to add recruits for (required)
        recruits (list): List of recruit objects (required)
        
    Each recruit object should contain:
        name (str): Recruit name (required)
        position (str): Recruit position (required)
        recruit_stars (int, optional): Recruit star rating
        recruit_rank_nat (int, optional): National ranking
        recruit_rank_pos (int, optional): Position ranking
        speed (int, optional): Speed rating
        dev_trait (str, optional): Development trait
        height (str, optional): Height
        weight (int, optional): Weight
        state (str, optional): State
        
    Returns:
        Response: JSON object with created_recruit_ids array and 201 status code
        on success, or error message with appropriate status code on failure.
        
    Raises:
        400: If required fields are missing or recruits is not a list
        404: If season is not found
        
    Note:
        Only recruits with valid name and position are created. Invalid recruits
        are silently skipped without error.
    """
    data = request.json
    team_id = data.get('team_id')
    season_id = data.get('season_id')
    recruits = data.get('recruits', [])
    if not team_id or not season_id or not isinstance(recruits, list):
        return jsonify({'error': 'team_id, season_id, and recruits list are required'}), 400
    season = Season.query.get(season_id)
    if not season:
        return jsonify({'error': 'Season not found'}), 404

    # Note: progression and future_seasons variables are defined but not used in current implementation
    # future_seasons = (
    #     Season.query.filter(Season.year >= season.year)
    #     .order_by(Season.year)
    #     .all()
    # )

    created_recruits = []
    for recruit in recruits:
        name = recruit.get('name')
        position = recruit.get('position')
        recruit_stars = recruit.get('recruit_stars')
        recruit_rank_nat = recruit.get('recruit_rank_nat')
        recruit_rank_pos = recruit.get('recruit_rank_pos')
        speed = recruit.get('speed')
        dev_trait = recruit.get('dev_trait')
        height = recruit.get('height')
        weight = recruit.get('weight')
        state = recruit.get('state')
        ovr_rating = recruit.get('ovr_rating')
        if not name or not position:
            continue

        recruit_obj = Recruit(
            name=name,
            position=position,
            recruit_stars=recruit_stars,
            recruit_rank_nat=recruit_rank_nat,
            recruit_rank_pos=recruit_rank_pos,
            speed=speed,
            dev_trait=dev_trait,
            height=height,
            weight=weight,
            state=state,
            team_id=team_id,
            season_id=season_id,
            committed=True,
            ovr_rating=ovr_rating
        )
        db.session.add(recruit_obj)
        db.session.flush()
        created_recruits.append(recruit_obj.recruit_id)

    db.session.commit()
    return jsonify({'created_recruit_ids': created_recruits}), 201

@recruiting_bp.route('/recruiting-class', methods=['GET'])
def get_recruiting_class() -> Response:
    """
    Retrieve the recruiting class for a specific team in a specific season.
    
    Query Parameters:
        team_id (int): ID of the team to get recruits for (required)
        season_id (int): ID of the season to get recruits for (required)
        
    Returns:
        Response: JSON array containing all committed recruits for the team/season
        including recruit_id, name, position, recruit_stars, recruit_rank_nat,
        recruit_rank_pos, speed, dev_trait, height, weight, and state.
        
    Raises:
        400: If team_id or season_id are not provided
    """
    team_id = request.args.get('team_id', type=int)
    season_id = request.args.get('season_id', type=int)
    if not team_id or not season_id:
        return jsonify({'error': 'team_id and season_id are required'}), 400

    recruits = Recruit.query.filter_by(
        team_id=team_id,
        season_id=season_id,
        committed=True
    ).all()

    return jsonify([
        {
            'recruit_id': r.recruit_id,
            'name': r.name,
            'position': r.position,
            'recruit_stars': r.recruit_stars,
            'recruit_rank_nat': r.recruit_rank_nat,
            'recruit_rank_pos': r.recruit_rank_pos,
            'speed': r.speed,
            'dev_trait': r.dev_trait,
            'height': r.height,
            'weight': r.weight,
            'state': r.state,
            'ovr_rating': r.ovr_rating
        }
        for r in recruits
    ])

@recruiting_bp.route('/recruiting-class/<int:recruit_id>', methods=['PUT'])
def update_recruit(recruit_id: int) -> Response:
    """
    Update information for a specific recruit.
    
    Args:
        recruit_id (int): ID of the recruit to update
        
    Expected JSON payload (all fields optional):
        name (str): Recruit name
        position (str): Recruit position
        recruit_stars (int): Recruit star rating
        recruit_rank_nat (int): National ranking
        recruit_rank_pos (int): Position ranking
        speed (int): Speed rating
        dev_trait (str): Development trait
        height (str): Height
        weight (int): Weight
        state (str): State
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If recruit is not found
    """
    recruit = Recruit.query.get(recruit_id)
    if not recruit:
        return jsonify({'error': 'Recruit not found'}), 404
    
    data = request.json
    recruit.name = data.get('name', recruit.name)
    recruit.position = data.get('position', recruit.position)
    recruit.recruit_stars = data.get('recruit_stars', recruit.recruit_stars)
    recruit.recruit_rank_nat = data.get('recruit_rank_nat', recruit.recruit_rank_nat)
    recruit.recruit_rank_pos = data.get('recruit_rank_pos', recruit.recruit_rank_pos)
    recruit.speed = data.get('speed', recruit.speed)
    recruit.dev_trait = data.get('dev_trait', recruit.dev_trait)
    recruit.height = data.get('height', recruit.height)
    recruit.weight = data.get('weight', recruit.weight)
    recruit.state = data.get('state', recruit.state)
    recruit.ovr_rating = data.get('ovr_rating', recruit.ovr_rating)
    
    db.session.commit()
    return jsonify({'message': 'Recruit updated successfully'}), 200

@recruiting_bp.route('/recruiting-class/<int:recruit_id>', methods=['DELETE'])
def delete_recruit(recruit_id: int) -> Response:
    """
    Delete a specific recruit from the system.
    
    Args:
        recruit_id (int): ID of the recruit to delete
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If recruit is not found
    """
    recruit = Recruit.query.get(recruit_id)
    if not recruit:
        return jsonify({'error': 'Recruit not found'}), 404
    
    db.session.delete(recruit)
    db.session.commit()
    return jsonify({'message': 'Recruit deleted successfully'}), 200
