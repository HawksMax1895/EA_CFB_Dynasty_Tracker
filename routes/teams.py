from flask import Blueprint, request, jsonify, current_app # type: ignore
from extensions import db
from models import Team, TeamSeason
import os

teams_bp = Blueprint('teams', __name__)

@teams_bp.route('/teams', methods=['GET'])
def get_teams():
    teams = Team.query.all()
    return jsonify([
        {'team_id': t.team_id, 'name': t.name, 'abbreviation': t.abbreviation, 'logo_url': t.logo_url}
        for t in teams
    ])

@teams_bp.route('/teams', methods=['POST'])
def create_team():
    data = request.json
    name = data.get('name')
    abbreviation = data.get('abbreviation')
    logo_url = data.get('logo_url')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    team = Team(name=name, abbreviation=abbreviation, logo_url=logo_url)
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
    from models import Player
    players = Player.query.filter_by(team_id=team_id).all()
    return jsonify([
        {'player_id': p.player_id, 'name': p.name, 'position': p.position, 'current_year': p.current_year, 'drafted_year': p.drafted_year}
        for p in players
    ])

@teams_bp.route('/teams/<int:team_id>/drafted', methods=['GET'])
def get_team_drafted_players(team_id):
    from models import Player, PlayerSeason
    season_id = request.args.get('season_id', type=int)
    query = Player.query.filter(Player.team_id == team_id, Player.drafted_year != None)
    if season_id:
        # Only players who played for this team in the given season and were drafted after that season
        drafted = [p for p in query.all() if PlayerSeason.query.filter_by(player_id=p.player_id, team_id=team_id, season_id=season_id).first() and p.drafted_year == season_id + 1]
    else:
        drafted = query.all()
    return jsonify([
        {'player_id': p.player_id, 'name': p.name, 'drafted_year': p.drafted_year}
        for p in drafted
    ])

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
        top = PlayerSeason.query.filter_by(season_id=season_id, team_id=team_id).order_by(getattr(PlayerSeason, field).desc()).limit(3).all()
        leaders[label] = [
            {
                'player_id': ps.player_id,
                'name': Player.query.get(ps.player_id).name,
                'value': getattr(ps, field, 0)
            } for ps in top if getattr(ps, field, None) is not None
        ]
    return jsonify(leaders)

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/awards', methods=['GET'])
def get_team_awards(season_id, team_id):
    from models import AwardWinner, Award, Player
    winners = AwardWinner.query.filter_by(season_id=season_id, team_id=team_id).all()
    return jsonify([
        {
            'award': Award.query.get(w.award_id).name,
            'player': Player.query.get(w.player_id).name
        } for w in winners
    ])

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/recruits', methods=['GET'])
def get_team_recruits(season_id, team_id):
    # Placeholder: return all players whose first PlayerSeason is for this team and season
    from models import Player, PlayerSeason
    recruits = []
    for p in Player.query.all():
        first_ps = PlayerSeason.query.filter_by(player_id=p.player_id).order_by(PlayerSeason.season_id).first()
        if first_ps and first_ps.season_id == season_id and first_ps.team_id == team_id:
            recruits.append({
                'player_id': p.player_id,
                'name': p.name,
                'position': p.position,
                'recruit_stars': p.recruit_stars,
                'recruit_rank_nat': p.recruit_rank_nat
            })
    return jsonify(recruits)

@teams_bp.route('/seasons/<int:season_id>/teams/<int:team_id>/transfers', methods=['GET'])
def get_team_transfers(season_id, team_id):
    # Placeholder: return players whose PlayerSeason for this season/team is not their first PlayerSeason
    from models import Player, PlayerSeason
    transfers = []
    for ps in PlayerSeason.query.filter_by(season_id=season_id, team_id=team_id).all():
        all_ps = PlayerSeason.query.filter_by(player_id=ps.player_id).order_by(PlayerSeason.season_id).all()
        if len(all_ps) > 1 and all_ps[0].season_id != season_id:
            p = Player.query.get(ps.player_id)
            transfers.append({
                'player_id': p.player_id,
                'name': p.name,
                'position': p.position
            })
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