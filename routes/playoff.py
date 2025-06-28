from flask import Blueprint, request, jsonify
from extensions import db
from models import Game


def _build_bracket(games):
    """Serialize a list of Game objects into a bracket dict."""
    bracket = {}
    for g in games:
        round_name = g.playoff_round or "Unknown"
        bracket.setdefault(round_name, []).append(
            {
                "game_id": g.game_id,
                "week": g.week,
                "home_team_id": g.home_team_id,
                "away_team_id": g.away_team_id,
                "home_score": g.home_score,
                "away_score": g.away_score,
            }
        )
    return bracket


def _fix_playoff_rounds(season_id):
    """Fix playoff_round values for existing playoff games based on their week."""
    from models import Game
    
    print(f"Fixing playoff rounds for season {season_id}")  # Debug log
    
    games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    
    print(f"Found {len(games)} playoff games")  # Debug log
    
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
        print(f"Game {game.game_id}: week={game.week}, current_round={game.playoff_round}, expected_round={expected_round}")  # Debug log
        if expected_round and game.playoff_round != expected_round:
            game.playoff_round = expected_round
            updated = True
            print(f"Updated game {game.game_id} to round {expected_round}")  # Debug log
    
    if updated:
        db.session.commit()
        print(f"Fixed playoff_round values for season {season_id}")
    else:
        print(f"No updates needed for season {season_id}")
    
    return games


playoff_bp = Blueprint("playoff", __name__)


@playoff_bp.route("/playoff/<int:season_id>/bracket", methods=["GET"])
def get_playoff_bracket(season_id):
    """Return the playoff bracket for a season."""
    from models import Game

    # Fix playoff_round values for existing games
    games = _fix_playoff_rounds(season_id)
    
    bracket = _build_bracket(games)
    
    # Debug: print all games to see what's being returned
    print(f"Bracket for season {season_id}:")
    for round_name, round_games in bracket.items():
        print(f"  {round_name}: {len(round_games)} games")
        for game in round_games:
            print(f"    Game {game['game_id']}: {game['home_team_id']} vs {game['away_team_id']}, {game['home_score']}-{game['away_score']}")
    
    return jsonify(bracket)


@playoff_bp.route("/playoff/<int:season_id>/bracket", methods=["POST"])
def create_or_update_bracket(season_id):
    data = request.json
    games = data.get("games", [])
    if not isinstance(games, list):
        return jsonify({"error": "games must be a list"}), 400
    created_games = []
    for g in games:
        home_team_id = g.get("home_team_id")
        away_team_id = g.get("away_team_id")
        week = g.get("week")
        playoff_round = g.get("playoff_round")
        if not home_team_id or not away_team_id or not week or not playoff_round:
            continue
        game = Game(
            season_id=season_id,
            week=week,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            game_type="Playoff",
            playoff_round=playoff_round,
        )
        db.session.add(game)
        db.session.flush()
        created_games.append(game.game_id)
    db.session.commit()
    # Debug: print the full bracket after save
    games_after = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    print("Bracket after save:")
    for g in games_after:
        print(f"Game {g.game_id}: {g.home_team_id} vs {g.away_team_id}, {g.home_score}-{g.away_score}, round={g.playoff_round}")
    return jsonify({"created_game_ids": created_games}), 201


@playoff_bp.route("/playoff/<int:season_id>/playoff-result", methods=["POST"])
def add_playoff_result(season_id):
    data = request.json
    print("Received data for playoff-result:", data)  # Debug log
    game_id = data.get("game_id")
    home_score = data.get("home_score")
    away_score = data.get("away_score")
    playoff_round = data.get("playoff_round")
    print(f"Looking for game_id={game_id} in season_id={season_id}")
    if not game_id or home_score is None or away_score is None:
        print("Missing required fields in request")
        return (
            jsonify({"error": "game_id, home_score, and away_score are required"}),
            400,
        )
    from models import Game

    # Helper: get all playoff games for this season, ordered by week and id
    games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    game = Game.query.get(game_id)
    if not game or game.season_id != season_id:
        print(f"Game not found or season mismatch: game_id={game_id}, season_id={season_id}")  # Debug log
        return jsonify({"error": "Game not found for this season"}), 404

    print(f"Found game: id={game.game_id}, round={game.playoff_round}, home_score={game.home_score}, away_score={game.away_score}")

    # Update the game score
    game.home_score = home_score
    game.away_score = away_score
    if playoff_round:
        game.playoff_round = playoff_round
    print(f"Updated game: id={game.game_id}, round={game.playoff_round}, home_score={game.home_score}, away_score={game.away_score}")

    # Clear downstream games when this result changes
    def clear_downstream_games(changed_round):
        round_order = ['First Round', 'Quarterfinals', 'Semifinals', 'Championship']
        try:
            changed_idx = round_order.index(changed_round)
            # Only clear rounds that come AFTER the changed round
            downstream_rounds = round_order[changed_idx + 1:]
            print(f"Clearing downstream rounds for {changed_round}: {downstream_rounds}")
            for round_name in downstream_rounds:
                for g in games:
                    if g.playoff_round == round_name:
                        print(f"Clearing game {g.game_id} in {round_name}")
                        if round_name == 'Quarterfinals':
                            # Only clear away_team_id and scores for QF, keep home_team_id (seeds 1-4)
                            g.away_team_id = None
                            g.home_score = None
                            g.away_score = None
                        else:
                            g.home_team_id = None
                            g.away_team_id = None
                            g.home_score = None
                            g.away_score = None
        except ValueError:
            pass

    # Clear downstream games when this result changes
    clear_downstream_games(game.playoff_round)

    # Check if all games in the current round are complete
    round_order = ['First Round', 'Quarterfinals', 'Semifinals', 'Championship']
    current_round_idx = round_order.index(game.playoff_round) if game.playoff_round in round_order else -1
    
    if current_round_idx == -1 or current_round_idx >= len(round_order) - 1:
        db.session.commit()
        return jsonify({"message": "Score updated"}), 200

    current_round = round_order[current_round_idx]
    next_round = round_order[current_round_idx + 1]
    
    # Get all games in current round
    current_round_games = [g for g in games if g.playoff_round == current_round]
    next_round_games = [g for g in games if g.playoff_round == next_round]
    
    # Check if all games in current round are complete
    all_complete = all(g.home_score is not None and g.away_score is not None 
                      and g.home_team_id is not None and g.away_team_id is not None 
                      for g in current_round_games)
    
    print(f"Round {current_round}: {len(current_round_games)} games, all_complete={all_complete}")
    
    # Debug each game in the current round
    for g in current_round_games:
        print(f"  Game {g.game_id}: home_team_id={g.home_team_id}, away_team_id={g.away_team_id}, home_score={g.home_score}, away_score={g.away_score}")
        game_complete = (g.home_score is not None and g.away_score is not None 
                       and g.home_team_id is not None and g.away_team_id is not None)
        print(f"    Game complete: {game_complete}")
    
    if not all_complete:
        db.session.commit()
        return jsonify({"message": "Score updated, waiting for all games in round to complete"}), 200

    # All games in current round are complete - implement reseeding logic
    print(f"All games in {current_round} complete, implementing reseeding for {next_round}")
    
    # Get the seed mapping for teams
    seed_mapping = {}
    
    # For First Round, we need to get the original seeds from the bracket setup
    if current_round == 'First Round':
        # First Round seeds: 5,6,7,8 vs 12,11,10,9
        first_round_seeds = [5, 6, 7, 8, 12, 11, 10, 9]
        for i, g in enumerate(current_round_games):
            if g.home_team_id:
                seed_mapping[g.home_team_id] = first_round_seeds[i]
            if g.away_team_id:
                seed_mapping[g.away_team_id] = first_round_seeds[i + 4]
    
    # For Quarterfinals, we need to get the original seeds from the initial bracket setup
    elif current_round == 'Quarterfinals':
        # We need to reconstruct the original seeds for all teams
        # First, get the original bracket structure to map team_ids to their original seeds
        all_games = (
            Game.query.filter_by(season_id=season_id, game_type="Playoff")
            .order_by(Game.week.asc(), Game.game_id.asc())
            .all()
        )
        
        # Reconstruct original seeds from the bracket setup
        # First Round: 5,6,7,8 vs 12,11,10,9
        first_round_games = [g for g in all_games if g.playoff_round == 'First Round']
        first_round_seeds = [5, 6, 7, 8, 12, 11, 10, 9]
        for i, g in enumerate(first_round_games):
            if g.home_team_id:
                seed_mapping[g.home_team_id] = first_round_seeds[i]
            if g.away_team_id:
                seed_mapping[g.away_team_id] = first_round_seeds[i + 4]
        
        # Quarterfinals home teams: 1,2,3,4
        quarterfinal_games = [g for g in all_games if g.playoff_round == 'Quarterfinals']
        for i, g in enumerate(quarterfinal_games):
            if g.home_team_id:
                seed_mapping[g.home_team_id] = i + 1  # Seeds 1-4
    
    # For Semifinals, we need to determine seeds based on previous round performance
    elif current_round == 'Semifinals':
        # We need to reconstruct the original seeds for all teams
        # First, get the original bracket structure to map team_ids to their original seeds
        all_games = (
            Game.query.filter_by(season_id=season_id, game_type="Playoff")
            .order_by(Game.week.asc(), Game.game_id.asc())
            .all()
        )
        
        # Reconstruct original seeds from the bracket setup
        # First Round: 5,6,7,8 vs 12,11,10,9
        first_round_games = [g for g in all_games if g.playoff_round == 'First Round']
        first_round_seeds = [5, 6, 7, 8, 12, 11, 10, 9]
        for i, g in enumerate(first_round_games):
            if g.home_team_id:
                seed_mapping[g.home_team_id] = first_round_seeds[i]
            if g.away_team_id:
                seed_mapping[g.away_team_id] = first_round_seeds[i + 4]
        
        # Quarterfinals home teams: 1,2,3,4
        quarterfinal_games = [g for g in all_games if g.playoff_round == 'Quarterfinals']
        for i, g in enumerate(quarterfinal_games):
            if g.home_team_id:
                seed_mapping[g.home_team_id] = i + 1  # Seeds 1-4

    # Get winners with their seeds
    winners = []
    for g in current_round_games:
        if g.home_score > g.away_score:
            winner_id = g.home_team_id
        else:
            winner_id = g.away_team_id
        
        winner_seed = seed_mapping.get(winner_id, 999)  # Default high seed for unknown teams
        winners.append((winner_seed, winner_id))
    
    # Sort winners by seed (best seed first)
    winners.sort(key=lambda x: x[0])
    
    # Special handling for First Round to Quarterfinals transition
    if current_round == 'First Round' and next_round == 'Quarterfinals':
        # Seeds 1-4 automatically advance to quarterfinals
        # They should already be assigned as home teams in the bracket
        # We just need to assign the winners from first round as away teams
        
        # Map first round winners to quarterfinal away slots
        # QF1: 1 vs Winner G4, QF2: 2 vs Winner G3, QF3: 3 vs Winner G2, QF4: 4 vs Winner G1
        if len(next_round_games) >= 4 and len(winners) >= 4:
            next_round_games[0].away_team_id = winners[3][1]  # QF1: 1 vs Winner G4 (worst seed)
            next_round_games[1].away_team_id = winners[2][1]  # QF2: 2 vs Winner G3
            next_round_games[2].away_team_id = winners[1][1]  # QF3: 3 vs Winner G2
            next_round_games[3].away_team_id = winners[0][1]  # QF4: 4 vs Winner G1 (best seed)
    
    # Special handling for Semifinals to Championship transition
    elif current_round == 'Semifinals' and next_round == 'Championship':
        # For Championship, assign as many winners as possible
        print(f"Championship seeding logic: {len(next_round_games)} championship games, {len(winners)} winners")
        if len(next_round_games) >= 1:
            if len(winners) == 1:
                # Only one semifinal complete, assign that team as home
                next_round_games[0].home_team_id = winners[0][1]
                next_round_games[0].away_team_id = None
                next_round_games[0].home_score = None
                next_round_games[0].away_score = None
                print(f"Championship partial seed: {winners[0][1]} (seed {winners[0][0]}) vs None")
            elif len(winners) >= 2:
                # Both semifinals complete, assign both
                next_round_games[0].home_team_id = winners[0][1]  # Best seed (home)
                next_round_games[0].away_team_id = winners[1][1]  # Worst seed (away)
                next_round_games[0].home_score = None
                next_round_games[0].away_score = None
                print(f"Championship seeded: {winners[0][1]} (seed {winners[0][0]}) vs {winners[1][1]} (seed {winners[1][0]})")
            # else: no winners yet, do nothing
        else:
            print(f"Championship seeding failed: not enough games ({len(next_round_games)}) or winners ({len(winners)})")
    
    # For other rounds, implement best vs worst seeding
    else:
        num_games = len(next_round_games)
        num_winners = len(winners)
        
        for i in range(min(num_games, num_winners // 2)):
            # Best seed vs worst seed
            best_seed, best_team = winners[i]
            worst_seed, worst_team = winners[-(i + 1)]
            
            next_round_games[i].home_team_id = best_team
            next_round_games[i].away_team_id = worst_team
            
            # Clear scores for the new matchups
            next_round_games[i].home_score = None
            next_round_games[i].away_score = None

    db.session.commit()
    
    # Debug: print final state of all games
    print("Final state after commit:")
    final_games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    for game in final_games:
        print(f"  Game {game.game_id}: {game.home_team_id} vs {game.away_team_id}, {game.home_score}-{game.away_score}, round={game.playoff_round}")
    
    return jsonify({"message": "Batch playoff results updated and reseeding applied"}), 200


@playoff_bp.route("/playoff/<int:season_id>/seed_bracket", methods=["POST"])
def seed_bracket(season_id):
    from models import TeamSeason, Game

    # Get top 12 teams by final_rank (1-12)
    team_seasons = (
        TeamSeason.query.filter_by(season_id=season_id)
        .filter(TeamSeason.final_rank != None)
        .order_by(TeamSeason.final_rank.asc())
        .limit(12)
        .all()
    )
    if len(team_seasons) < 12:
        return (
            jsonify({"error": "Not enough teams with final_rank to seed bracket"}),
            400,
        )
    # Map seed number to team_id
    seeds = {i + 1: ts.team_id for i, ts in enumerate(team_seasons)}
    # Get all playoff games for this season, ordered by week and id
    games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    if len(games) != 11:
        return jsonify({"error": "Bracket structure is incomplete"}), 400
    # Assign teams to games according to 12-team bracket
    # First Round (week 17):
    # G1: 5 vs 12
    # G2: 6 vs 11
    # G3: 7 vs 10
    # G4: 8 vs 9
    games[0].home_team_id = seeds[5]
    games[0].away_team_id = seeds[12]
    games[1].home_team_id = seeds[6]
    games[1].away_team_id = seeds[11]
    games[2].home_team_id = seeds[7]
    games[2].away_team_id = seeds[10]
    games[3].home_team_id = seeds[8]
    games[3].away_team_id = seeds[9]
    # Quarterfinals (week 18):
    # G5: 1 vs Winner G4
    # G6: 2 vs Winner G3
    # G7: 3 vs Winner G2
    # G8: 4 vs Winner G1
    games[4].home_team_id = seeds[1]
    games[4].away_team_id = None  # Winner G4
    games[5].home_team_id = seeds[2]
    games[5].away_team_id = None  # Winner G3
    games[6].home_team_id = seeds[3]
    games[6].away_team_id = None  # Winner G2
    games[7].home_team_id = seeds[4]
    games[7].away_team_id = None  # Winner G1
    # Semifinals (week 19):
    # G9: Winner G5 vs Winner G8
    # G10: Winner G6 vs Winner G7
    games[8].home_team_id = None
    games[8].away_team_id = None
    games[9].home_team_id = None
    games[9].away_team_id = None
    # Championship (week 20):
    # G11: Winner G9 vs Winner G10
    games[10].home_team_id = None
    games[10].away_team_id = None
    db.session.commit()
    # Return updated bracket
    return jsonify(_build_bracket(games))


@playoff_bp.route("/playoff/<int:season_id>/playoff-eligible-teams", methods=["GET"])
def get_playoff_eligible_teams(season_id):
    from models import TeamSeason, Team, Conference

    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    teams = {t.team_id: t for t in Team.query.all()}
    conferences = {c.conference_id: c for c in Conference.query.all()}
    # Determine conference champions (best record in each conference)
    champions = {}
    for conf_id in conferences:
        conf_teams = [ts for ts in team_seasons if ts.conference_id == conf_id]
        if conf_teams:
            # Sort by wins, then by final_rank, then by team_id
            conf_teams_sorted = sorted(
                conf_teams,
                key=lambda ts: (
                    ts.wins if ts.wins is not None else 0,
                    -(ts.final_rank or 9999),
                    -ts.team_id,
                ),
                reverse=True,
            )
            champions[conf_id] = conf_teams_sorted[0].team_id
    result = []
    for ts in team_seasons:
        team = teams.get(ts.team_id)
        conf = conferences.get(ts.conference_id)
        result.append(
            {
                "team_id": ts.team_id,
                "team_name": team.name if team else None,
                "final_rank": ts.final_rank,
                "conference_id": ts.conference_id,
                "conference_name": conf.name if conf else None,
                "is_conference_champion": ts.team_id == champions.get(ts.conference_id),
                "wins": ts.wins,
                "losses": ts.losses,
            }
        )
    return jsonify(result)


@playoff_bp.route("/playoff/<int:season_id>/manual-seed-bracket", methods=["POST"])
def manual_seed_bracket(season_id):
    from models import Game

    data = request.json
    team_ids = data.get("team_ids")
    if not isinstance(team_ids, list) or len(team_ids) != 12:
        return (
            jsonify({"error": "team_ids must be a list of 12 team IDs in seed order"}),
            400,
        )
    # Get all playoff games for this season, ordered by week and id
    games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    if len(games) != 11:
        return jsonify({"error": "Bracket structure is incomplete"}), 400
    # Assign teams to games according to 12-team bracket
    # First Round (week 17):
    # G1: 5 vs 12
    # G2: 6 vs 11
    # G3: 7 vs 10
    # G4: 8 vs 9
    games[0].home_team_id = team_ids[4]
    games[0].away_team_id = team_ids[11]
    games[1].home_team_id = team_ids[5]
    games[1].away_team_id = team_ids[10]
    games[2].home_team_id = team_ids[6]
    games[2].away_team_id = team_ids[9]
    games[3].home_team_id = team_ids[7]
    games[3].away_team_id = team_ids[8]
    # Quarterfinals (week 18):
    # G5: 1 vs Winner G4
    # G6: 2 vs Winner G3
    # G7: 3 vs Winner G2
    # G8: 4 vs Winner G1
    games[4].home_team_id = team_ids[0]
    games[4].away_team_id = None  # Winner G4
    games[5].home_team_id = team_ids[1]
    games[5].away_team_id = None  # Winner G3
    games[6].home_team_id = team_ids[2]
    games[6].away_team_id = None  # Winner G2
    games[7].home_team_id = team_ids[3]
    games[7].away_team_id = None  # Winner G1
    # Semifinals (week 19):
    # G9: Winner G5 vs Winner G8
    # G10: Winner G6 vs Winner G7
    games[8].home_team_id = None
    games[8].away_team_id = None
    games[9].home_team_id = None
    games[9].away_team_id = None
    # Championship (week 20):
    # G11: Winner G9 vs Winner G10
    games[10].home_team_id = None
    games[10].away_team_id = None
    db.session.commit()
    # Return updated bracket
    return jsonify(_build_bracket(games))


@playoff_bp.route("/playoff/<int:season_id>/batch-playoff-result", methods=["POST"])
def batch_playoff_result(season_id):
    data = request.json
    print("Received data for batch-playoff-result:", data)  # Debug log
    results = data.get("results", [])
    if not isinstance(results, list) or not results:
        print("Invalid or empty results list in request")
        return jsonify({"error": "results must be a non-empty list"}), 400
    
    print(f"Processing {len(results)} results for season {season_id}")
    for i, result in enumerate(results):
        print(f"  Result {i}: {result}")
    
    from models import Game
    
    # Helper: get all playoff games for this season, ordered by week and id
    games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    
    print(f"Found {len(games)} playoff games in database")
    for game in games:
        print(f"  Game {game.game_id}: {game.home_team_id} vs {game.away_team_id}, {game.home_score}-{game.away_score}, round={game.playoff_round}")
    
    # Track which rounds were modified
    modified_rounds = set()
    
    # Update all games in batch
    for result in results:
        game_id = result.get("game_id")
        home_score = result.get("home_score")
        away_score = result.get("away_score")
        playoff_round = result.get("playoff_round")
        print(f"Processing result: game_id={game_id}, home_score={home_score}, away_score={away_score}, playoff_round={playoff_round}")
        game = Game.query.get(game_id)
        if not game or game.season_id != season_id:
            print(f"Game not found or season mismatch: game_id={game_id}, season_id={season_id}")
            continue
        print(f"Found game: id={game.game_id}, round={game.playoff_round}, home_score={game.home_score}, away_score={game.away_score}")
        game.home_score = home_score
        game.away_score = away_score
        if playoff_round:
            game.playoff_round = playoff_round
        print(f"Updated game: id={game.game_id}, round={game.playoff_round}, home_score={game.home_score}, away_score={game.away_score}")
        modified_rounds.add(game.playoff_round)
    
    print(f"Modified rounds: {modified_rounds}")
    
    # Commit the score updates first
    db.session.commit()
    
    # Refresh the games list to get the updated scores
    games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    
    # Also refresh the session to ensure we have the latest data
    db.session.expire_all()
    
    print("Games after score updates:")
    for game in games:
        print(f"  Game {game.game_id}: {game.home_team_id} vs {game.away_team_id}, {game.home_score}-{game.away_score}, round={game.playoff_round}")
    
    # Clear downstream games for all modified rounds
    def clear_downstream_games(changed_round):
        round_order = ['First Round', 'Quarterfinals', 'Semifinals', 'Championship']
        try:
            changed_idx = round_order.index(changed_round)
            # Only clear rounds that come AFTER the changed round
            downstream_rounds = round_order[changed_idx + 1:]
            print(f"Clearing downstream rounds for {changed_round}: {downstream_rounds}")
            for round_name in downstream_rounds:
                for g in games:
                    if g.playoff_round == round_name:
                        print(f"Clearing game {g.game_id} in {round_name}")
                        if round_name == 'Quarterfinals':
                            # Only clear away_team_id and scores for QF, keep home_team_id (seeds 1-4)
                            g.away_team_id = None
                            g.home_score = None
                            g.away_score = None
                        else:
                            g.home_team_id = None
                            g.away_team_id = None
                            g.home_score = None
                            g.away_score = None
        except ValueError:
            pass
    
    # Check each round for completion and implement reseeding
    round_order = ['First Round', 'Quarterfinals', 'Semifinals', 'Championship']
    
    for i in range(len(round_order) - 1):
        current_round = round_order[i]
        next_round = round_order[i + 1]
        
        # Get all games in current round
        current_round_games = [g for g in games if g.playoff_round == current_round]
        next_round_games = [g for g in games if g.playoff_round == next_round]
        
        # Check if all games in current round are complete
        all_complete = all(g.home_score is not None and g.away_score is not None 
                          and g.home_team_id is not None and g.away_team_id is not None 
                          for g in current_round_games)
        
        print(f"Round {current_round}: {len(current_round_games)} games, all_complete={all_complete}")
        
        # Debug each game in the current round
        for g in current_round_games:
            print(f"  Game {g.game_id}: home_team_id={g.home_team_id}, away_team_id={g.away_team_id}, home_score={g.home_score}, away_score={g.away_score}")
            game_complete = (g.home_score is not None and g.away_score is not None 
                           and g.home_team_id is not None and g.away_team_id is not None)
            print(f"    Game complete: {game_complete}")
        
        # If round is complete, implement reseeding logic
        if all_complete and current_round in modified_rounds:
            # If the next round has already started (any score recorded), we need to clear it
            next_round_started = any(
                (g.home_score is not None or g.away_score is not None) for g in next_round_games
            )

            if next_round_started:
                print(
                    f"Next round {next_round} already has recorded scores – clearing before reseeding"
                )
                clear_downstream_games(current_round)
                # Refresh the lists after the clear so we reseed using the cleared slate
                next_round_games = [g for g in games if g.playoff_round == next_round]

            print(
                f"All games in {current_round} complete, implementing reseeding for {next_round}"
            )
            
            # Get the seed mapping for teams
            seed_mapping = {}
            
            # For First Round, we need to get the original seeds from the bracket setup
            if current_round == 'First Round':
                # First Round seeds: 5,6,7,8 vs 12,11,10,9
                first_round_seeds = [5, 6, 7, 8, 12, 11, 10, 9]
                for i, g in enumerate(current_round_games):
                    if g.home_team_id:
                        seed_mapping[g.home_team_id] = first_round_seeds[i]
                    if g.away_team_id:
                        seed_mapping[g.away_team_id] = first_round_seeds[i + 4]
            
            # For Quarterfinals, we need to get the original seeds from the initial bracket setup
            elif current_round == 'Quarterfinals':
                # We need to reconstruct the original seeds for all teams
                # First, get the original bracket structure to map team_ids to their original seeds
                all_games = (
                    Game.query.filter_by(season_id=season_id, game_type="Playoff")
                    .order_by(Game.week.asc(), Game.game_id.asc())
                    .all()
                )
                
                # Reconstruct original seeds from the bracket setup
                # First Round: 5,6,7,8 vs 12,11,10,9
                first_round_games = [g for g in all_games if g.playoff_round == 'First Round']
                first_round_seeds = [5, 6, 7, 8, 12, 11, 10, 9]
                for i, g in enumerate(first_round_games):
                    if g.home_team_id:
                        seed_mapping[g.home_team_id] = first_round_seeds[i]
                    if g.away_team_id:
                        seed_mapping[g.away_team_id] = first_round_seeds[i + 4]
                
                # Quarterfinals home teams: 1,2,3,4
                quarterfinal_games = [g for g in all_games if g.playoff_round == 'Quarterfinals']
                for i, g in enumerate(quarterfinal_games):
                    if g.home_team_id:
                        seed_mapping[g.home_team_id] = i + 1  # Seeds 1-4
            
            # For Semifinals, we need to determine seeds based on previous round performance
            elif current_round == 'Semifinals':
                # We need to reconstruct the original seeds for all teams
                # First, get the original bracket structure to map team_ids to their original seeds
                all_games = (
                    Game.query.filter_by(season_id=season_id, game_type="Playoff")
                    .order_by(Game.week.asc(), Game.game_id.asc())
                    .all()
                )
                
                # Reconstruct original seeds from the bracket setup
                # First Round: 5,6,7,8 vs 12,11,10,9
                first_round_games = [g for g in all_games if g.playoff_round == 'First Round']
                first_round_seeds = [5, 6, 7, 8, 12, 11, 10, 9]
                for i, g in enumerate(first_round_games):
                    if g.home_team_id:
                        seed_mapping[g.home_team_id] = first_round_seeds[i]
                    if g.away_team_id:
                        seed_mapping[g.away_team_id] = first_round_seeds[i + 4]
                
                # Quarterfinals home teams: 1,2,3,4
                quarterfinal_games = [g for g in all_games if g.playoff_round == 'Quarterfinals']
                for i, g in enumerate(quarterfinal_games):
                    if g.home_team_id:
                        seed_mapping[g.home_team_id] = i + 1  # Seeds 1-4

            # Get winners with their seeds
            winners = []
            for g in current_round_games:
                if g.home_score > g.away_score:
                    winner_id = g.home_team_id
                else:
                    winner_id = g.away_team_id
                
                winner_seed = seed_mapping.get(winner_id, 999)  # Default high seed for unknown teams
                winners.append((winner_seed, winner_id))
            
            # Sort winners by seed (best seed first)
            winners.sort(key=lambda x: x[0])
            
            # Special handling for First Round to Quarterfinals transition
            if current_round == 'First Round' and next_round == 'Quarterfinals':
                # Seeds 1-4 automatically advance to quarterfinals
                # They should already be assigned as home teams in the bracket
                # We just need to assign the winners from first round as away teams
                
                # Map first round winners to quarterfinal away slots
                # QF1: 1 vs Winner G4, QF2: 2 vs Winner G3, QF3: 3 vs Winner G2, QF4: 4 vs Winner G1
                if len(next_round_games) >= 4 and len(winners) >= 4:
                    next_round_games[0].away_team_id = winners[3][1]  # QF1: 1 vs Winner G4 (worst seed)
                    next_round_games[1].away_team_id = winners[2][1]  # QF2: 2 vs Winner G3
                    next_round_games[2].away_team_id = winners[1][1]  # QF3: 3 vs Winner G2
                    next_round_games[3].away_team_id = winners[0][1]  # QF4: 4 vs Winner G1 (best seed)
            
            # Special handling for Semifinals to Championship transition
            elif current_round == 'Semifinals' and next_round == 'Championship':
                # For Championship, assign as many winners as possible
                print(f"Championship seeding logic: {len(next_round_games)} championship games, {len(winners)} winners")
                if len(next_round_games) >= 1:
                    if len(winners) == 1:
                        # Only one semifinal complete, assign that team as home
                        next_round_games[0].home_team_id = winners[0][1]
                        next_round_games[0].away_team_id = None
                        next_round_games[0].home_score = None
                        next_round_games[0].away_score = None
                        print(f"Championship partial seed: {winners[0][1]} (seed {winners[0][0]}) vs None")
                    elif len(winners) >= 2:
                        # Both semifinals complete, assign both
                        next_round_games[0].home_team_id = winners[0][1]  # Best seed (home)
                        next_round_games[0].away_team_id = winners[1][1]  # Worst seed (away)
                        next_round_games[0].home_score = None
                        next_round_games[0].away_score = None
                        print(f"Championship seeded: {winners[0][1]} (seed {winners[0][0]}) vs {winners[1][1]} (seed {winners[1][0]})")
                    # else: no winners yet, do nothing
                else:
                    print(f"Championship seeding failed: not enough games ({len(next_round_games)}) or winners ({len(winners)})")
            
            # For other rounds, implement best vs worst seeding
            else:
                num_games = len(next_round_games)
                num_winners = len(winners)
                
                for i in range(min(num_games, num_winners // 2)):
                    # Best seed vs worst seed
                    best_seed, best_team = winners[i]
                    worst_seed, worst_team = winners[-(i + 1)]
                    
                    next_round_games[i].home_team_id = best_team
                    next_round_games[i].away_team_id = worst_team
                    
                    # Clear scores for the new matchups
                    next_round_games[i].home_score = None
                    next_round_games[i].away_score = None
        
        # Only clear downstream games if the current round was modified AND is incomplete
        elif current_round in modified_rounds and not all_complete:
            print(f"Clearing downstream games for incomplete modified round: {current_round}")
            clear_downstream_games(current_round)
            
            # Debug: check what happened to the scores after clearing
            print(f"After clearing downstream games for {current_round}:")
            for g in current_round_games:
                print(f"  Game {g.game_id}: home_score={g.home_score}, away_score={g.away_score}")
    
    # Debug: print final state of all games before final commit
    print("Final state before commit:")
    for game in games:
        print(f"  Game {game.game_id}: {game.home_team_id} vs {game.away_team_id}, {game.home_score}-{game.away_score}, round={game.playoff_round}")
    
    db.session.commit()
    return jsonify({"message": "Batch playoff results updated and reseeding applied"}), 200
