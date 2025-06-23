from flask import Blueprint, request, jsonify
from extensions import db
from models import Player, PlayerSeason

career_bp = Blueprint('career', __name__)

@career_bp.route('/players/<int:player_id>/career-progress', methods=['POST'])
def update_career_progress(player_id):
    data = request.json
    ratings_by_year = data.get('ratings_by_year', [])
    if not isinstance(ratings_by_year, list):
        return jsonify({'error': 'ratings_by_year must be a list'}), 400
    updated = []
    for entry in ratings_by_year:
        season_id = entry.get('season_id')
        ovr_rating = entry.get('ovr_rating')
        team_id = entry.get('team_id')
        player_class = entry.get('player_class')
        if not season_id or not team_id or ovr_rating is None:
            continue
        ps = PlayerSeason.query.filter_by(player_id=player_id, season_id=season_id).first()
        if not ps:
            ps = PlayerSeason(player_id=player_id, season_id=season_id, team_id=team_id)
            db.session.add(ps)
        ps.ovr_rating = ovr_rating
        ps.player_class = player_class
        updated.append({'season_id': season_id, 'ovr_rating': ovr_rating})
    db.session.commit()
    return jsonify({'updated': updated}), 201 