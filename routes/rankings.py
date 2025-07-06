from flask import Blueprint, request, jsonify, Response
from extensions import db
from models import TeamSeason, Team, Season

rankings_bp = Blueprint('rankings', __name__)

@rankings_bp.route('/recruiting-rankings', methods=['POST'])
def update_recruiting_rankings() -> Response:
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

@rankings_bp.route('/recruiting-rankings', methods=['GET'])
def get_recruiting_rankings() -> Response:
    season_id = request.args.get('season_id', type=int)
    query = TeamSeason.query
    if season_id:
        query = query.filter_by(season_id=season_id)
    rankings = query.order_by(TeamSeason.recruiting_rank.asc()).all()
    return jsonify([
        {
            'team_id': ts.team_id,
            'team_name': Team.query.get(ts.team_id).name if ts.team_id else None,
            'season_id': ts.season_id,
            'season_year': Season.query.get(ts.season_id).year if ts.season_id else None,
            'recruiting_rank': ts.recruiting_rank
        }
        for ts in rankings if ts.recruiting_rank is not None
    ]) 