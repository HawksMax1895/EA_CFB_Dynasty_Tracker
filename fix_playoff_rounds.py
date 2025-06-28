#!/usr/bin/env python3

print("Starting fix_playoff_rounds script...")

try:
    from app import app, db
    from models import Game
    print("Imports successful")
except Exception as e:
    print(f"Import error: {e}")
    exit(1)

def fix_playoff_rounds():
    try:
        with app.app_context():
            print("App context created")
            
            # Get all playoff games for season 1
            games = (
                Game.query.filter_by(season_id=1, game_type="Playoff")
                .order_by(Game.week.asc(), Game.game_id.asc())
                .all()
            )
            
            print(f"Found {len(games)} playoff games")
            
            # Map weeks to playoff rounds
            week_to_round = {
                17: 'First Round',
                18: 'Quarterfinals', 
                19: 'Semifinals',
                20: 'Championship'
            }
            
            updated = False
            for game in games:
                expected_round = week_to_round.get(game.week)
                print(f"Game {game.game_id}: week={game.week}, current_round={game.playoff_round}, expected_round={expected_round}")
                if expected_round and game.playoff_round != expected_round:
                    game.playoff_round = expected_round
                    updated = True
                    print(f"Updated game {game.game_id} to round {expected_round}")
            
            if updated:
                db.session.commit()
                print("Fixed playoff_round values")
            else:
                print("No updates needed")
    except Exception as e:
        print(f"Error in fix_playoff_rounds: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Running fix_playoff_rounds...")
    fix_playoff_rounds()
    print("Script completed") 