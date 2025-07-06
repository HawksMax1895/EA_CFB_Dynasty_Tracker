from flask import Blueprint, request, jsonify, Response

promotion_bp = Blueprint('promotion', __name__)

@promotion_bp.route('/promotion-relegation', methods=['POST'])
def add_promotion_relegation() -> Response:
    data = request.json
    season_id = data.get('season_id')
    promoted = data.get('promoted', [])
    relegated = data.get('relegated', [])
    if not season_id or not isinstance(promoted, list) or not isinstance(relegated, list):
        return jsonify({'error': 'season_id, promoted, and relegated lists are required'}), 400
    # No DB model for this, so just echo the data
    return jsonify({'season_id': season_id, 'promoted': promoted, 'relegated': relegated}), 201 