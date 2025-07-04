from flask import Blueprint, request, jsonify, current_app # type: ignore
from marshmallow import ValidationError
from extensions import db
from models import Team, TeamSeason
from schemas import CreateTeamSchema
import os

teams_bp = Blueprint('teams', __name__)

@teams_bp.route('/teams', methods=['GET'])
def get_teams():
    teams = Team.query.all()
    return jsonify([
        {
            'team_id': t.team_id,
            'name': t.name,
            'abbreviation': t.abbreviation,
            'logo_url': t.logo_url,
            'is_user_controlled': t.is_user_controlled,
            'primary_conference_id': t.primary_conference_id
        }
        for t in teams
    ])

@teams_bp.route('/teams', methods=['POST'])
def create_team():
    data = request.json or {}
    try:
        validated = CreateTeamSchema().load(data)
    except ValidationError as err:
        return jsonify(err.messages), 400
    team = Team(
        name=validated['name'],
        abbreviation=validated.get('abbreviation'),
        logo_url=validated.get('logo_url')
    )
    db.session.add(team)
    db.session.commit()
    return jsonify({'team_id': team.team_id, 'name': team.name, 'abbreviation': team.abbreviation, 'logo_url': team.logo_url}), 201

@teams_bp.route('/teams/<int:team_id>/logo', methods=['POST'])
def upload_team_logo(team_id):
    team = Team.query.get_or_404(team_id)
    if 'logo' not in request.files:
        return jsonify({'error': 'No logo file provided'}), 400
    file = request.files['logo']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    # Save file to static/logos directory
    upload_folder = os.path.join(current_app.root_path, 'static', 'logos')
    os.makedirs(upload_folder, exist_ok=True)
    filename = f'team_{team_id}_{file.filename}'
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    # Update logo_url (relative path)
    logo_url = f'/static/logos/{filename}'
    team.logo_url = logo_url
    db.session.commit()
    return jsonify({'team_id': team_id, 'logo_url': logo_url}), 200

@teams_bp.route('/teams/<int:team_id>/seasons', methods=['GET'])
def get_team_seasons(team_id):
    team_seasons = TeamSeason.query.filter_by(team_id=team_id).all()
    return jsonify([
        {'season_id': ts.season_id, 'wins': ts.wins, 'losses': ts.losses, 'prestige': ts.prestige, 'team_rating': ts.team_rating}
        for ts in team_seasons
    ])

@teams_bp.route('/teams/<int:team_id>', methods=['GET'])
def get_team(team_id):
    team = Team.query.get_or_404(team_id)
    return jsonify({'team_id': team.team_id, 'name': team.name, 'abbreviation': team.abbreviation, 'is_user_controlled': team.is_user_controlled, 'logo_url': team.logo_url})

@teams_bp.route('/teams/<int:team_id>', methods=['PUT'])
def update_team(team_id):
    team = Team.query.get_or_404(team_id)
    data = request.json
    for field in ['name', 'abbreviation', 'is_user_controlled', 'primary_conference_id']:
        if field in data:
            setattr(team, field, data[field])
    db.session.commit()
    return jsonify({'message': 'Team updated'})

@teams_bp.route('/teams/<int:team_id>/players', methods=['GET'])
def get_team_players(team_id):
    from models import Player, PlayerSeason, Season
    # Get the current season to show current class info
    current_season = Season.query.order_by(Season.year.desc()).first()
    
    if not current_season:
        return jsonify([])
    
    # Join with PlayerSeason to get current class info
    query = (
        db.session.query(Player, PlayerSeason)
        .join(PlayerSeason, (Player.player_id == PlayerSeason.player_id) & 
                             (PlayerSeason.season_id == current_season.season_id))
        .filter(Player.team_id == team_id)
    )
    
    return jsonify([
        {
            'player_id': p.player_id,
            'name': p.name,
            'position': p.position,
            'current_year': ps.current_year,
            'recruit_stars': p.recruit_stars,
            'dev_trait': ps.dev_trait,
            'height': ps.height,
            'weight': ps.weight,
            'state': p.state
        }
        for p, ps in query.all()
    ])

@teams_bp.route('/teams/<int:team_id>/drafted', methods=['GET'])
def get_team_drafted_players(team_id):
    from models import Player, PlayerSeason
    season_id = request.args.get('season_id', type=int)
    # Since drafted_year was removed from Player model, we'll need to track this differently
    # For now, return empty list until we implement a proper draft tracking system
    return jsonify([])

@teams_bp.route('/teams/<int:team_id>/history', methods=['GET'])
def get_team_history(team_id):
    from models import TeamSeason
    history = TeamSeason.query.filter_by(team_id=team_id).order_by(TeamSeason.season_id).all()
    return jsonify([
        {
            'season_id': ts.season_id,
            'conference_id': ts.conference_id,
            'wins': ts.wins,
            'losses': ts.losses,
            'prestige': ts.prestige,
            'team_rating': ts.team_rating,
            'final_rank': ts.final_rank,
            'recruiting_rank': ts.recruiting_rank
        }
        for ts in history
    ])

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/leaders', methods=['GET'])
def get_team_stat_leaders(season_id, team_id):
    from models import PlayerSeason, Player
    stat_fields = [
        ('pass_yards', 'Passing Yards'),
        ('rush_yards', 'Rushing Yards'),
        ('rec_yards', 'Receiving Yards'),
        ('tackles', 'Tackles'),
        ('sacks', 'Sacks'),
        ('interceptions', 'Interceptions')
    ]
    leaders = {}
    for field, label in stat_fields:
        query = (
            db.session.query(PlayerSeason, Player.name)
            .join(Player, PlayerSeason.player_id == Player.player_id)
            .filter(PlayerSeason.season_id == season_id, PlayerSeason.team_id == team_id)
            .order_by(getattr(PlayerSeason, field).desc())
            .limit(3)
        )
        leaders[label] = [
            {
                'player_id': ps.player_id,
                'name': name,
                'value': getattr(ps, field, 0)
            }
            for ps, name in query.all()
            if getattr(ps, field, None) is not None
        ]
    return jsonify(leaders)

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/awards', methods=['GET'])
def get_team_awards(season_id, team_id):
    from models import AwardWinner, Award, Player
    query = (
        db.session.query(AwardWinner, Award.name, Player.name)
        .join(Award, AwardWinner.award_id == Award.award_id)
        .join(Player, AwardWinner.player_id == Player.player_id)
        .filter(AwardWinner.season_id == season_id, AwardWinner.team_id == team_id)
    )
    return jsonify([
        {
            'award': award_name,
            'player': player_name
        }
        for _, award_name, player_name in query.all()
    ])

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/recruits', methods=['GET'])
def get_team_recruits(season_id, team_id):
    # Players whose first PlayerSeason entry is for this team/season
    from models import Player, PlayerSeason
    first_season_sub = (
        db.session.query(
            PlayerSeason.player_id,
            db.func.min(PlayerSeason.season_id).label('first_season')
        )
        .group_by(PlayerSeason.player_id)
        .subquery()
    )

    query = (
        db.session.query(Player)
        .join(first_season_sub, Player.player_id == first_season_sub.c.player_id)
        .join(PlayerSeason, (Player.player_id == PlayerSeason.player_id) & 
                             (PlayerSeason.season_id == season_id) &
                             (PlayerSeason.team_id == team_id))
        .filter(
            Player.team_id == team_id,
            PlayerSeason.current_year == 'FR',
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

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/transfers', methods=['GET'])
def get_team_transfers(season_id, team_id):
    # Players who transferred in for this season (not their first PlayerSeason)
    from models import Player, PlayerSeason
    first_season_sub = (
        db.session.query(
            PlayerSeason.player_id,
            db.func.min(PlayerSeason.season_id).label('first_season')
        )
        .group_by(PlayerSeason.player_id)
        .subquery()
    )

    query = (
        db.session.query(Player)
        .join(PlayerSeason, (Player.player_id == PlayerSeason.player_id) &
                             (PlayerSeason.season_id == season_id) &
                             (PlayerSeason.team_id == team_id))
        .join(first_season_sub, Player.player_id == first_season_sub.c.player_id)
        .filter(first_season_sub.c.first_season != season_id)
    )

    transfers = [
        {
            'player_id': p.player_id,
            'name': p.name,
            'position': p.position
        }
        for p in query.all()
    ]
    return jsonify(transfers)

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/bulk_stats', methods=['POST'])
def bulk_stats_entry(season_id, team_id):
    from models import PlayerSeason
    data = request.json
    # data should be a list of {player_id, stat_field, value}
    for entry in data:
        ps = PlayerSeason.query.filter_by(season_id=season_id, team_id=team_id, player_id=entry['player_id']).first()
        if ps and entry.get('stat_field') and entry.get('value') is not None:
            setattr(ps, entry['stat_field'], entry['value'])
    db.session.commit()
    return jsonify({'message': 'Bulk stats updated'})

@teams_bp.route('/teams/user-controlled', methods=['POST'])
def set_user_controlled_team():
    data = request.json
    team_id = data.get('team_id')
    if not team_id:
        return jsonify({'error': 'team_id is required'}), 400
    from models import Team
    # Unset all
    Team.query.update({Team.is_user_controlled: False})
    # Set selected
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    team.is_user_controlled = True
    from extensions import db
    db.session.commit()
    return jsonify({'message': f'Team {team_id} set as user-controlled'}), 200

# @teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/players', methods=['GET'])
# def get_team_players_by_season(season_id, team_id):
#     from models import Player, PlayerSeason
#     # Get all players who have a PlayerSeason for this team and season
#     player_seasons = PlayerSeason.query.filter_by(season_id=season_id, team_id=team_id).all()
#     player_ids = [ps.player_id for ps in player_seasons]
#     players = Player.query.filter(Player.player_id.in_(player_ids)).all()
#     
#     # Create a lookup for PlayerSeason data
#     ps_lookup = {ps.player_id: ps for ps in player_seasons}
#
#     # Track whether each player used a redshirt prior to this season
#     prior_rs_lookup = {
#         ps.player_id: (
#             PlayerSeason.query.filter(
#                 PlayerSeason.player_id == ps.player_id,
#                 PlayerSeason.redshirted == True,
#                 PlayerSeason.season_id < season_id,
#             ).count()
#             > 0
#         )
#         for ps in player_seasons
#     }
#     
#     return jsonify([
#         {
#             'player_id': p.player_id,
#             'name': p.name,
#             'position': p.position,
#             'current_year': ps_lookup[p.player_id].current_year if p.player_id in ps_lookup else None,
#             'recruit_stars': p.recruit_stars,
#             'dev_trait': ps_lookup[p.player_id].dev_trait if p.player_id in ps_lookup else None,
#             'height': ps_lookup[p.player_id].height if p.player_id in ps_lookup else None,
#             'weight': ps_lookup[p.player_id].weight if p.player_id in ps_lookup else None,
#             'state': p.state,
#             'redshirted': (
#                 ps_lookup[p.player_id].redshirted and prior_rs_lookup.get(p.player_id, False)
#             ) if p.player_id in ps_lookup else False,
#             'has_ever_redshirted': any(ps.redshirted for ps in PlayerSeason.query.filter_by(player_id=p.player_id).all())
#         }
#         for p in players
#     ])
