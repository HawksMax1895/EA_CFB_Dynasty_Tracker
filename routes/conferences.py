from flask import Blueprint, request, jsonify
from extensions import db
from models import Conference, Team

conferences_bp = Blueprint('conferences', __name__)

@conferences_bp.route('/conferences', methods=['POST'])
def create_conference():
    data = request.json
    name = data.get('name')
    tier = data.get('tier')
    if not name:
        return jsonify({'error': 'name is required'}), 400
    conf = Conference(name=name, tier=tier)
    db.session.add(conf)
    db.session.commit()
    return jsonify({'conference_id': conf.conference_id, 'name': conf.name, 'tier': conf.tier}), 201

@conferences_bp.route('/conferences/<int:conference_id>/teams', methods=['POST'])
def assign_teams_to_conference(conference_id):
    data = request.json
    team_ids = data.get('team_ids', [])
    if not isinstance(team_ids, list):
        return jsonify({'error': 'team_ids must be a list'}), 400
    updated = []
    for team_id in team_ids:
        team = Team.query.get(team_id)
        if team:
            team.primary_conference_id = conference_id
            db.session.add(team)
            updated.append(team_id)
    db.session.commit()
    return jsonify({'updated_team_ids': updated}), 201

@conferences_bp.route('/conferences', methods=['GET'])
def get_conferences():
    conferences = Conference.query.all()
    return jsonify([
        {
            'conference_id': c.conference_id,
            'name': c.name,
            'tier': c.tier
        } for c in conferences
    ]) 