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
    # Since drafted_year was removed from Player model, we'll need to track this differently
    drafted = 0
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

@dashboard_bp.route('/dashboard', methods=['GET'])
def dashboard():
    # Get the user's team
    team = Team.query.filter_by(is_user_controlled=True).first()
    if not team:
        return jsonify({"error": "No user-controlled team found"}), 404

    # Get the latest season
    season = Season.query.order_by(Season.year.desc()).first()
    if not season:
        return jsonify({"error": "No seasons found"}), 404

    # Get this team's TeamSeason for the current season
    team_season = TeamSeason.query.filter_by(team_id=team.team_id, season_id=season.season_id).first()

    # Team record
    record = f"{team_season.wins}-{team_season.losses}" if team_season else "-"

    # Team prestige, ranking, etc.
    prestige = team_season.prestige if team_season else "-"
    national_ranking = team_season.final_rank if team_season else "-"
    championships = "Conference Champions" if team_season and team_season.final_rank == 1 else "-"

    # Active players
    active_players = Player.query.filter_by(team_id=team.team_id).count()

    # Recent activity: last 3 games for this team
    recent_games = (
        Game.query.filter(
            ((Game.home_team_id == team.team_id) | (Game.away_team_id == team.team_id)) &
            (Game.season_id == season.season_id)
        )
        .order_by(Game.week.desc())
        .limit(3)
        .all()
    )

    # Prefetch opponent team names in one query to avoid an N+1 pattern
    opponent_ids = [
        g.away_team_id if g.home_team_id == team.team_id else g.home_team_id
        for g in recent_games
    ]
    opponents = {
        t.team_id: t.name for t in Team.query.filter(Team.team_id.in_(opponent_ids)).all()
    }

    recent_activity = []
    for game in recent_games:
        opponent_id = game.away_team_id if game.home_team_id == team.team_id else game.home_team_id
        opponent_name = opponents.get(opponent_id, f"Team {opponent_id}")
        result = "-"
        if game.home_score is not None and game.away_score is not None:
            if (game.home_team_id == team.team_id and game.home_score > game.away_score) or \
               (game.away_team_id == team.team_id and game.away_score > game.home_score):
                result = "Win"
            else:
                result = "Loss"
        recent_activity.append({
            "title": f"Game vs {opponent_name}",
            "description": f"{result} ({game.home_score}-{game.away_score}) in week {game.week}",
            "time_ago": f"Week {game.week}"
        })

    return jsonify({
        "season": {
            "year": season.year,
            "dynasty_year": season.year - 2019  # Example: adjust base year as needed
        },
        "team": {
            "record": record,
            "championships": championships,
            "prestige": prestige,
            "national_ranking": national_ranking
        },
        "stats": {
            "active_players": active_players
        },
        "recent_activity": recent_activity
    }) 