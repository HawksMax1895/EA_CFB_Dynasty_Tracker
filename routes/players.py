from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Player, PlayerSeason, Team, Season

players_bp = Blueprint('players', __name__)

@players_bp.route('/players/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = Player.query.get_or_404(player_id)
    # Get the most recent PlayerSeason to get current class info
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
        'drafted_year': player.drafted_year
    })

@players_bp.route('/teams/<int:team_id>/players', methods=['POST'])
def add_player_to_team(team_id):
    data = request.json
    name = data.get('name')
    position = data.get('position')
    ovr_rating = data.get('ovr_rating')
    season_id = data.get('season_id')
    current_year = data.get('current_year', 'FR')
    if not all([name, position, ovr_rating, season_id]):
        return jsonify({'error': 'Missing required fields'}), 400
    player = Player(name=name, position=position, team_id=team_id)
    db.session.add(player)
    db.session.commit()
    player_season = PlayerSeason(
        player_id=player.player_id,
        season_id=season_id,
        team_id=team_id,
        ovr_rating=ovr_rating,
        player_class=current_year,
        current_year=current_year,
        redshirted=False
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
    from models import PlayerSeason
    seasons = PlayerSeason.query.filter_by(player_id=player_id).order_by(PlayerSeason.season_id).all()
    return jsonify([
        {
            'season_id': ps.season_id,
            'team_id': ps.team_id,
            'class': ps.player_class,
            'ovr_rating': ps.ovr_rating,
            'games_played': ps.games_played,
            'pass_yards': ps.pass_yards,
            'rush_yards': ps.rush_yards,
            'rec_yards': ps.rec_yards,
            'tackles': ps.tackles,
            'sacks': ps.sacks,
            'interceptions': ps.interceptions
        }
        for ps in seasons
    ])

@players_bp.route('/players/<int:player_id>/redshirt', methods=['POST'])
def set_redshirt(player_id):
    player = Player.query.get_or_404(player_id)
    data = request.json
    redshirted = data.get('redshirted')
    season_id = data.get('season_id')
    if redshirted is None or season_id is None:
        return jsonify({'error': 'redshirted and season_id fields are required'}), 400
    
    # Find the PlayerSeason record for this player and season
    player_season = PlayerSeason.query.filter_by(
        player_id=player_id, 
        season_id=season_id
    ).first()
    
    if not player_season:
        return jsonify({'error': 'PlayerSeason record not found'}), 404
    
    player_season.redshirted = bool(redshirted)
    db.session.commit()
    return jsonify({'player_id': player_id, 'redshirted': player_season.redshirted}), 200

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
            'drafted_year': p.drafted_year,
            'ovr_rating': ps.ovr_rating,
            'redshirted': ps.redshirted,
            'recruit_stars': p.recruit_stars,
            'dev_trait': p.dev_trait,
            'height': p.height,
            'weight': p.weight,
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