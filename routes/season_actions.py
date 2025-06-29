from flask import Blueprint, jsonify
from extensions import db
from models import Player, TeamSeason, Season
from routes.recruiting import Recruit

season_actions_bp = Blueprint('season_actions', __name__)

def progress_players_logic(season_id):
    """Logic for progressing players from one season to the next"""
    PROGRESSION_MAP = {"FR": "SO", "SO": "JR", "JR": "SR", "SR": "GR", "GR": "GR"}
    
    # Get the next season
    current_season = Season.query.get(season_id)
    if not current_season:
        raise ValueError("Season not found")
    
    next_season = Season.query.filter(Season.year == current_season.year + 1).first()
    if not next_season:
        raise ValueError("Next season not found")
    
    # Progress existing players (all players, not just user-controlled teams)
    players = Player.query.all()
    progressed = []
    redshirted = []
    for player in players:
        if player.redshirted:
            player.redshirted = False
            redshirted.append(player.player_id)
            continue
        if player.current_year in PROGRESSION_MAP:
            player.current_year = PROGRESSION_MAP[player.current_year]
            progressed.append(player.player_id)
    
    # Activate recruits and transfers for all user-controlled teams
    from models import Team
    user_teams = Team.query.filter_by(is_user_controlled=True).all()
    activated_recruits = []
    activated_transfers = []
    from routes.transfer import Transfer
    from models import PlayerSeason
    for team in user_teams:
        team_id = team.team_id
        # Get all committed recruits for the current season
        recruits = Recruit.query.filter_by(
            team_id=team_id,
            season_id=season_id,
            committed=True
        ).all()
        for recruit in recruits:
            # Create Player record
            player = Player(
                name=recruit.name,
                position=recruit.position,
                recruit_stars=recruit.recruit_stars,
                recruit_rank_nat=recruit.recruit_rank_nat,
                speed=recruit.speed,
                dev_trait=recruit.dev_trait,
                height=recruit.height,
                weight=recruit.weight,
                state=recruit.state,
                team_id=team_id,
                current_year='FR'
            )
            db.session.add(player)
            db.session.flush()  # Get player_id
            # Create PlayerSeason record for the NEXT season
            player_season = PlayerSeason(
                player_id=player.player_id,
                season_id=next_season.season_id,
                team_id=team_id,
                player_class='FR'
            )
            db.session.add(player_season)
            # Mark recruit as activated
            recruit.committed = False
            activated_recruits.append(player.player_id)
        # Handle transfers (they should also be activated for the next season)
        transfers = Transfer.query.filter_by(
            team_id=team_id,
            season_id=season_id,
            committed=True
        ).all()
        for transfer in transfers:
            # Progress transfer's year by one when they join the new team
            progressed_year = PROGRESSION_MAP.get(transfer.current_status, transfer.current_status)
            # Create Player record
            player = Player(
                name=transfer.name,
                position=transfer.position,
                recruit_stars=transfer.recruit_stars,
                recruit_rank_nat=transfer.recruit_rank_pos,  # Use positional rank as national rank for transfers
                speed=transfer.speed if hasattr(transfer, 'speed') else None,
                team_id=team_id,
                current_year=progressed_year,
                dev_trait=transfer.dev_trait,
                height=transfer.height,
                weight=transfer.weight,
                state=transfer.state,
                career_stats=f'Transferred from {transfer.previous_school}' if transfer.previous_school else None
            )
            db.session.add(player)
            db.session.flush()  # Get player_id
            # Create PlayerSeason record for the NEXT season
            player_season = PlayerSeason(
                player_id=player.player_id,
                season_id=next_season.season_id,
                team_id=team_id,
                player_class=progressed_year,
                ovr_rating=transfer.ovr_rating
            )
            db.session.add(player_season)
            # Mark transfer as activated
            transfer.committed = False
            activated_transfers.append(player.player_id)
    db.session.commit()
    return {
        "progressed_player_ids": progressed, 
        "redshirted_player_ids": redshirted,
        "activated_recruit_ids": activated_recruits,
        "activated_transfer_ids": activated_transfers,
        "next_season_id": next_season.season_id
    }

@season_actions_bp.route('/seasons/<int:season_id>/players/progression', methods=['POST'])
def progress_players(season_id):
    try:
        result = progress_players_logic(season_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to progress players: {str(e)}"}), 500

@season_actions_bp.route('/seasons/<int:season_id>/teams/top25', methods=['POST'])
def assign_top25(season_id):
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    sorted_teams = sorted(team_seasons, key=lambda ts: (ts.wins if ts.wins is not None else 0, ts.team_id), reverse=True)
    top25 = sorted_teams[:25]
    for i, ts in enumerate(top25):
        ts.final_rank = i + 1
    for ts in sorted_teams[25:]:
        ts.final_rank = None
    db.session.commit()
    return jsonify({'message': 'Top 25 assigned by wins', 'assigned_team_ids': [ts.team_id for ts in top25]}), 200
