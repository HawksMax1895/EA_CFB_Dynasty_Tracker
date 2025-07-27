from extensions import db
from models import TeamSeason, Game
from models import PlayerSeason
from utils_teamseason_stats import update_teamseason_stats_for_team

def update_teamseason_ppg_for_season(season_id):
    """
    For each team in the given season, recalculate and update off_ppg and def_ppg in TeamSeason.
    """
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    for team_season in team_seasons:
        team_id = team_season.team_id
        # Get all games for this team in this season
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
        team_season.off_ppg = round(points_for / games_played, 1) if games_played > 0 else None
        team_season.def_ppg = round(points_against / games_played, 1) if games_played > 0 else None
    db.session.commit()


def update_teamseason_ppg_for_team(season_id, team_id):
    """
    Recalculate and update off_ppg and def_ppg for a single team in a season.
    """
    # DEPRECATED: Use update_teamseason_stats_for_team instead for full stat update
    update_teamseason_stats_for_team(season_id, team_id)
