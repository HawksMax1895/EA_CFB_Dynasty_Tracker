from flask import Blueprint, request, jsonify, current_app, Response
from marshmallow import ValidationError
from extensions import db
from models import Team, TeamSeason, Season, Conference
from routes import logger
from typing import Dict, List, Any, Optional, Union
import os

teams_bp = Blueprint('teams', __name__)

@teams_bp.route('/teams', methods=['GET'])
def get_teams() -> Response:
    """
    Retrieve all teams in the system.
    
    Returns:
        Response: JSON array containing all teams with their basic information
        including team_id, name, abbreviation, logo_url, primary_conference_id,
        and is_user_controlled status.
    """
    teams = Team.query.all()
    return jsonify([{
        'team_id': t.team_id,
        'name': t.name,
        'abbreviation': t.abbreviation,
        'logo_url': t.logo_url,
        'primary_conference_id': t.primary_conference_id,
        'is_user_controlled': t.is_user_controlled
    } for t in teams])

@teams_bp.route('/teams', methods=['POST'])
def create_team() -> Response:
    """
    Create a new team in the system.
    
    Expected JSON payload:
        name (str): Team name (required)
        abbreviation (str, optional): Team abbreviation
        logo_url (str, optional): URL to team logo
        primary_conference_id (int, optional): ID of primary conference
        is_user_controlled (bool, optional): Whether team is user-controlled (default: False)
    
    Returns:
        Response: JSON object with created team information and 201 status code
        on success, or error message with 400 status code on validation failure.
    """
    data = request.json
    name = data.get('name')
    abbreviation = data.get('abbreviation')
    logo_url = data.get('logo_url')
    primary_conference_id = data.get('primary_conference_id')
    is_user_controlled = data.get('is_user_controlled', False)
    
    if not name:
        return jsonify({'error': 'Team name is required'}), 400
    
    team = Team(
        name=name,
        abbreviation=abbreviation,
        logo_url=logo_url,
        primary_conference_id=primary_conference_id,
        is_user_controlled=is_user_controlled
    )
    db.session.add(team)
    db.session.commit()
    
    return jsonify({
        'team_id': team.team_id,
        'name': team.name,
        'abbreviation': team.abbreviation,
        'logo_url': team.logo_url,
        'primary_conference_id': team.primary_conference_id,
        'is_user_controlled': team.is_user_controlled
    }), 201

@teams_bp.route('/teams/<int:team_id>/logo', methods=['POST'])
def upload_team_logo(team_id: int) -> Response:
    """
    Upload a logo file for a specific team.
    
    Args:
        team_id (int): ID of the team to upload logo for
        
    Expected form data:
        logo (file): Logo file to upload
        
    Returns:
        Response: JSON object with team_id and logo_url on success,
        or error message with appropriate status code on failure.
        
    Raises:
        404: If team is not found
        400: If no logo file is provided or file is empty
    """
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
def get_team_seasons(team_id: int) -> Response:
    """
    Retrieve all season records for a specific team.
    
    Args:
        team_id (int): ID of the team to get season records for
        
    Returns:
        Response: JSON array containing team season records with season_id,
        wins, losses, prestige, and team_rating for each season.
    """
    team_seasons = TeamSeason.query.filter_by(team_id=team_id).all()
    return jsonify([
        {'season_id': ts.season_id, 'wins': ts.wins, 'losses': ts.losses, 'prestige': ts.prestige, 'team_rating': ts.team_rating}
        for ts in team_seasons
    ])

@teams_bp.route('/teams/<int:team_id>', methods=['GET'])
def get_team(team_id: int) -> Response:
    """
    Retrieve detailed information for a specific team.
    
    Args:
        team_id (int): ID of the team to retrieve
        
    Returns:
        Response: JSON object containing team information including team_id,
        name, abbreviation, logo_url, primary_conference_id, and is_user_controlled status.
        
    Raises:
        404: If team is not found
    """
    team = Team.query.get_or_404(team_id)
    return jsonify({
        'team_id': team.team_id,
        'name': team.name,
        'abbreviation': team.abbreviation,
        'logo_url': team.logo_url,
        'primary_conference_id': team.primary_conference_id,
        'is_user_controlled': team.is_user_controlled
    })

@teams_bp.route('/teams/<int:team_id>', methods=['PUT'])
def update_team(team_id: int) -> Response:
    """
    Update information for a specific team.
    
    Args:
        team_id (int): ID of the team to update
        
    Expected JSON payload (all fields optional):
        name (str): New team name
        abbreviation (str): New team abbreviation
        logo_url (str): New logo URL
        primary_conference_id (int): New primary conference ID
        is_user_controlled (bool): New user-controlled status
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If team is not found
    """
    team = Team.query.get_or_404(team_id)
    data = request.json
    
    if 'name' in data:
        team.name = data['name']
    if 'abbreviation' in data:
        team.abbreviation = data['abbreviation']
    if 'logo_url' in data:
        team.logo_url = data['logo_url']
    if 'primary_conference_id' in data:
        team.primary_conference_id = data['primary_conference_id']
    if 'is_user_controlled' in data:
        team.is_user_controlled = data['is_user_controlled']
    
    db.session.commit()
    return jsonify({'message': 'Team updated successfully'})

@teams_bp.route('/teams/<int:team_id>', methods=['DELETE'])
def delete_team(team_id: int) -> Response:
    """
    Delete a specific team from the system.
    
    Args:
        team_id (int): ID of the team to delete
        
    Returns:
        Response: JSON object with success message on completion.
        
    Raises:
        404: If team is not found
    """
    team = Team.query.get_or_404(team_id)
    db.session.delete(team)
    db.session.commit()
    return jsonify({'message': 'Team deleted successfully'})

@teams_bp.route('/teams/<int:team_id>/players', methods=['GET'])
def get_team_players(team_id: int) -> Response:
    """
    Retrieve all players currently on a specific team's roster.
    
    Args:
        team_id (int): ID of the team to get players for
        
    Returns:
        Response: JSON array containing player information including player_id,
        name, position, current_year, recruit_stars, dev_trait, height, weight,
        and state for each player on the team's current roster.
        
    Note:
        Only returns players for the most recent season. Returns empty array
        if no current season exists.
    """
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
def get_team_drafted_players(team_id: int) -> Response:
    """
    Retrieve all players drafted from a specific team.
    
    Args:
        team_id (int): ID of the team to get drafted players for
        
    Query Parameters:
        season_id (int, optional): Specific season to filter by
        
    Returns:
        Response: JSON array containing drafted players information.
        
    Note:
        Currently returns empty array as draft tracking system is not yet implemented.
    """
    from models import Player, PlayerSeason
    season_id = request.args.get('season_id', type=int)
    # Since drafted_year was removed from Player model, we'll need to track this differently
    # For now, return empty list until we implement a proper draft tracking system
    return jsonify([])

@teams_bp.route('/teams/<int:team_id>/history', methods=['GET'])
def get_team_history(team_id: int) -> Response:
    """
    Retrieve complete historical record for a specific team across all seasons.
    
    Args:
        team_id (int): ID of the team to get history for
        
    Returns:
        Response: JSON array containing team season records with season_id,
        conference_id, wins, losses, prestige, team_rating, final_rank,
        and recruiting_rank for each season the team has participated in.
    """
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
def get_team_stat_leaders(season_id: int, team_id: int) -> Response:
    """
    Retrieve statistical leaders for a specific team in a specific season.
    
    Args:
        season_id (int): ID of the season to get leaders for
        team_id (int): ID of the team to get leaders for
        
    Returns:
        Response: JSON object containing top 3 players in each statistical category
        including Passing Yards, Rushing Yards, Receiving Yards, Tackles, Sacks,
        and Interceptions. Each category contains player_id, name, and value.
    """
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
def get_team_awards(season_id: int, team_id: int) -> Response:
    """
    Retrieve all awards won by players from a specific team in a specific season.
    
    Args:
        season_id (int): ID of the season to get awards for
        team_id (int): ID of the team to get awards for
        
    Returns:
        Response: JSON array containing award information with award name
        and player name for each award won by team players in the season.
    """
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
def get_team_recruits(season_id: int, team_id: int) -> Response:
    """
    Retrieve all recruits (freshmen) who joined a specific team in a specific season.
    
    Args:
        season_id (int): ID of the season to get recruits for
        team_id (int): ID of the team to get recruits for
        
    Returns:
        Response: JSON array containing recruit information including player_id,
        name, position, recruit_stars, height, weight, and state for each
        freshman recruit who joined the team in the specified season.
        
    Note:
        Only returns players whose first season with the team was the specified season
        and who are currently freshmen (current_year == 'FR').
    """
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
def get_team_transfers(season_id: int, team_id: int) -> Response:
    """
    Retrieve all transfer players who joined a specific team in a specific season.
    
    Args:
        season_id (int): ID of the season to get transfers for
        team_id (int): ID of the team to get transfers for
        
    Returns:
        Response: JSON array containing transfer player information including
        player_id, name, and position for each player who transferred to
        the team in the specified season.
        
    Note:
        Only returns players who transferred in (not their first season with any team)
        and are currently on the specified team in the specified season.
    """
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
def bulk_stats_entry(season_id: int, team_id: int) -> Response:
    """
    Update multiple player statistics for a team in a specific season in bulk.
    
    Args:
        season_id (int): ID of the season to update stats for
        team_id (int): ID of the team to update stats for
        
    Expected JSON payload:
        List of objects with player_id, stat_field, and value:
        [
            {"player_id": 1, "stat_field": "pass_yards", "value": 2500},
            {"player_id": 2, "stat_field": "rush_yards", "value": 1200}
        ]
        
    Returns:
        Response: JSON object with success message on completion.
        
    Note:
        Only updates stats for players who exist in the specified team/season.
        Invalid entries are silently ignored.
    """
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
def set_user_controlled_team() -> Response:
    """
    Set a specific team as the user-controlled team for the dynasty.
    
    Expected JSON payload:
        team_id (int): ID of the team to set as user-controlled (required)
        
    Returns:
        Response: JSON object with success message on completion,
        or error message with appropriate status code on failure.
        
    Raises:
        400: If team_id is not provided
        404: If team is not found
        
    Note:
        This will unset all other teams as user-controlled before setting
        the specified team as user-controlled.
    """
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

@teams_bp.route('/teams/<int:team_id>/seasons/<int:season_id>', methods=['GET'])
def get_team_season(team_id: int, season_id: int) -> Response:
    """
    Retrieve detailed season information for a specific team in a specific season.
    
    Args:
        team_id (int): ID of the team to get season information for
        season_id (int): ID of the season to get information for
        
    Returns:
        Response: JSON object containing team season information including
        team_id, season_id, conference_id, wins, losses, conference_wins,
        conference_losses, points_for, points_against, final_rank, prestige,
        and team_rating.
        
    Raises:
        404: If team season record is not found
    """
    team_season = TeamSeason.query.filter_by(
        team_id=team_id, 
        season_id=season_id
    ).first()
    
    if not team_season:
        return jsonify({'error': 'TeamSeason not found'}), 404
    
    return jsonify({
        'team_id': team_season.team_id,
        'season_id': team_season.season_id,
        'conference_id': team_season.conference_id,
        'wins': team_season.wins,
        'losses': team_season.losses,
        'conference_wins': team_season.conference_wins,
        'conference_losses': team_season.conference_losses,
        'points_for': team_season.points_for,
        'points_against': team_season.points_against,
        'final_rank': team_season.final_rank,
        'prestige': team_season.prestige,
        'team_rating': team_season.team_rating
    })

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
