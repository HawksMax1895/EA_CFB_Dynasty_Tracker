from flask import Blueprint, request, jsonify
from extensions import db
from models import Player, Team, Season, PlayerSeason

recruiting_bp = Blueprint('recruiting', __name__)

# Create a simple Recruit model for storing committed recruits
class Recruit(db.Model):
    __tablename__ = 'recruits'
    recruit_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    position = db.Column(db.String(8), nullable=False)
    recruit_stars = db.Column(db.Integer)
    recruit_rank_nat = db.Column(db.Integer)
    recruit_rank_pos = db.Column(db.Integer)
    speed = db.Column(db.Integer)
    dev_trait = db.Column(db.String(16))
    height = db.Column(db.String(8))
    weight = db.Column(db.Integer)
    state = db.Column(db.String(2))
    team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'))
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.season_id'))
    committed = db.Column(db.Boolean, default=True)

@recruiting_bp.route('/recruiting-class', methods=['POST'])
def add_recruiting_class():
    data = request.json
    team_id = data.get('team_id')
    season_id = data.get('season_id')
    recruits = data.get('recruits', [])
    if not team_id or not season_id or not isinstance(recruits, list):
        return jsonify({'error': 'team_id, season_id, and recruits list are required'}), 400
    season = Season.query.get(season_id)
    if not season:
        return jsonify({'error': 'Season not found'}), 404

    progression = ["FR", "SO", "JR", "SR"]
    future_seasons = (
        Season.query.filter(Season.year >= season.year)
        .order_by(Season.year)
        .all()
    )

    created_recruits = []
    for recruit in recruits:
        name = recruit.get('name')
        position = recruit.get('position')
        recruit_stars = recruit.get('recruit_stars')
        recruit_rank_nat = recruit.get('recruit_rank_nat')
        recruit_rank_pos = recruit.get('recruit_rank_pos')
        speed = recruit.get('speed')
        dev_trait = recruit.get('dev_trait')
        height = recruit.get('height')
        weight = recruit.get('weight')
        state = recruit.get('state')
        if not name or not position:
            continue

        recruit_obj = Recruit(
            name=name,
            position=position,
            recruit_stars=recruit_stars,
            recruit_rank_nat=recruit_rank_nat,
            recruit_rank_pos=recruit_rank_pos,
            speed=speed,
            dev_trait=dev_trait,
            height=height,
            weight=weight,
            state=state,
            team_id=team_id,
            season_id=season_id,
            committed=True
        )
        db.session.add(recruit_obj)
        db.session.flush()
        created_recruits.append(recruit_obj.recruit_id)

    db.session.commit()
    return jsonify({'created_recruit_ids': created_recruits}), 201

@recruiting_bp.route('/recruiting-class', methods=['GET'])
def get_recruiting_class():
    team_id = request.args.get('team_id', type=int)
    season_id = request.args.get('season_id', type=int)
    if not team_id or not season_id:
        return jsonify({'error': 'team_id and season_id are required'}), 400

    recruits = Recruit.query.filter_by(
        team_id=team_id,
        season_id=season_id,
        committed=True
    ).all()

    return jsonify([
        {
            'recruit_id': r.recruit_id,
            'name': r.name,
            'position': r.position,
            'recruit_stars': r.recruit_stars,
            'recruit_rank_nat': r.recruit_rank_nat,
            'recruit_rank_pos': r.recruit_rank_pos,
            'speed': r.speed,
            'dev_trait': r.dev_trait,
            'height': r.height,
            'weight': r.weight,
            'state': r.state
        }
        for r in recruits
    ])

@recruiting_bp.route('/recruiting-class/<int:recruit_id>', methods=['PUT'])
def update_recruit(recruit_id):
    recruit = Recruit.query.get(recruit_id)
    if not recruit:
        return jsonify({'error': 'Recruit not found'}), 404
    
    data = request.json
    recruit.name = data.get('name', recruit.name)
    recruit.position = data.get('position', recruit.position)
    recruit.recruit_stars = data.get('recruit_stars', recruit.recruit_stars)
    recruit.recruit_rank_nat = data.get('recruit_rank_nat', recruit.recruit_rank_nat)
    recruit.recruit_rank_pos = data.get('recruit_rank_pos', recruit.recruit_rank_pos)
    recruit.speed = data.get('speed', recruit.speed)
    recruit.dev_trait = data.get('dev_trait', recruit.dev_trait)
    recruit.height = data.get('height', recruit.height)
    recruit.weight = data.get('weight', recruit.weight)
    recruit.state = data.get('state', recruit.state)
    
    db.session.commit()
    return jsonify({'message': 'Recruit updated successfully'}), 200

@recruiting_bp.route('/recruiting-class/<int:recruit_id>', methods=['DELETE'])
def delete_recruit(recruit_id):
    recruit = Recruit.query.get(recruit_id)
    if not recruit:
        return jsonify({'error': 'Recruit not found'}), 404
    
    db.session.delete(recruit)
    db.session.commit()
    return jsonify({'message': 'Recruit deleted successfully'}), 200
