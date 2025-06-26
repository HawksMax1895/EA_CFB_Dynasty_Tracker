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


playoff_bp = Blueprint("playoff", __name__)


@playoff_bp.route("/playoff/<int:season_id>/bracket", methods=["GET"])
def get_playoff_bracket(season_id):
    """Return the playoff bracket for a season."""
    games = (
        Game.query.filter_by(season_id=season_id, game_type="Playoff")
        .order_by(Game.week.asc(), Game.game_id.asc())
        .all()
    )
    return jsonify(_build_bracket(games))


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
    if not game_id or home_score is None or away_score is None:
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
    # Find index and round
    idx = None
    round_name = game.playoff_round
    for i, g in enumerate(games):
        if g.game_id == game_id:
            idx = i
            break
    if idx is None:
        return jsonify({"error": "Game not found in bracket"}), 404
    # Save old winner for propagation
    old_winner = None
    if game.home_score is not None and game.away_score is not None and game.home_team_id and game.away_team_id:
        old_winner = game.home_team_id if game.home_score > game.away_score else game.away_team_id
    # Update score
    game.home_score = home_score
    game.away_score = away_score
    if playoff_round:
        game.playoff_round = playoff_round
    # Determine new winner
    new_winner = None
    if game.home_team_id and game.away_team_id and home_score is not None and away_score is not None:
        new_winner = game.home_team_id if home_score > away_score else game.away_team_id

    # Helper: propagate winner recursively
    def propagate_winner(games, idx, round_name, new_winner, old_winner):
        next_map = {
            'First Round': ('Quarterfinals', [3, 2, 1, 0], 'away'),
            'Quarterfinals': ('Semifinals', [0, 1, 1, 0], ['home', 'home', 'away', 'away']),
            'Semifinals': ('Championship', [0, 0], ['home', 'away'])
        }
        if round_name not in next_map:
            return
        next_round, next_idxs, slots = next_map[round_name]
        if idx < 0 or idx >= len(next_idxs):
            print(f"[propagate_winner] idx {idx} out of range for round {round_name} (len={len(next_idxs)})")
            return
        next_idx = next_idxs[idx]
        slot = slots if isinstance(slots, str) else slots[idx]
        games_in_round = [x for x in games if x.playoff_round == next_round]
        if next_idx < len(games_in_round):
            next_game = games_in_round[next_idx]
            # Always clear the downstream slot first
            if slot == 'home':
                next_game.home_team_id = None
            elif slot == 'away':
                next_game.away_team_id = None
            next_game.home_score = None
            next_game.away_score = None
            # If the current game is complete and there is a new winner, set the downstream slot to the new winner
            if new_winner:
                if slot == 'home':
                    next_game.home_team_id = new_winner
                elif slot == 'away':
                    next_game.away_team_id = new_winner
            # Recursively propagate further, but only for clearing (not setting) downstream slots
            propagate_winner(games, next_idx, next_round, None, old_winner)

    # If the winner changed, propagate
    if old_winner != new_winner:
        propagate_winner(games, idx, game.playoff_round, new_winner, old_winner)
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
    print(f"Updated game: id={game.game_id}, home_score={game.home_score}, away_score={game.away_score}")  # Debug log
    return jsonify({"message": "Playoff result updated", "game_id": game_id}), 200


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
