from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Player, PlayerSeason, Team, Season

players_bp = Blueprint('players', __name__)

@players_bp.route('/players/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = Player.query.get_or_404(player_id)
    # Get the most recent PlayerSeason to get current class and dynamic info
    current_season = Season.query.order_by(Season.year.desc()).first()
    current_ps = None
    if current_season:
        current_ps = PlayerSeason.query.filter_by(
            player_id=player.player_id, 
            season_id=current_season.season_id
        ).first()
    return jsonify({
        'player_id': player.player_id,
        'name': player.name,
        'position': player.position,
        'team_id': player.team_id,
        'class': current_ps.current_year if current_ps else None,
        'dev_trait': current_ps.dev_trait if current_ps else None,
        'height': current_ps.height if current_ps else None,
        'weight': current_ps.weight if current_ps else None,
        'state': player.state,
        'recruit_stars': player.recruit_stars,
        'awards': current_ps.awards if current_ps else None
    })

@players_bp.route('/teams/<int:team_id>/players', methods=['POST'])
def add_player_to_team(team_id):
    data = request.json
    name = data.get('name')
    position = data.get('position')
    ovr_rating = data.get('ovr_rating')
    season_id = data.get('season_id')
    current_year = data.get('current_year', 'FR')
    
    # Additional player stats
    recruit_stars = data.get('recruit_stars', 3)
    speed = data.get('speed', 70)
    dev_trait = data.get('dev_trait', 'Normal')
    height = data.get('height', '')
    weight = data.get('weight', 200)
    state = data.get('state', '')
    
    if not all([name, position, ovr_rating, season_id]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    player = Player(
        name=name, 
        position=position, 
        team_id=team_id,
        recruit_stars=recruit_stars,
        state=state
    )
    db.session.add(player)
    db.session.commit()
    
    player_season = PlayerSeason(
        player_id=player.player_id,
        season_id=season_id,
        team_id=team_id,
        ovr_rating=ovr_rating,
        player_class=current_year,
        current_year=current_year,
        redshirted=False,
        speed=speed,
        dev_trait=dev_trait,
        weight=weight,
        height=height
    )
    db.session.add(player_season)
    db.session.commit()
    return jsonify({'player_id': player.player_id, 'name': player.name, 'position': player.position}), 201

@players_bp.route('/players/<int:player_id>/seasons', methods=['POST'])
def add_player_season(player_id):
    data = request.json
    season_id = data.get('season_id')
    team_id = data.get('team_id')
    ovr_rating = data.get('ovr_rating')
    current_year = data.get('current_year', 'FR')
    if not all([season_id, team_id, ovr_rating]):
        return jsonify({'error': 'Missing required fields'}), 400
    player_season = PlayerSeason(
        player_id=player_id, 
        season_id=season_id, 
        team_id=team_id, 
        ovr_rating=ovr_rating, 
        player_class=current_year,
        current_year=current_year,
        redshirted=False
    )
    db.session.add(player_season)
    db.session.commit()
    return jsonify({'player_season_id': player_season.player_season_id}), 201

@players_bp.route('/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    player = Player.query.get_or_404(player_id)
    db.session.delete(player)
    db.session.commit()
    return jsonify({'message': 'Player deleted'})

@players_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/players', methods=['GET'])
def get_team_roster_for_season(season_id, team_id):
    # Join PlayerSeason with Player to fetch player info in a single query
    query = (
        db.session.query(PlayerSeason, Player)
        .join(Player, PlayerSeason.player_id == Player.player_id)
        .filter(PlayerSeason.season_id == season_id, PlayerSeason.team_id == team_id)
    )

    return jsonify([
        {
            'player_id': ps.player_id,
            'name': player.name,
            'position': player.position,
            'class': ps.player_class,
            'ovr_rating': ps.ovr_rating
        }
        for ps, player in query.all()
    ])

@players_bp.route('/players/<int:player_id>/career', methods=['GET'])
def get_player_career(player_id):
    from models import PlayerSeason, Team
    # Join PlayerSeason with Team to get team names
    season_team_query = (
        db.session.query(PlayerSeason, Team.name)
        .join(Team, PlayerSeason.team_id == Team.team_id)
        .filter(PlayerSeason.player_id == player_id)
        .order_by(PlayerSeason.season_id)
    )
    seasons = [ps for ps, _ in season_team_query]
    team_names = {ps.player_season_id: team_name for ps, team_name in season_team_query}
    if not seasons:
        return jsonify([])

    # Aggregate sums and maxes
    def sum_stat(attr):
        return sum(getattr(ps, attr) or 0 for ps in seasons)
    def max_stat(attr):
        return max((getattr(ps, attr) or 0) for ps in seasons)
    def safe_div(n, d):
        return n / d if d else 0

    games_played = sum_stat('games_played')
    completions = sum_stat('completions')
    attempts = sum_stat('attempts')
    pass_yards = sum_stat('pass_yards')
    pass_tds = sum_stat('pass_tds')
    interceptions = sum_stat('interceptions')
    rush_attempts = sum_stat('rush_attempts')
    rush_yards = sum_stat('rush_yards')
    rush_tds = sum_stat('rush_tds')
    rush_fumbles = sum_stat('rush_fumbles')
    longest_rush = max_stat('longest_rush')
    receptions = sum_stat('receptions')
    rec_yards = sum_stat('rec_yards')
    rec_tds = sum_stat('rec_tds')
    rec_drops = sum_stat('rec_drops')
    longest_rec = max_stat('longest_rec')
    tackles = sum_stat('tackles')
    tfl = sum_stat('tfl')
    sacks = sum_stat('sacks')
    forced_fumbles = sum_stat('forced_fumbles')
    def_tds = sum_stat('def_tds')

    # Averages and percentages
    completion_pct = safe_div(completions, attempts) * 100 if attempts else 0
    pass_yds_per_game = safe_div(pass_yards, games_played)
    rush_yds_per_game = safe_div(rush_yards, games_played)
    rec_yds_per_game = safe_div(rec_yards, games_played)
    tackles_per_game = safe_div(tackles, games_played)

    return jsonify({
        'career_totals': {
            'games_played': games_played,
            'completions': completions,
            'attempts': attempts,
            'completion_pct': round(completion_pct, 1),
            'pass_yards': pass_yards,
            'pass_tds': pass_tds,
            'interceptions': interceptions,
            'pass_yds_per_game': round(pass_yds_per_game, 1),
            'rush_attempts': rush_attempts,
            'rush_yards': rush_yards,
            'rush_tds': rush_tds,
            'rush_fumbles': rush_fumbles,
            'longest_rush': longest_rush,
            'rush_yds_per_game': round(rush_yds_per_game, 1),
            'receptions': receptions,
            'rec_yards': rec_yards,
            'rec_tds': rec_tds,
            'rec_drops': rec_drops,
            'longest_rec': longest_rec,
            'rec_yds_per_game': round(rec_yds_per_game, 1),
            'tackles': tackles,
            'tfl': tfl,
            'sacks': sacks,
            'forced_fumbles': forced_fumbles,
            'def_tds': def_tds,
            'tackles_per_game': round(tackles_per_game, 1)
        },
        'seasons': [
            {
                'season_id': ps.season_id,
                'team_id': ps.team_id,
                'team_name': team_names.get(ps.player_season_id),
                'class': ps.player_class,
                'ovr_rating': ps.ovr_rating,
                'games_played': ps.games_played,
                'completions': ps.completions,
                'attempts': ps.attempts,
                'completion_pct': round(safe_div(ps.completions, ps.attempts) * 100, 1) if ps.attempts else 0,
                'pass_yards': ps.pass_yards,
                'pass_tds': ps.pass_tds,
                'interceptions': ps.interceptions,
                'pass_yds_per_game': round(safe_div(ps.pass_yards, ps.games_played), 1) if ps.games_played else 0,
                'rush_attempts': ps.rush_attempts,
                'rush_yards': ps.rush_yards,
                'rush_tds': ps.rush_tds,
                'rush_fumbles': ps.rush_fumbles,
                'longest_rush': ps.longest_rush,
                'rush_yds_per_game': round(safe_div(ps.rush_yards, ps.games_played), 1) if ps.games_played else 0,
                'receptions': ps.receptions,
                'rec_yards': ps.rec_yards,
                'rec_tds': ps.rec_tds,
                'rec_drops': ps.rec_drops,
                'longest_rec': ps.longest_rec,
                'rec_yds_per_game': round(safe_div(ps.rec_yards, ps.games_played), 1) if ps.games_played else 0,
                'tackles': ps.tackles,
                'tfl': ps.tfl,
                'sacks': ps.sacks,
                'forced_fumbles': ps.forced_fumbles,
                'def_tds': ps.def_tds,
                'tackles_per_game': round(safe_div(ps.tackles, ps.games_played), 1) if ps.games_played else 0
            }
            for ps in seasons
        ]
    })

@players_bp.route('/players/<int:player_id>/redshirt', methods=['POST'])
def set_redshirt(player_id):
    from models import PlayerSeason
    data = request.json
    season_id = data.get('season_id')
    redshirted = data.get('redshirted', False)
    if season_id is None:
        return jsonify({'error': 'Missing season_id'}), 400
    # Prevent redshirting more than once
    if redshirted:
        already_redshirted = PlayerSeason.query.filter_by(player_id=player_id, redshirted=True).count() > 0
        if already_redshirted:
            return jsonify({'error': 'Player has already used their redshirt'}), 400
    ps = PlayerSeason.query.filter_by(player_id=player_id, season_id=season_id).first()
    if not ps:
        return jsonify({'error': 'PlayerSeason not found'}), 404
    ps.redshirted = redshirted
    db.session.commit()
    return jsonify({'player_id': player_id, 'redshirted': ps.redshirted})

@players_bp.route('/players', methods=['GET'])
def get_all_players():
    # Get the current season (you might want to make this configurable)
    current_season = Season.query.order_by(Season.year.desc()).first()
    print(f"[DEBUG] Current season: {current_season}")
    if not current_season:
        print("[DEBUG] No current season found.")
        return jsonify([])
    
    # Get team_id from query params (default to team 1 for now)
    team_id = request.args.get('team_id', type=int, default=1)
    print(f"[DEBUG] team_id: {team_id}")
    
    # Only return players who are on the current roster (have PlayerSeason records)
    query = (
        db.session.query(Player, PlayerSeason)
        .join(PlayerSeason, Player.player_id == PlayerSeason.player_id)
        .filter(
            PlayerSeason.season_id == current_season.season_id,
            PlayerSeason.team_id == team_id
        )
    )
    print(f"[DEBUG] Query SQL: {str(query.statement.compile(compile_kwargs={'literal_binds': True}))}")
    results = query.all()
    print(f"[DEBUG] Number of players found: {len(results)}")
    
    return jsonify([
        {
            'player_id': p.player_id,
            'name': p.name,
            'position': p.position,
            'team_id': p.team_id,
            'class': ps.current_year,
            'ovr_rating': ps.ovr_rating,
            'redshirted': ps.redshirted,
            'recruit_stars': p.recruit_stars,
            'dev_trait': ps.dev_trait,
            'height': ps.height,
            'weight': ps.weight,
            'state': p.state,
            'pass_yards': ps.pass_yards,
            'pass_tds': ps.pass_tds,
            'rush_yards': ps.rush_yards,
            'rush_tds': ps.rush_tds,
            'rec_yards': ps.rec_yards,
            'rec_tds': ps.rec_tds,
            'tackles': ps.tackles,
            'sacks': ps.sacks,
            'interceptions': ps.interceptions,
            'awards': ps.awards
        }
        for p, ps in results
    ]) 