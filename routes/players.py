from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Player, PlayerSeason, Team, Season, AwardWinner, HonorWinner, Award, Honor

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
        'awards': current_ps.awards if current_ps else None,
        'ovr_rating': current_ps.ovr_rating if current_ps else None
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
def add_or_update_player_season(player_id):
    data = request.json
    season_id = data.get('season_id')
    team_id = data.get('team_id')
    ovr_rating = data.get('ovr_rating')
    current_year = data.get('current_year', 'FR')
    if not all([season_id, team_id, ovr_rating]):
        return jsonify({'error': 'Missing required fields'}), 400

    # Try to find an existing PlayerSeason
    player_season = PlayerSeason.query.filter_by(
        player_id=player_id,
        season_id=season_id,
        team_id=team_id
    ).first()

    if player_season:
        player_season.ovr_rating = ovr_rating
        player_season.player_class = current_year
        # update other fields if needed
    else:
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
    result = [
        {
            'player_id': ps.player_id,
            'name': player.name,
            'position': player.position,
            'current_year': ps.current_year,
            'dev_trait': ps.dev_trait,
            'height': ps.height,
            'weight': ps.weight,
            'state': player.state,
            'recruit_stars': player.recruit_stars,
            'redshirted': ps.redshirted,
            'has_ever_redshirted': db.session.query(PlayerSeason.redshirted).filter(
                PlayerSeason.player_id == ps.player_id,
                PlayerSeason.redshirted == True
            ).count() > 0,
            'ovr_rating': ps.ovr_rating,
            'player_class': ps.player_class,
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
        for ps, player in query.all()
    ]
    return jsonify(result)

@players_bp.route('/players/<int:player_id>/career', methods=['GET'])
def get_player_career(player_id):
    from models import PlayerSeason, Team, Season
    # Join PlayerSeason with Team and Season to get team names and season years
    season_team_query = (
        db.session.query(PlayerSeason, Team.name, Season.year)
        .join(Team, PlayerSeason.team_id == Team.team_id)
        .join(Season, PlayerSeason.season_id == Season.season_id)
        .filter(PlayerSeason.player_id == player_id)
        .order_by(PlayerSeason.season_id)
    )
    seasons = [ps for ps, _, _ in season_team_query]
    team_names = {ps.player_season_id: team_name for ps, team_name, _ in season_team_query}
    season_years = {ps.player_season_id: year for ps, _, year in season_team_query}
    if not seasons:
        return jsonify([])

    # Aggregate sums and maxes
    def sum_stat(attr):
        return sum(getattr(ps, attr) or 0 for ps in seasons)
    def max_stat(attr):
        return max((getattr(ps, attr) or 0) for ps in seasons)
    def safe_div(n, d):
        if n is None or d is None or d == 0:
            return 0
        return n / d

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
                'season_year': season_years.get(ps.player_season_id),
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

    # Determine if each player previously redshirted before the current season
    prior_rs_lookup = {
        p.player_id: (
            PlayerSeason.query.filter(
                PlayerSeason.player_id == p.player_id,
                PlayerSeason.redshirted == True,
                PlayerSeason.season_id < current_season.season_id,
            ).count()
            > 0
        )
        for p, _ in results
    }
    
    return jsonify([
        {
            'player_id': p.player_id,
            'name': p.name,
            'position': p.position,
            'team_id': p.team_id,
            'class': ps.current_year,
            'ovr_rating': ps.ovr_rating,
            'redshirted': ps.redshirted and prior_rs_lookup.get(p.player_id, False),
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

@players_bp.route('/players/<int:player_id>/seasons/<int:season_id>/stats', methods=['PUT'])
def update_player_season_stats(player_id, season_id):
    data = request.json
    player_season = PlayerSeason.query.filter_by(
        player_id=player_id,
        season_id=season_id
    ).first()
    
    if not player_season:
        return jsonify({'error': 'PlayerSeason not found'}), 404
    
    # Update all the stats that can be modified
    stat_fields = [
        'ovr_rating', 'games_played', 'completions', 'attempts', 'pass_yards', 
        'pass_tds', 'interceptions', 'rush_attempts', 'rush_yards', 'rush_tds',
        'longest_rush', 'rush_fumbles', 'receptions', 'rec_yards', 'rec_tds',
        'longest_rec', 'rec_drops', 'tackles', 'tfl', 'sacks', 'forced_fumbles',
        'def_tds', 'awards'
    ]
    
    for field in stat_fields:
        if field in data:
            setattr(player_season, field, data[field])
    
    db.session.commit()
    return jsonify({'message': 'Player season stats updated'})

@players_bp.route('/players/<int:player_id>/profile', methods=['PATCH'])
def update_player_profile(player_id):
    data = request.json
    # Find the most recent season for this player
    current_season = Season.query.order_by(Season.year.desc()).first()
    if not current_season:
        return jsonify({'error': 'No current season found'}), 404
    ps = PlayerSeason.query.filter_by(player_id=player_id, season_id=current_season.season_id).first()
    if not ps:
        return jsonify({'error': 'PlayerSeason not found for current season'}), 404
    updated = False
    for field in ['height', 'weight', 'dev_trait']:
        if field in data:
            setattr(ps, field, data[field])
            updated = True
    if updated:
        db.session.commit()
        return jsonify({'message': 'Player profile updated'})
    else:
        return jsonify({'error': 'No valid fields to update'}), 400

@players_bp.route('/seasons/<int:season_id>/players', methods=['GET'])
def get_all_players_for_season(season_id):
    # Join PlayerSeason, Player, and Team to get all players for the season with team info
    query = (
        db.session.query(Player.player_id, Player.name, Player.position, Team.team_id, Team.name.label('team_name'))
        .join(PlayerSeason, Player.player_id == PlayerSeason.player_id)
        .join(Team, PlayerSeason.team_id == Team.team_id)
        .filter(PlayerSeason.season_id == season_id)
    )
    players = [
        {
            'player_id': player_id,
            'name': name,
            'position': position,
            'team_id': team_id,
            'team_name': team_name
        }
        for player_id, name, position, team_id, team_name in query.all()
    ]
    return jsonify(players)

@players_bp.route('/players/<int:player_id>/awards', methods=['GET'])
def get_player_awards(player_id):
    """Get all awards won by a player"""
    award_winners = AwardWinner.query.filter_by(player_id=player_id).all()
    
    result = []
    for aw in award_winners:
        award = Award.query.get(aw.award_id)
        team = Team.query.get(aw.team_id)
        season = Season.query.get(aw.season_id)
        
        result.append({
            'award_winner_id': aw.award_winner_id,
            'award_name': award.name if award else None,
            'award_description': award.description if award else None,
            'team_name': team.name if team else None,
            'season_year': season.year if season else None,
            'season_id': aw.season_id
        })
    
    return jsonify(result)

@players_bp.route('/players/<int:player_id>/honors', methods=['GET'])
def get_player_honors(player_id):
    """Get all honors won by a player"""
    honor_winners = HonorWinner.query.filter_by(player_id=player_id).all()
    
    result = []
    for hw in honor_winners:
        honor = Honor.query.get(hw.honor_id)
        team = Team.query.get(hw.team_id)
        season = Season.query.get(hw.season_id)
        
        result.append({
            'honor_winner_id': hw.honor_winner_id,
            'honor_name': honor.name if honor else None,
            'honor_side': honor.side if honor else None,
            'team_name': team.name if team else None,
            'season_year': season.year if season else None,
            'season_id': hw.season_id,
            'week': hw.week
        })
    
    return jsonify(result)

@players_bp.route('/players/<int:player_id>/rating-development', methods=['GET'])
def get_player_rating_development(player_id):
    player = Player.query.get_or_404(player_id)
    
    # Get all player seasons for this player, ordered by year
    player_seasons = db.session.query(
        PlayerSeason.player_season_id,
        PlayerSeason.ovr_rating,
        PlayerSeason.current_year,
        PlayerSeason.redshirted,
        Season.year.label('season_year'),
        Team.name.label('team_name')
    ).join(
        Season, PlayerSeason.season_id == Season.season_id
    ).join(
        Team, PlayerSeason.team_id == Team.team_id
    ).filter(
        PlayerSeason.player_id == player_id
    ).order_by(
        Season.year.asc()
    ).all()
    
    # Prepare data for the chart
    chart_data = []
    for ps in player_seasons:
        chart_data.append({
            "season_year": ps.season_year,
            "ovr_rating": ps.ovr_rating,
            "current_year": ps.current_year,
            "redshirted": ps.redshirted,
            "team_name": ps.team_name
        })
    
    return jsonify({
        "player_name": player.name,
        "chart_data": chart_data
    }) 