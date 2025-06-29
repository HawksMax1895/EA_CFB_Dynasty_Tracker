from flask import Blueprint, jsonify
from extensions import db
from models import Player, TeamSeason

season_actions_bp = Blueprint('season_actions', __name__)

@season_actions_bp.route('/seasons/<int:season_id>/players/progression', methods=['POST'])
def progress_players(season_id):
    PROGRESSION_MAP = {"FR": "SO", "SO": "JR", "JR": "SR", "SR": "GR", "GR": "GR"}
    players = Player.query.all()
    progressed = []
    redshirted = []
    for player in players:
        if player.redshirted:
            player.redshirted = False
            redshirted.append(player.player_id)
            continue
        if player.current_year in PROGRESSION_MAP:
            player.current_year = PROGRESSION_MAP[player.current_year]
            progressed.append(player.player_id)
    db.session.commit()
    return jsonify({"progressed_player_ids": progressed, "redshirted_player_ids": redshirted}), 200

@season_actions_bp.route('/seasons/<int:season_id>/teams/top25', methods=['POST'])
def assign_top25(season_id):
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    sorted_teams = sorted(team_seasons, key=lambda ts: (ts.wins if ts.wins is not None else 0, ts.team_id), reverse=True)
    top25 = sorted_teams[:25]
    for i, ts in enumerate(top25):
        ts.final_rank = i + 1
    for ts in sorted_teams[25:]:
        ts.final_rank = None
    db.session.commit()
    return jsonify({'message': 'Top 25 assigned by wins', 'assigned_team_ids': [ts.team_id for ts in top25]}), 200
