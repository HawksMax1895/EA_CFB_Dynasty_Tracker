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

    from sqlalchemy import func

    first_season_sub = (
        db.session.query(
            PlayerSeason.player_id,
            func.min(PlayerSeason.season_id).label('first_season')
        )
        .group_by(PlayerSeason.player_id)
        .subquery()
    )

    query = (
        db.session.query(Player)
        .join(first_season_sub, Player.player_id == first_season_sub.c.player_id)
        .filter(
            Player.team_id == team_id,
            Player.current_year == 'FR',
            first_season_sub.c.first_season == season_id
        )
    )

    recruits = [
        {
            'player_id': p.player_id,
            'name': p.name,
            'position': p.position,
            'recruit_stars': p.recruit_stars,
            'recruit_rank_nat': p.recruit_rank_nat
        }
        for p in query.all()
    ]

    return jsonify(recruits)
