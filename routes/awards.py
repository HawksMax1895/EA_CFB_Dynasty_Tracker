from flask import Blueprint, request, jsonify
from extensions import db
from models import Award, AwardWinner, Player, Team

awards_bp = Blueprint('awards', __name__)

@awards_bp.route('/awards', methods=['GET'])
def get_awards():
    awards = Award.query.all()
    return jsonify([{'award_id': a.award_id, 'name': a.name, 'description': a.description} for a in awards])

@awards_bp.route('/awards', methods=['POST'])
def create_award():
    data = request.json
    name = data.get('name')
    description = data.get('description')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    award = Award(name=name, description=description)
    db.session.add(award)
    db.session.commit()
    return jsonify({'award_id': award.award_id, 'name': award.name, 'description': award.description}), 201

@awards_bp.route('/awards/<int:award_id>', methods=['PUT'])
def update_award(award_id):
    award = Award.query.get_or_404(award_id)
    data = request.json
    name = data.get('name')
    description = data.get('description')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    award.name = name
    award.description = description
    db.session.commit()
    return jsonify({'award_id': award.award_id, 'name': award.name, 'description': award.description})

@awards_bp.route('/awards/<int:award_id>', methods=['DELETE'])
def delete_award(award_id):
    award = Award.query.get_or_404(award_id)
    db.session.delete(award)
    db.session.commit()
    return jsonify({'message': 'Award deleted successfully'})

@awards_bp.route('/seasons/<int:season_id>/awards', methods=['GET'])
def get_award_winners_by_season(season_id):
    winners = AwardWinner.query.filter_by(season_id=season_id).all()
    result = []
    for w in winners:
        player = Player.query.get(w.player_id)
        team = Team.query.get(w.team_id)
        award = Award.query.get(w.award_id)
        result.append({
            'award_winner_id': w.award_winner_id,
            'award': award.name,
            'player': player.name,
            'player_id': player.player_id,
            'team': team.name,
            'team_id': team.team_id,
            'team_logo_url': team.logo_url
        })
    return jsonify(result)

@awards_bp.route('/award-winners/<int:award_winner_id>', methods=['PUT'])
def update_award_winner(award_winner_id):
    data = request.json
    player_id = data.get('player_id')
    team_id = data.get('team_id')
    if not player_id or not team_id:
        return jsonify({'error': 'player_id and team_id are required'}), 400
    aw = AwardWinner.query.get_or_404(award_winner_id)
    aw.player_id = player_id
    aw.team_id = team_id
    db.session.commit()
    return jsonify({'message': 'Award winner updated successfully'})

@awards_bp.route('/seasons/<int:season_id>/awards/all', methods=['GET'])
def get_all_awards_for_season(season_id):
    """Get all available awards for a season, with winners if they exist"""
    # Get all awards
    all_awards = Award.query.all()
    
    # Get existing winners for this season
    winners = AwardWinner.query.filter_by(season_id=season_id).all()
    winners_by_award = {w.award_id: w for w in winners}
    
    result = []
    for award in all_awards:
        winner = winners_by_award.get(award.award_id)
        
        if winner:
            # Award has a winner
            player = Player.query.get(winner.player_id)
            team = Team.query.get(winner.team_id)
            result.append({
                'award_id': award.award_id,
                'award_name': award.name,
                'award_description': award.description,
                'has_winner': True,
                'award_winner_id': winner.award_winner_id,
                'player_name': player.name if player else None,
                'player_id': winner.player_id,
                'team_name': team.name if team else None,
                'team_id': winner.team_id,
                'team_logo_url': team.logo_url if team else None
            })
        else:
            # Award has no winner yet
            result.append({
                'award_id': award.award_id,
                'award_name': award.name,
                'award_description': award.description,
                'has_winner': False,
                'award_winner_id': None,
                'player_name': None,
                'player_id': None,
                'team_name': None,
                'team_id': None,
                'team_logo_url': None
            })
    
    return jsonify(result)

@awards_bp.route('/seasons/<int:season_id>/awards/<int:award_id>/winner', methods=['POST'])
def create_award_winner(season_id, award_id):
    """Create a new award winner for a specific award and season"""
    data = request.json
    player_id = data.get('player_id')
    team_id = data.get('team_id')
    
    if not player_id or not team_id:
        return jsonify({'error': 'player_id and team_id are required'}), 400
    
    # Check if award exists
    award = Award.query.get_or_404(award_id)
    
    # Check if winner already exists for this award and season
    existing_winner = AwardWinner.query.filter_by(
        season_id=season_id, 
        award_id=award_id
    ).first()
    
    if existing_winner:
        return jsonify({'error': 'Award winner already exists for this award and season'}), 400
    
    # Create new award winner
    award_winner = AwardWinner(
        season_id=season_id,
        award_id=award_id,
        player_id=player_id,
        team_id=team_id
    )
    
    db.session.add(award_winner)
    db.session.commit()
    
    # Return the created award winner with full details
    player = Player.query.get(player_id)
    team = Team.query.get(team_id)
    
    return jsonify({
        'award_winner_id': award_winner.award_winner_id,
        'award_id': award_id,
        'award_name': award.name,
        'award_description': award.description,
        'has_winner': True,
        'player_name': player.name if player else None,
        'player_id': player_id,
        'team_name': team.name if team else None,
        'team_id': team_id,
        'team_logo_url': team.logo_url if team else None
    }), 201 