from flask import Blueprint, request, jsonify, Response
from models import Team, TeamSeason, Season, Player, PlayerSeason, Game
from routes.seasons import get_conference_standings
from routes.recruiting import Recruit
from routes import logger
from typing import Dict, List, Any, Optional, Union

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/<int:season_id>', methods=['GET'])
def get_dashboard_data(season_id: int) -> Response:
    """
    Retrieve comprehensive dashboard data for the user-controlled team in a specific season.
    
    Args:
        season_id (int): ID of the season to get dashboard data for
        
    Returns:
        Response: JSON object containing season information, team details,
        team season statistics, conference standings, roster count, and
        recent games for the user-controlled team.
        
    Raises:
        404: If season is not found, no user-controlled team exists, or
             TeamSeason record is not found
    """
    # Get current season info
    season = Season.query.get_or_404(season_id)
    
    # Get user-controlled team
    user_team = Team.query.filter_by(is_user_controlled=True).first()
    if not user_team:
        return jsonify({'error': 'No user-controlled team found'}), 404
    
    # Get team season data
    team_season = TeamSeason.query.filter_by(
        team_id=user_team.team_id, 
        season_id=season_id
    ).first()
    
    if not team_season:
        return jsonify({'error': 'TeamSeason not found'}), 404
    
    # Get conference standings
    conference_standings = get_conference_standings(
        team_season.conference_id, 
        season_id
    ) if team_season.conference_id else []
    
    # Get team roster
    roster = PlayerSeason.query.filter_by(
        team_id=user_team.team_id, 
        season_id=season_id
    ).all()
    
    # Get recent games
    recent_games = Game.query.filter(
        Game.season_id == season_id,
        ((Game.home_team_id == user_team.team_id) | 
         (Game.away_team_id == user_team.team_id))
    ).order_by(Game.week.desc()).limit(5).all()
    
    return jsonify({
        'season': {
            'season_id': season.season_id,
            'year': season.year
        },
        'team': {
            'team_id': user_team.team_id,
            'name': user_team.name,
            'abbreviation': user_team.abbreviation,
            'logo_url': user_team.logo_url
        },
        'team_season': {
            'wins': team_season.wins,
            'losses': team_season.losses,
            'conference_wins': team_season.conference_wins,
            'conference_losses': team_season.conference_losses,
            'points_for': team_season.points_for,
            'points_against': team_season.points_against,
            'final_rank': team_season.final_rank,
            'prestige': team_season.prestige,
            'team_rating': team_season.team_rating
        },
        'conference_standings': conference_standings,
        'roster_count': len(roster),
        'recent_games': [{
            'game_id': g.game_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'away_team_id': g.away_team_id,
            'home_score': g.home_score,
            'away_score': g.away_score,
            'game_type': g.game_type
        } for g in recent_games]
    })

@dashboard_bp.route('/dashboard/<int:season_id>/stats', methods=['GET'])
def get_dashboard_stats(season_id: int) -> Response:
    """
    Retrieve statistical summary for the user-controlled team in a specific season.
    
    Args:
        season_id (int): ID of the season to get stats for
        
    Returns:
        Response: JSON object containing team statistics (passing, rushing,
        receiving, defensive stats) and team season record (wins, losses,
        points for/against) for the user-controlled team.
        
    Raises:
        404: If no user-controlled team exists or TeamSeason record is not found
    """
    # Get user-controlled team
    user_team = Team.query.filter_by(is_user_controlled=True).first()
    if not user_team:
        return jsonify({'error': 'No user-controlled team found'}), 404
    
    # Get team season data
    team_season = TeamSeason.query.filter_by(
        team_id=user_team.team_id, 
        season_id=season_id
    ).first()
    
    if not team_season:
        return jsonify({'error': 'TeamSeason not found'}), 404
    
    # Get player stats
    players = PlayerSeason.query.filter_by(
        team_id=user_team.team_id, 
        season_id=season_id
    ).all()
    
    # Calculate team stats
    total_pass_yards = sum(p.pass_yards or 0 for p in players)
    total_rush_yards = sum(p.rush_yards or 0 for p in players)
    total_rec_yards = sum(p.rec_yards or 0 for p in players)
    total_tackles = sum(p.tackles or 0 for p in players)
    total_sacks = sum(p.sacks or 0 for p in players)
    total_interceptions = sum(p.interceptions or 0 for p in players)
    
    return jsonify({
        'team_stats': {
            'pass_yards': total_pass_yards,
            'rush_yards': total_rush_yards,
            'rec_yards': total_rec_yards,
            'tackles': total_tackles,
            'sacks': total_sacks,
            'interceptions': total_interceptions
        },
        'team_season': {
            'wins': team_season.wins,
            'losses': team_season.losses,
            'points_for': team_season.points_for,
            'points_against': team_season.points_against
        }
    })

@dashboard_bp.route('/dashboard/overview', methods=['GET'])
def dashboard_overview() -> Response:
    """
    Retrieve team overview information for a specific team and season.
    
    Query Parameters:
        team_id (int): ID of the team to get overview for (required)
        season_id (int): ID of the season to get overview for (required)
        
    Returns:
        Response: JSON object containing team overview including team name,
        overall record, team prestige, team rating, national ranking,
        recruiting ranking, and counts of all-conference players, all-Americans,
        and drafted players.
        
    Raises:
        400: If team_id or season_id are not provided
        404: If team is not found
        
    Note:
        All-conference, all-American, and drafted player counts are currently
        placeholder values as these systems are not fully implemented.
    """
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
def dashboard() -> Response:
    """
    Retrieve comprehensive dashboard information for the user-controlled team.
    
    Query Parameters:
        season_id (int, optional): Specific season to get dashboard for.
                                 If not provided, uses the most recent season.
                                 
    Returns:
        Response: JSON object containing comprehensive team information including
        current season details, all-time records, conference records, recent
        performance, and team statistics.
        
    Raises:
        404: If no user-controlled team exists, no seasons exist, or
             specified season is not found
        
    Note:
        All-time records and conference records are calculated from actual
        game results for accuracy. Conference record calculation excludes
        bye weeks and unplayed games.
    """
    # Get the user's team
    team = Team.query.filter_by(is_user_controlled=True).first()
    if not team:
        return jsonify({"error": "No user-controlled team found"}), 404

    # Accept season_id as a query parameter
    season_id = request.args.get('season_id', type=int)
    if season_id:
        season = Season.query.get(season_id)
        if not season:
            return jsonify({"error": "Season not found"}), 404
    else:
        season = Season.query.order_by(Season.year.desc()).first()
        if not season:
            return jsonify({"error": "No seasons found"}), 404

    # Get this team's TeamSeason for the selected season
    team_season = TeamSeason.query.filter_by(team_id=team.team_id, season_id=season.season_id).first()

    # Calculate all-time record across all seasons
    all_team_seasons = TeamSeason.query.filter_by(team_id=team.team_id).all()
    total_wins = sum(ts.wins for ts in all_team_seasons)
    total_losses = sum(ts.losses for ts in all_team_seasons)
    all_time_record = f"{total_wins}-{total_losses}"

    # Calculate all-time conference record (robust)
    all_games = Game.query.filter(
        (Game.home_team_id == team.team_id) | (Game.away_team_id == team.team_id)
    ).order_by(Game.season_id.asc(), Game.week.asc()).all()
    team_seasons_by_season = {ts.season_id: ts for ts in TeamSeason.query.filter_by(team_id=team.team_id).all()}
    # Build a mapping: (season_id, team_id) -> conference_id
    team_conf_map = {(ts.season_id, ts.team_id): ts.conference_id for ts in TeamSeason.query.all()}
    conf_wins = 0
    conf_losses = 0
    for g in all_games:
        # Skip byes and unplayed games
        if getattr(g, 'game_type', None) == 'Bye Week':
            continue
        if g.home_score is None or g.away_score is None or (g.home_score == 0 and g.away_score == 0):
            continue
        # Get both teams' conference for this season
        home_conf = team_conf_map.get((g.season_id, g.home_team_id))
        away_conf = team_conf_map.get((g.season_id, g.away_team_id))
        if not home_conf or not away_conf:
            continue
        if home_conf != away_conf:
            continue  # Not a conference game
        # Determine if user team is home or away
        is_home = g.home_team_id == team.team_id
        is_away = g.away_team_id == team.team_id
        if not (is_home or is_away):
            continue
        # Count win/loss
        team_score = g.home_score if is_home else g.away_score
        opp_score = g.away_score if is_home else g.home_score
        if team_score > opp_score:
            conf_wins += 1
        elif team_score < opp_score:
            conf_losses += 1
    conference_record = f"{conf_wins}-{conf_losses}"

    # Calculate current season conference record for user team
    current_conf_wins = 0
    current_conf_losses = 0
    # Build a mapping: (season_id, team_id) -> conference_id
    team_conf_map = {(ts.season_id, ts.team_id): ts.conference_id for ts in TeamSeason.query.filter_by(season_id=season.season_id).all()}
    # Get all games for this team in the current season
    all_games_current_season = (
        Game.query.filter(
            ((Game.home_team_id == team.team_id) | (Game.away_team_id == team.team_id)) &
            (Game.season_id == season.season_id)
        ).order_by(Game.week.asc()).all()
    )
    for g in all_games_current_season:
        if getattr(g, 'game_type', None) == 'Bye Week':
            continue
        if g.home_score is None or g.away_score is None or (g.home_score == 0 and g.away_score == 0):
            continue
        home_conf = team_conf_map.get((g.season_id, g.home_team_id))
        away_conf = team_conf_map.get((g.season_id, g.away_team_id))
        if not home_conf or not away_conf:
            continue
        if home_conf != away_conf:
            continue  # Not a conference game
        is_home = g.home_team_id == team.team_id
        is_away = g.away_team_id == team.team_id
        if not (is_home or is_away):
            continue
        team_score = g.home_score if is_home else g.away_score
        opp_score = g.away_score if is_home else g.home_score
        if team_score > opp_score:
            current_conf_wins += 1
        elif team_score < opp_score:
            current_conf_losses += 1
    current_season_conference_record = f"{current_conf_wins}-{current_conf_losses}"

    # Team record (all-time)
    record = all_time_record

    # Current season record
    current_season_record = f"{team_season.wins}-{team_season.losses}" if team_season else "-"

    # Team prestige, ranking, etc.
    prestige = team_season.prestige if team_season else "-"
    national_ranking = team_season.final_rank if team_season else "-"
    championships = "Conference Champions" if team_season and team_season.final_rank == 1 else "-"

    # Recruiting info
    recruiting_commits = Recruit.query.filter_by(team_id=team.team_id, season_id=season.season_id, committed=True).count()
    recruiting_rank = team_season.recruiting_rank if team_season else None

    # Get all games for this team in the current season
    all_games = (
        Game.query.filter(
            ((Game.home_team_id == team.team_id) | (Game.away_team_id == team.team_id)) &
            (Game.season_id == season.season_id)
        )
        .order_by(Game.week.asc())
        .all()
    )

    # Find the last completed game (has scores and not 0-0)
    last_completed_game = None
    for game in reversed(all_games):
        if (
            game.home_score is not None and game.away_score is not None
            and not (game.home_score == 0 and game.away_score == 0)
        ):
            last_completed_game = game
            break

    # Get the 3 games to display
    display_games = []
    if last_completed_game:
        # Get the last completed game and next 2 games
        completed_games = [g for g in all_games if g.home_score is not None and g.away_score is not None and not (g.home_score == 0 and g.away_score == 0)]
        future_games = [g for g in all_games if g.home_score is None or g.away_score is None or (g.home_score == 0 and g.away_score == 0)]
        # Start with the last completed game
        display_games.append(last_completed_game)
        # Add up to 2 future games after the last completed game
        last_index = all_games.index(last_completed_game)
        for game in all_games[last_index+1:]:
            if len(display_games) < 3:
                display_games.append(game)
        # If we don't have 3 games yet, add more completed games from the end (before last completed)
        if len(display_games) < 3:
            for game in reversed(completed_games[:-1]):  # Skip the last completed game as it's already added
                if len(display_games) < 3:
                    display_games.append(game)
    else:
        # No games played yet, show next 3 games
        future_games = [g for g in all_games if g.home_score is None or g.away_score is None or (g.home_score == 0 and g.away_score == 0)]
        display_games = future_games[:3]
        # If we don't have 3 future games, add completed games from the end
        if len(display_games) < 3:
            completed_games = [g for g in all_games if g.home_score is not None and g.away_score is not None and not (g.home_score == 0 and g.away_score == 0)]
            for game in reversed(completed_games):
                if len(display_games) < 3:
                    display_games.append(game)

    # Prefetch opponent team names and logo_urls in one query to avoid an N+1 pattern
    opponent_ids = [
        g.away_team_id if g.home_team_id == team.team_id else g.home_team_id
        for g in display_games
    ]
    opponents = {
        t.team_id: {"name": t.name, "logo_url": t.logo_url} for t in Team.query.filter(Team.team_id.in_(opponent_ids)).all()
    }

    recent_activity = []
    for game in display_games:
        is_bye_week = (
            getattr(game, 'game_type', None) == 'Bye Week' or
            (game.home_team_id == game.away_team_id == team.team_id)
        )
        if is_bye_week:
            recent_activity.append({
                "title": "Bye Week",
                "description": "No game this week",
                "time_ago": f"Week {game.week}",
                "status": "bye"
            })
            continue
        opponent_id = game.away_team_id if game.home_team_id == team.team_id else game.home_team_id
        opponent_info = opponents.get(opponent_id, {"name": f"Team {opponent_id}", "logo_url": None})
        opponent_name = opponent_info["name"]
        opponent_logo_url = opponent_info["logo_url"]
        if game.home_team_id == team.team_id:
            prefix = "vs"
        else:
            prefix = "@"
        title = f"{prefix} {opponent_name}"
        if (
            game.home_score is not None and game.away_score is not None
            and not (game.home_score == 0 and game.away_score == 0)
        ):
            # Completed game
            if (game.home_team_id == team.team_id and game.home_score > game.away_score) or \
               (game.away_team_id == team.team_id and game.away_score > game.home_score):
                result = "Win"
            else:
                result = "Loss"
            recent_activity.append({
                "title": f"{title}",
                "description": f"{result} ({game.home_score}-{game.away_score}) in week {game.week}",
                "time_ago": f"Week {game.week}",
                "status": "completed",
                "opponent_team_id": opponent_id,
                "opponent_logo_url": opponent_logo_url
            })
        else:
            # Future game
            recent_activity.append({
                "title": f"{title}",
                "description": f"Upcoming game in week {game.week}",
                "time_ago": f"Week {game.week}",
                "status": "upcoming",
                "opponent_team_id": opponent_id,
                "opponent_logo_url": opponent_logo_url
            })

    # Use manual_conference_position if set
    if team_season and team_season.manual_conference_position:
        conference_position = team_season.manual_conference_position
    else:
        if team_season:
            user_conference_id = team_season.conference_id
            conf_team_entries_sorted = get_conference_standings(user_conference_id, season.season_id)
            for idx, entry in enumerate(conf_team_entries_sorted, 1):
                if entry['team_id'] == team.team_id:
                    conference_position = idx
                    break

    return jsonify({
        "season": {
            "year": season.year,
            "dynasty_year": season.year - 2019  # Example: adjust base year as needed
        },
        "team": {
            "record": record,
            "current_season_record": current_season_record,
            "current_season_conference_record": current_season_conference_record,
            "conference_record": conference_record,
            "championships": championships,
            "prestige": prestige,
            "national_ranking": national_ranking,
            "conference_position": conference_position,
            "recruiting_commits": recruiting_commits,
            "recruiting_rank": recruiting_rank
        },
        "recent_activity": recent_activity
    })

@dashboard_bp.route('/dashboard/wins-chart', methods=['GET'])
def dashboard_wins_chart() -> Response:
    """
    Retrieve wins chart data for the user-controlled team across all seasons.
    
    Returns:
        Response: JSON object containing team name and chart data with
        season-by-season win/loss records including year, wins, losses,
        and total games for each season.
        
    Raises:
        404: If no user-controlled team exists
        
    Note:
        Data is ordered by season year (ascending) for proper chart visualization.
        Includes total games calculation for each season.
    """
    # Get the user's team
    team = Team.query.filter_by(is_user_controlled=True).first()
    if not team:
        return jsonify({"error": "No user-controlled team found"}), 404

    # Get all team seasons for this team, ordered by year
    team_seasons = (
        TeamSeason.query
        .filter_by(team_id=team.team_id)
        .join(Season, TeamSeason.season_id == Season.season_id)
        .order_by(Season.year.asc())
        .all()
    )

    # Prepare data for the chart
    chart_data = []
    for ts in team_seasons:
        season = Season.query.get(ts.season_id)
        chart_data.append({
            "year": season.year,
            "wins": ts.wins,
            "losses": ts.losses,
            "total_games": ts.wins + ts.losses
        })

    return jsonify({
        "team_name": team.name,
        "chart_data": chart_data
    }) 