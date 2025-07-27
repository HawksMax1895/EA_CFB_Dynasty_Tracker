import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app
from extensions import db
from models import Season, Team, Game

TOTAL_WEEKS = 17  # Final week number (0-17)


def add_missing_weeks():
    """Add bye-week games so every season covers weeks 0-17, but only if a team has no game at all that week."""
    added = 0
    with app.app_context():
        seasons = Season.query.all()
        # Only get the user-controlled team
        user_team = Team.query.filter_by(is_user_controlled=True).first()
        if not user_team:
            print("No user-controlled team found. Exiting.")
            return
        for season in seasons:
            for week in range(TOTAL_WEEKS + 1):
                # Check if this team has any game (home or away) this week
                exists = Game.query.filter(
                    Game.season_id == season.season_id,
                    Game.week == week,
                    ((Game.home_team_id == user_team.team_id) | (Game.away_team_id == user_team.team_id))
                ).first()
                if exists:
                    continue
                # Add a bye week only if no game exists for this team in this week
                db.session.add(Game(
                    season_id=season.season_id,
                    week=week,
                    home_team_id=user_team.team_id,
                    away_team_id=None,
                    game_type="Bye Week",
                ))
                added += 1
        db.session.commit()
    print(f"Added {added} bye-week games")


if __name__ == "__main__":
    add_missing_weeks()
