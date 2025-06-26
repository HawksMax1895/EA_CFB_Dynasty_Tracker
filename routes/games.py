from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Game, TeamSeason, Conference, Team

games_bp = Blueprint('games', __name__)

@games_bp.route('/seasons/<int:season_id>/games', methods=['GET'])
def get_games_in_season(season_id):
    game_type = request.args.get('type', 'regular')
    query = Game.query.filter_by(season_id=season_id)

    if game_type == 'regular':
        query = query.filter(Game.game_type != 'Playoff')
    elif game_type == 'playoff':
        query = query.filter_by(game_type='Playoff')

    games = query.order_by(Game.week.asc()).all()
    teams = {t.team_id: t for t in Team.query.all()}
    team_seasons = {
        ts.team_id: ts
        for ts in TeamSeason.query.filter_by(season_id=season_id).all()
    }

    result = []
    for g in games:
        home_ts = team_seasons.get(g.home_team_id)
        away_ts = team_seasons.get(g.away_team_id)
        is_conf_game = (
            home_ts is not None
            and away_ts is not None
            and home_ts.conference_id == away_ts.conference_id
        )
        result.append({
            'game_id': g.game_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'home_team_name': teams.get(g.home_team_id).name if teams.get(g.home_team_id) else None,
            'away_team_id': g.away_team_id,
            'away_team_name': teams.get(g.away_team_id).name if teams.get(g.away_team_id) else None,
            'home_score': g.home_score,
            'away_score': g.away_score,
            'game_type': g.game_type,
            'playoff_round': g.playoff_round,
            'overtime': g.overtime,
            'is_conference_game': is_conf_game,
        })

    return jsonify(result)

@games_bp.route('/games/<int:game_id>', methods=['GET'])
def get_game(game_id):
    game = Game.query.get_or_404(game_id)
    return jsonify({
        'game_id': game.game_id,
        'season_id': game.season_id,
        'week': game.week,
        'home_team_id': game.home_team_id,
        'away_team_id': game.away_team_id,
        'home_score': game.home_score,
        'away_score': game.away_score,
        'game_type': game.game_type,
        'playoff_round': game.playoff_round,
        'overtime': game.overtime
    })

@games_bp.route('/games', methods=['POST'])
def create_game():
    data = request.json
    season_id = data.get('season_id')
    week = data.get('week')
    home_team_id = data.get('home_team_id')
    away_team_id = data.get('away_team_id')
    if not all([season_id, week, home_team_id, away_team_id]):
        return jsonify({'error': 'Missing required fields'}), 400
    game = Game(season_id=season_id, week=week, home_team_id=home_team_id, away_team_id=away_team_id)
    db.session.add(game)
    db.session.commit()
    return jsonify({'game_id': game.game_id}), 201

@games_bp.route('/games/<int:game_id>', methods=['PUT'])
def update_game(game_id):
    game = Game.query.get_or_404(game_id)
    data = request.json
    game.home_score = data.get('home_score', game.home_score)
    game.away_score = data.get('away_score', game.away_score)
    game.home_team_id = data.get('home_team_id', game.home_team_id)
    game.away_team_id = data.get('away_team_id', game.away_team_id)
    game.game_type = data.get('game_type', game.game_type)
    game.playoff_round = data.get('playoff_round', game.playoff_round)
    game.overtime = data.get('overtime', game.overtime)
    db.session.commit()

    # --- NEW: Update TeamSeason records for both teams ---
    season_id = game.season_id
    home_team_id = game.home_team_id
    away_team_id = game.away_team_id

    # Get all games for this season involving either team
    all_games = Game.query.filter(
        Game.season_id == season_id,
        ((Game.home_team_id == home_team_id) | (Game.away_team_id == home_team_id) |
         (Game.home_team_id == away_team_id) | (Game.away_team_id == away_team_id))
    ).all()

    # Prefetch TeamSeason records for teams appearing in these games to avoid
    # repeated DB queries when recalculating records
    involved_team_ids = {g.home_team_id for g in all_games} | {g.away_team_id for g in all_games}
    team_seasons = {
        ts.team_id: ts
        for ts in TeamSeason.query.filter_by(season_id=season_id)
        .filter(TeamSeason.team_id.in_(involved_team_ids))
        .all()
    }

    # Helper to recalculate record and scoring stats for a team
    def recalc_record(team_id):
        wins = losses = conf_wins = conf_losses = 0
        points_for = points_against = games_played = 0
        for g in all_games:
            # Only count games with valid scores and not bye weeks
            if g.home_score is None or g.away_score is None or g.game_type == 'Bye Week':
                continue
            # Determine if this team is home or away
            is_home = g.home_team_id == team_id
            is_away = g.away_team_id == team_id
            if not (is_home or is_away):
                continue
            # Win/loss logic
            team_score = g.home_score if is_home else g.away_score
            opp_score = g.away_score if is_home else g.home_score
            if team_score > opp_score:
                wins += 1
            elif team_score < opp_score:
                losses += 1

            # Points for/against
            points_for += team_score
            points_against += opp_score
            games_played += 1
            # Conference win/loss: only if both teams are in the same conference
            if g.home_team_id and g.away_team_id:
                home_ts = team_seasons.get(g.home_team_id)
                away_ts = team_seasons.get(g.away_team_id)
                if home_ts and away_ts and home_ts.conference_id and away_ts.conference_id and home_ts.conference_id == away_ts.conference_id:
                    if is_home and g.home_score > g.away_score:
                        conf_wins += 1
                    elif is_home and g.home_score < g.away_score:
                        conf_losses += 1
                    elif is_away and g.away_score > g.home_score:
                        conf_wins += 1
                    elif is_away and g.away_score < g.home_score:
                        conf_losses += 1
        ts = team_seasons.get(team_id)
        if ts:
            ts.wins = wins
            ts.losses = losses
            ts.conference_wins = conf_wins
            ts.conference_losses = conf_losses
            ts.points_for = points_for
            ts.points_against = points_against
            ts.off_ppg = round(points_for / games_played, 1) if games_played else None
            ts.def_ppg = round(points_against / games_played, 1) if games_played else None
            db.session.add(ts)

    recalc_record(home_team_id)
    recalc_record(away_team_id)
    db.session.commit()
    # --- END NEW ---

    return jsonify({'game_id': game.game_id})

@games_bp.route('/games/<int:game_id>/details', methods=['GET'])
def get_game_details(game_id):
    game = Game.query.get_or_404(game_id)
    # Placeholder: per-game player stats not modeled, so just return game info
    return jsonify({
        'game_id': game.game_id,
        'season_id': game.season_id,
        'week': game.week,
        'home_team_id': game.home_team_id,
        'away_team_id': game.away_team_id,
        'home_score': game.home_score,
        'away_score': game.away_score,
        'game_type': game.game_type,
        'playoff_round': game.playoff_round,
        'overtime': game.overtime
    })

@games_bp.route('/games', methods=['GET'])
def get_all_games():
    games = Game.query.all()
    return jsonify([
        {
            'game_id': g.game_id,
            'season_id': g.season_id,
            'week': g.week,
            'home_team_id': g.home_team_id,
            'away_team_id': g.away_team_id,
            'home_score': g.home_score,
            'away_score': g.away_score,
            'game_type': g.game_type,
            'playoff_round': g.playoff_round,
            'neutral_site': g.neutral_site,
            'overtime': g.overtime
        }
        for g in games
    ]) 