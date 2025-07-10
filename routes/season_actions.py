from flask import Blueprint, jsonify, Response
from extensions import db
from models import Player, TeamSeason, Season
from routes.recruiting import Recruit
from routes import logger
from typing import Dict, List, Any, Optional, Union

season_actions_bp = Blueprint('season_actions', __name__)

def progress_players_logic(season_id: int) -> dict[str, Any]:
    """Logic for progressing players from one season to the next"""
    PROGRESSION_MAP = {"FR": "SO", "SO": "JR", "JR": "SR", "SR": "GR", "GR": "GR"}
    
    # Get the current season
    current_season = Season.query.get(season_id)
    logger.debug(f'progress_players_logic: current_season.year={getattr(current_season, "year", None)}, id={getattr(current_season, "season_id", None)}')
    next_season_year = current_season.year + 1 if current_season else None
    logger.debug(f'progress_players_logic: looking for next_season.year={next_season_year}')
    next_season = Season.query.filter(Season.year == next_season_year).first()
    logger.debug(f'progress_players_logic: found next_season={getattr(next_season, "season_id", None)}, year={getattr(next_season, "year", None)}')
    if not next_season:
        logger.error('progress_players_logic: next season not found!')
        raise ValueError("Next season not found")
    
    # Progress existing players (all players, not just user-controlled teams)
    players = Player.query.all()
    progressed = []
    redshirted = []
    from models import PlayerSeason  # Local import to avoid circular dependency
    
    # Build a lookup of existing PlayerSeason records for the next season to avoid duplicates
    existing_next_season_ps = {
        ps.player_id for ps in PlayerSeason.query.filter_by(season_id=next_season.season_id).all()
    }

    # First pass: ensure all players have PlayerSeason records for the current season
    for player in players:
        # Skip players with no team (e.g., graduated)
        if player.team_id is None:
            logger.debug(f'Skipping player {player.player_id} ({player.name}) in first pass: no team_id')
            continue
        # Get the current season's PlayerSeason record
        current_ps = PlayerSeason.query.filter_by(player_id=player.player_id, season_id=season_id).first()
        if not current_ps:
            # Create a PlayerSeason record for the current season if it doesn't exist
            current_ps = PlayerSeason(
                player_id=player.player_id,
                season_id=season_id,
                team_id=player.team_id,  # Safe: already checked above
                player_class='FR',  # Default for new players
                current_year='FR',
                redshirted=False
            )
            db.session.add(current_ps)
            db.session.flush()
        
        old_class = current_ps.current_year or current_ps.player_class or 'FR'

        if current_ps.redshirted:
            redshirted.append(player.player_id)
            player.redshirt_used = True
        elif old_class in PROGRESSION_MAP:
            progressed.append(player.player_id)

    # Second pass: create PlayerSeason records for the next season
    for player in players:
        # Skip if a PlayerSeason already exists for this player in the next season
        if player.player_id in existing_next_season_ps:
            continue
        
        # Get the current season's PlayerSeason to determine progression
        current_ps = PlayerSeason.query.filter_by(player_id=player.player_id, season_id=season_id).first()
        if not current_ps:
            logger.debug(f'Skipping player {player.player_id} ({player.name}): no PlayerSeason for previous season {season_id}')
            continue
        
        # Skip players with no team (e.g., graduated)
        if current_ps.team_id is None or player.team_id is None:
            logger.debug(f'Skipping player {player.player_id} ({player.name}): no team (current_ps.team_id={current_ps.team_id}, player.team_id={player.team_id})')
            continue
        
        old_class = current_ps.current_year or current_ps.player_class or 'FR'
        if current_ps.redshirted:
            new_class = old_class
            player.redshirt_used = True
        elif current_ps.current_year in PROGRESSION_MAP:
            new_class = PROGRESSION_MAP[current_ps.current_year]
        else:
            new_class = old_class
        has_ever_redshirted = player.redshirt_used or current_ps.redshirted

        # Graduated players should not appear on future rosters
        if new_class == "GR":
            player.team_id = None
            logger.debug(f'Player {player.player_id} ({player.name}) graduated, setting team_id=None')
            continue

        # Final safeguard: do not create PlayerSeason if team_id is None
        if current_ps.team_id is None or player.team_id is None:
            logger.debug(f'FINAL SAFEGUARD: Skipping player {player.player_id} ({player.name}) - would create PlayerSeason with team_id=None')
            continue

        # Carry redshirted status does not persist season to season
        next_redshirted = False

        # Create PlayerSeason for next season
        new_player_season = PlayerSeason(
            player_id=player.player_id,
            season_id=next_season.season_id,
            team_id=current_ps.team_id,
            player_class=new_class,
            current_year=new_class,
            redshirted=next_redshirted,
            ovr_rating=current_ps.ovr_rating,
            speed=current_ps.speed,
            dev_trait=current_ps.dev_trait,
            height=current_ps.height,
            weight=current_ps.weight
        )
        db.session.add(new_player_season)
        logger.debug(f'Created PlayerSeason for player {player.player_id} in season {next_season.season_id} with class {new_class}')

    # Activate recruits/transfers for all teams (not only user-controlled)
    activated_recruits = []
    activated_transfers = []
    from routes.transfer import Transfer
    # Process recruits for every team
    recruits = Recruit.query.filter_by(season_id=season_id, committed=True).all()
    transfers = Transfer.query.filter_by(season_id=season_id, committed=True).all()

    db.session.flush()  # Ensure existing data is written before creating players

    for recruit in recruits:
        team_id = recruit.team_id
        if not team_id:
            continue
        player = Player(
            name=recruit.name,
            position=recruit.position,
            recruit_stars=recruit.recruit_stars,
            recruit_rank_nat=recruit.recruit_rank_nat,
            state=recruit.state,
            team_id=team_id
        )
        db.session.add(player)
        db.session.flush()
        ps = PlayerSeason(
            player_id=player.player_id,
            season_id=next_season.season_id,
            team_id=team_id,
            player_class='FR',
            current_year='FR',
            redshirted=False,
            height=recruit.height,
            weight=recruit.weight
        )
        db.session.add(ps)
        activated_recruits.append(player.player_id)

    for transfer in transfers:
        team_id = transfer.team_id
        if not team_id:
            continue
        progressed_year = PROGRESSION_MAP.get(transfer.current_status, transfer.current_status)
        player = Player(
            name=transfer.name,
            position=transfer.position,
            recruit_stars=transfer.recruit_stars,
            recruit_rank_nat=transfer.recruit_rank_pos,
            team_id=team_id,
            state=transfer.state
        )
        db.session.add(player)
        db.session.flush()
        ps = PlayerSeason(
            player_id=player.player_id,
            season_id=next_season.season_id,
            team_id=team_id,
            player_class=progressed_year,
            current_year=progressed_year,
            redshirted=False,
            ovr_rating=transfer.ovr_rating,
            height=transfer.height,
            weight=transfer.weight
        )
        db.session.add(ps)
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
def progress_players(season_id: int) -> Response:
    try:
        result = progress_players_logic(season_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except (ImportError, AttributeError, ValueError, RuntimeError, OSError) as e:
        return jsonify({"error": f"Failed to progress players: {str(e)}"}), 500

@season_actions_bp.route('/seasons/<int:season_id>/teams/top25', methods=['POST'])
def assign_top25(season_id: int) -> Response:
    team_seasons = TeamSeason.query.filter_by(season_id=season_id).all()
    sorted_teams = sorted(team_seasons, key=lambda ts: (ts.wins if ts.wins is not None else 0, ts.team_id), reverse=True)
    top25 = sorted_teams[:25]
    for i, ts in enumerate(top25):
        ts.final_rank = i + 1
    for ts in sorted_teams[25:]:
        ts.final_rank = None
    db.session.commit()
    return jsonify({'message': 'Top 25 assigned by wins', 'assigned_team_ids': [ts.team_id for ts in top25]}), 200
