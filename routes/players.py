from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Player, PlayerSeason, Team

players_bp = Blueprint('players', __name__)

@players_bp.route('/players/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = Player.query.get_or_404(player_id)
    return jsonify({
        'player_id': player.player_id,
        'name': player.name,
        'position': player.position,
        'team_id': player.team_id,
        'current_year': player.current_year,
        'drafted_year': player.drafted_year
    })

@players_bp.route('/teams/<int:team_id>/players', methods=['POST'])
def add_player_to_team(team_id):
    data = request.json
    name = data.get('name')
    position = data.get('position')
    ovr_rating = data.get('ovr_rating')
    season_id = data.get('season_id')
    if not all([name, position, ovr_rating, season_id]):
        return jsonify({'error': 'Missing required fields'}), 400
    player = Player(name=name, position=position, team_id=team_id)
    db.session.add(player)
    db.session.commit()
    player_season = PlayerSeason(player_id=player.player_id, season_id=season_id, team_id=team_id, ovr_rating=ovr_rating)
    db.session.add(player_season)
    db.session.commit()
    return jsonify({'player_id': player.player_id, 'name': player.name, 'position': player.position}), 201

@players_bp.route('/players/<int:player_id>/seasons', methods=['POST'])
def add_player_season(player_id):
    data = request.json
    season_id = data.get('season_id')
    team_id = data.get('team_id')
    ovr_rating = data.get('ovr_rating')
    if not all([season_id, team_id, ovr_rating]):
        return jsonify({'error': 'Missing required fields'}), 400
    player_season = PlayerSeason(player_id=player_id, season_id=season_id, team_id=team_id, ovr_rating=ovr_rating)
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
    roster = PlayerSeason.query.filter_by(season_id=season_id, team_id=team_id).all()
    from models import Player
    return jsonify([
        {
            'player_id': ps.player_id,
            'name': Player.query.get(ps.player_id).name,
            'position': Player.query.get(ps.player_id).position,
            'class': ps.player_class,
            'ovr_rating': ps.ovr_rating
        }
        for ps in roster
    ])

@players_bp.route('/players/<int:player_id>/career', methods=['GET'])
def get_player_career(player_id):
    from models import PlayerSeason
    seasons = PlayerSeason.query.filter_by(player_id=player_id).order_by(PlayerSeason.season_id).all()
    return jsonify([
        {
            'season_id': ps.season_id,
            'team_id': ps.team_id,
            'player_class': ps.player_class,
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
    if redshirted is None:
        return jsonify({'error': 'redshirted field is required'}), 400
    player.redshirted = bool(redshirted)
    db.session.commit()
    return jsonify({'player_id': player_id, 'redshirted': player.redshirted}), 200

@players_bp.route('/players', methods=['GET'])
def get_all_players():
    players = Player.query.all()
    return jsonify([
        {
            'player_id': p.player_id,
            'name': p.name,
            'position': p.position,
            'team_id': p.team_id,
            'current_year': p.current_year,
            'drafted_year': p.drafted_year
        }
        for p in players
    ]) 