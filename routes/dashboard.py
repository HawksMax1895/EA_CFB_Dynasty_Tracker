from flask import Blueprint, request, jsonify # type: ignore
from models import Team, TeamSeason, Season, Player, PlayerSeason, Game

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/overview', methods=['GET'])
def dashboard_overview():
    team_id = request.args.get('team_id', type=int)
    season_id = request.args.get('season_id', type=int)
    if not team_id or not season_id:
        return jsonify({'error': 'team_id and season_id are required'}), 400
    team = Team.query.get_or_404(team_id)
    ts = TeamSeason.query.filter_by(team_id=team_id, season_id=season_id).first()
    season = Season.query.get(season_id)
    # Placeholder logic for all-conference, all-american, drafted counts
    all_conference = 0
    all_american = 0
    drafted = Player.query.filter_by(team_id=team_id, drafted_year=season.year+1 if season else None).count()
    overview = {
        'team_name': team.name,
        'overall_record': f"{ts.wins}-{ts.losses}" if ts else None,
        'team_prestige': ts.prestige if ts else None,
        'team_rating': ts.team_rating if ts else None,
        'national_ranking': ts.final_rank if ts else None,
        'recruiting_ranking': ts.recruiting_rank if ts else None,
        'all_conference_players': all_conference,
        'all_americans': all_american,
        'drafted_players': drafted
    }
    return jsonify(overview) 