from flask import Blueprint, request, jsonify # type: ignore
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
            'award': award.name,
            'player': player.name,
            'team': team.name
        })
    return jsonify(result) 