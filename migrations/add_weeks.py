from app import app
from extensions import db
from models import Season, Team, Game

TOTAL_WEEKS = 16  # Final week number (0-16)


def add_missing_weeks():
    """Add bye-week games so every season covers weeks 0-16."""
    added = 0
    with app.app_context():
        seasons = Season.query.all()
        teams = Team.query.all()
        for season in seasons:
            for week in range(TOTAL_WEEKS + 1):
                for team in teams:
                    exists = Game.query.filter(
                        Game.season_id == season.season_id,
                        Game.week == week,
                        ((Game.home_team_id == team.team_id) |
                         (Game.away_team_id == team.team_id))
                    ).first()
                    if exists:
                        continue
                    db.session.add(Game(
                        season_id=season.season_id,
                        week=week,
                        home_team_id=team.team_id,
                        away_team_id=None,
                        game_type="Bye Week",
                    ))
                    added += 1
        db.session.commit()
    print(f"Added {added} bye-week games")


if __name__ == "__main__":
    add_missing_weeks()
