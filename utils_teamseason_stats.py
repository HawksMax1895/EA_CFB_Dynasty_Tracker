from extensions import db
from models import TeamSeason, Game, PlayerSeason
import requests

def update_teamseason_stats_for_team(season_id, team_id, top_25_ranks=None):
    """
    Recalculate and update points_for, points_against, off_ppg, def_ppg, team_rating, and final_rank for a single team in a season.
    Optionally accepts a dict top_25_ranks {team_id: rank} for final_rank.
    """
    team_season = TeamSeason.query.filter_by(season_id=season_id, team_id=team_id).first()
    if not team_season:
        return
    games = Game.query.filter(
        Game.season_id == season_id,
        ((Game.home_team_id == team_id) | (Game.away_team_id == team_id)),
        Game.home_score != None,
        Game.away_score != None
    ).all()
    points_for = 0
    points_against = 0
    games_played = 0
    for g in games:
        if g.home_team_id == team_id:
            points_for += g.home_score
            points_against += g.away_score
        else:
            points_for += g.away_score
            points_against += g.home_score
        games_played += 1
    team_season.points_for = points_for
    team_season.points_against = points_against
    team_season.off_ppg = round(points_for / games_played, 1) if games_played > 0 else None
    team_season.def_ppg = round(points_against / games_played, 1) if games_played > 0 else None
    # Team rating: average ovr_rating of all PlayerSeason for this team/season
    player_seasons = PlayerSeason.query.filter_by(season_id=season_id, team_id=team_id).all()
    ovr_ratings = [ps.ovr_rating for ps in player_seasons if ps.ovr_rating is not None]
    team_season.team_rating = round(sum(ovr_ratings) / len(ovr_ratings), 1) if ovr_ratings else None
    # Final rank: from top_25_ranks dict if provided, else None
    if top_25_ranks and team_id in top_25_ranks:
        team_season.final_rank = top_25_ranks[team_id]
    else:
        team_season.final_rank = None
    db.session.commit()

def update_teamseason_stats_for_season(season_id, top_25_ranks=None):
    """
    For each team in the given season, recalculate and update points_for, points_against, off_ppg, def_ppg, team_rating, and final_rank.
    Optionally accepts a dict top_25_ranks {team_id: rank} for final_rank.
    """
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    for team_season in team_seasons:
        update_teamseason_stats_for_team(season_id, team_season.team_id, top_25_ranks=top_25_ranks)

def fetch_top_25_ranks(season_id):
    """
    Fetch the top 25 rankings for a season from the frontend API and return a dict {team_id: rank}.
    """
    url = f"http://localhost:3000/rankings?season={season_id}"
    try:
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()
        # Expecting a list of dicts with 'team_id' and 'rank' keys
        return {entry['team_id']: entry['rank'] for entry in data if 'team_id' in entry and 'rank' in entry}
    except Exception as e:
        print(f"Error fetching rankings: {e}")
        return {}
