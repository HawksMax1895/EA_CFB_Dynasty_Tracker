from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import TeamSeason

rankings_bp = Blueprint('rankings', __name__)

@rankings_bp.route('/recruiting-rankings', methods=['POST'])
def update_recruiting_rankings():
    data = request.json
    season_id = data.get('season_id')
    rankings = data.get('rankings', [])
    if not season_id or not isinstance(rankings, list):
        return jsonify({'error': 'season_id and rankings list are required'}), 400
    updated_teams = []
    for r in rankings:
        team_id = r.get('team_id')
        recruiting_rank = r.get('recruiting_rank')
        if not team_id or recruiting_rank is None:
            continue
        ts = TeamSeason.query.filter_by(season_id=season_id, team_id=team_id).first()
        if ts:
            ts.recruiting_rank = recruiting_rank
            db.session.add(ts)
            updated_teams.append(team_id)
    db.session.commit()
    return jsonify({'updated_team_ids': updated_teams}), 201 