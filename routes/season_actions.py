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
    print(f'progress_players_logic: current_season.year={getattr(current_season, "year", None)}, id={getattr(current_season, "season_id", None)}')
    next_season_year = current_season.year + 1 if current_season else None
    print(f'progress_players_logic: looking for next_season.year={next_season_year}')
    next_season = Season.query.filter(Season.year == next_season_year).first()
    print(f'progress_players_logic: found next_season={getattr(next_season, "season_id", None)}, year={getattr(next_season, "year", None)}')
    if not next_season:
        print('progress_players_logic: next season not found!')
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

    # --- NEW: Ensure every progressed/returning player gets a PlayerSeason record for the next season ---
    from models import PlayerSeason  # Local import to avoid circular dependency
    # Build a lookup of existing PlayerSeason records for the next season to avoid duplicates
    existing_next_season_ps = {
        ps.player_id for ps in PlayerSeason.query.filter_by(season_id=next_season.season_id).all()
    }

    for player in players:
        # Skip if a PlayerSeason already exists for this player in the next season (might happen for activated recruits/transfers)
        if player.player_id in existing_next_season_ps:
            continue

        # Try to copy selected attributes (e.g., ovr_rating) from the player's most recent season record if available
        prev_ps = PlayerSeason.query.filter_by(player_id=player.player_id, season_id=season_id).first()
        ovr_rating = prev_ps.ovr_rating if prev_ps else None

        new_player_season = PlayerSeason(
            player_id=player.player_id,
            season_id=next_season.season_id,
            team_id=player.team_id,
            player_class=player.current_year,
            ovr_rating=ovr_rating
        )
        db.session.add(new_player_season)

    # Activate recruits/transfers for all teams (not only user-controlled)
    from models import Team
    user_team = Team.query.filter_by(is_user_controlled=True).first()
    activated_recruits = []
    activated_transfers = []
    from routes.transfer import Transfer
    if user_team:
        team_id = user_team.team_id
        # Update all committed recruits for this season to the user-controlled team
        recruits = Recruit.query.filter_by(
            season_id=season_id,
            committed=True
        ).all()
        for recruit in recruits:
            recruit.team_id = team_id  # Ensure recruit is mapped to user team
        # Update all committed transfers for this season to the user-controlled team
        transfers = Transfer.query.filter_by(
            season_id=season_id,
            committed=True
        ).all()
        for transfer in transfers:
            transfer.team_id = team_id  # Ensure transfer is mapped to user team
        db.session.flush()  # Persist changes before creating Player records
        # Now create Player records for recruits
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
            activated_recruits.append(player.player_id)
        # Now create Player records for transfers
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
