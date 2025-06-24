from flask import Blueprint, request, jsonify
from extensions import db
from models import Player, Team, Season, PlayerSeason

recruiting_bp = Blueprint('recruiting', __name__)

@recruiting_bp.route('/recruiting-class', methods=['POST'])
def add_recruiting_class():
    data = request.json
    team_id = data.get('team_id')
    season_id = data.get('season_id')
    recruits = data.get('recruits', [])
    if not team_id or not season_id or not isinstance(recruits, list):
        return jsonify({'error': 'team_id, season_id, and recruits list are required'}), 400
    created_players = []
    for recruit in recruits:
        name = recruit.get('name')
        position = recruit.get('position')
        recruit_stars = recruit.get('recruit_stars')
        recruit_rank_nat = recruit.get('recruit_rank_nat')
        if not name or not position:
            continue
        player = Player(
            name=name,
            position=position,
            recruit_stars=recruit_stars,
            recruit_rank_nat=recruit_rank_nat,
            team_id=team_id,
            current_year='FR'
        )
        db.session.add(player)
        db.session.flush()  # get player_id before commit
        created_players.append(player.player_id)
    db.session.commit()
    return jsonify({'created_player_ids': created_players}), 201

@recruiting_bp.route('/recruiting-class', methods=['GET'])
def get_recruiting_class():
    team_id = request.args.get('team_id', type=int)
    season_id = request.args.get('season_id', type=int)
    if not team_id or not season_id:
        return jsonify({'error': 'team_id and season_id are required'}), 400

    recruits = []
    for p in Player.query.filter_by(team_id=team_id, current_year='FR').all():
        # Find the first PlayerSeason for this player
        first_ps = PlayerSeason.query.filter_by(player_id=p.player_id).order_by(PlayerSeason.season_id).first()
        if first_ps and first_ps.season_id == season_id:
            recruits.append({
                'player_id': p.player_id,
                'name': p.name,
                'position': p.position,
                'recruit_stars': p.recruit_stars,
                'recruit_rank_nat': p.recruit_rank_nat
            })
    return jsonify(recruits) 