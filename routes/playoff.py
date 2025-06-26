from flask import Blueprint, request, jsonify
from extensions import db
from models import Game

playoff_bp = Blueprint('playoff', __name__)

@playoff_bp.route('/playoff/<int:season_id>/bracket', methods=['POST'])
def create_or_update_bracket(season_id):
    data = request.json
    games = data.get('games', [])
    if not isinstance(games, list):
        return jsonify({'error': 'games must be a list'}), 400
    created_games = []
    for g in games:
        home_team_id = g.get('home_team_id')
        away_team_id = g.get('away_team_id')
        week = g.get('week')
        playoff_round = g.get('playoff_round')
        if not home_team_id or not away_team_id or not week or not playoff_round:
            continue
        game = Game(
            season_id=season_id,
            week=week,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            game_type='Playoff',
            playoff_round=playoff_round
        )
        db.session.add(game)
        db.session.flush()
        created_games.append(game.game_id)
    db.session.commit()
    return jsonify({'created_game_ids': created_games}), 201

@playoff_bp.route('/playoff/<int:season_id>/playoff-result', methods=['POST'])
def add_playoff_result(season_id):
    data = request.json
    game_id = data.get('game_id')
    home_score = data.get('home_score')
    away_score = data.get('away_score')
    playoff_round = data.get('playoff_round')
    if not game_id or home_score is None or away_score is None:
        return jsonify({'error': 'game_id, home_score, and away_score are required'}), 400
    from models import Game
    game = Game.query.get(game_id)
    if not game or game.season_id != season_id:
        return jsonify({'error': 'Game not found for this season'}), 404
    game.home_score = home_score
    game.away_score = away_score
    if playoff_round:
        game.playoff_round = playoff_round
    db.session.commit()
    return jsonify({'message': 'Playoff result updated', 'game_id': game_id}), 200

@playoff_bp.route('/playoff/<int:season_id>/seed_bracket', methods=['POST'])
def seed_bracket(season_id):
    from models import TeamSeason, Game
    # Get top 12 teams by final_rank (1-12)
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).filter(TeamSeason.final_rank != None).order_by(TeamSeason.final_rank.asc()).limit(12).all()
    if len(team_seasons) < 12:
        return jsonify({'error': 'Not enough teams with final_rank to seed bracket'}), 400
    # Map seed number to team_id
    seeds = {i+1: ts.team_id for i, ts in enumerate(team_seasons)}
    # Get all playoff games for this season, ordered by week and id
    games = Game.query.filter_by(season_id=season_id, game_type='Playoff').order_by(Game.week.asc(), Game.game_id.asc()).all()
    if len(games) != 11:
        return jsonify({'error': 'Bracket structure is incomplete'}), 400
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
    bracket = {}
    for g in games:
        round_name = g.playoff_round or 'Unknown'
        if round_name not in bracket:
            bracket[round_name] = []
        bracket[round_name].append({
            'game_id': g.game_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'away_team_id': g.away_team_id,
            'home_score': g.home_score,
            'away_score': g.away_score
        })
    return jsonify(bracket)

@playoff_bp.route('/playoff/<int:season_id>/playoff-eligible-teams', methods=['GET'])
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
            conf_teams_sorted = sorted(conf_teams, key=lambda ts: (ts.wins if ts.wins is not None else 0, -(ts.final_rank or 9999), -ts.team_id), reverse=True)
            champions[conf_id] = conf_teams_sorted[0].team_id
    result = []
    for ts in team_seasons:
        team = teams.get(ts.team_id)
        conf = conferences.get(ts.conference_id)
        result.append({
            'team_id': ts.team_id,
            'team_name': team.name if team else None,
            'final_rank': ts.final_rank,
            'conference_id': ts.conference_id,
            'conference_name': conf.name if conf else None,
            'is_conference_champion': ts.team_id == champions.get(ts.conference_id),
            'wins': ts.wins,
            'losses': ts.losses
        })
    return jsonify(result)

@playoff_bp.route('/playoff/<int:season_id>/manual-seed-bracket', methods=['POST'])
def manual_seed_bracket(season_id):
    from models import Game
    data = request.json
    team_ids = data.get('team_ids')
    if not isinstance(team_ids, list) or len(team_ids) != 12:
        return jsonify({'error': 'team_ids must be a list of 12 team IDs in seed order'}), 400
    # Get all playoff games for this season, ordered by week and id
    games = Game.query.filter_by(season_id=season_id, game_type='Playoff').order_by(Game.week.asc(), Game.game_id.asc()).all()
    if len(games) != 11:
        return jsonify({'error': 'Bracket structure is incomplete'}), 400
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
    bracket = {}
    for g in games:
        round_name = g.playoff_round or 'Unknown'
        if round_name not in bracket:
            bracket[round_name] = []
        bracket[round_name].append({
            'game_id': g.game_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'away_team_id': g.away_team_id,
            'home_score': g.home_score,
            'away_score': g.away_score
        })
    return jsonify(bracket) 