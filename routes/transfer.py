from flask import Blueprint, request, jsonify # type: ignore
from extensions import db
from models import Player, Team, Season

transfer_bp = Blueprint('transfer', __name__)

@transfer_bp.route('/transfer-portal', methods=['POST'])
def add_transfer_portal():
    data = request.json
    team_id = data.get('team_id')
    season_id = data.get('season_id')
    transfers = data.get('transfers', [])
    if not team_id or not season_id or not isinstance(transfers, list):
        return jsonify({'error': 'team_id, season_id, and transfers list are required'}), 400
    created_players = []
    for transfer in transfers:
        name = transfer.get('name')
        position = transfer.get('position')
        previous_school = transfer.get('previous_school')
        ovr_rating = transfer.get('ovr_rating')
        dev_trait = transfer.get('dev_trait')
        height = transfer.get('height')
        weight = transfer.get('weight')
        state = transfer.get('state')
        current_status = transfer.get('current_status', 'SO')
        if not name or not position:
            continue
        player = Player(
            name=name,
            position=position,
            team_id=team_id,
            current_year=current_status,
            dev_trait=dev_trait,
            height=height,
            weight=weight,
            state=state,
            career_stats=f'Transferred from {previous_school}' if previous_school else None
        )
        db.session.add(player)
        db.session.flush()  # get player_id before commit
        
        # Create PlayerSeason entry for the transfer
        from models import PlayerSeason
        player_season = PlayerSeason(
            player_id=player.player_id,
            season_id=season_id,
            team_id=team_id,
            player_class=current_status,
            ovr_rating=ovr_rating
        )
        db.session.add(player_season)
        created_players.append(player.player_id)
    db.session.commit()
    return jsonify({'created_player_ids': created_players}), 201

@transfer_bp.route('/transfer-portal', methods=['GET'])
def get_transfer_portal():
    team_id = request.args.get('team_id', type=int)
    season_id = request.args.get('season_id', type=int)
    if not team_id or not season_id:
        return jsonify({'error': 'team_id and season_id are required'}), 400
    
    from models import PlayerSeason
    
    # Get transfers for this team/season (players who transferred in this season)
    transfers = (
        db.session.query(Player, PlayerSeason)
        .join(PlayerSeason, Player.player_id == PlayerSeason.player_id)
        .filter(
            Player.team_id == team_id,
            Player.current_year.in_(['FR', 'SO', 'JR']),  # Only FR, SO, JR can transfer
            PlayerSeason.season_id == season_id,
            Player.career_stats.like('Transferred from %')  # Only players who transferred
        )
        .all()
    )
    
    return jsonify([
        {
            'player_id': t[0].player_id, 
            'name': t[0].name, 
            'position': t[0].position, 
            'dev_trait': t[0].dev_trait,
            'height': t[0].height,
            'weight': t[0].weight,
            'state': t[0].state,
            'ovr_rating': t[1].ovr_rating,
            'previous_school': t[0].career_stats.replace('Transferred from ', '') if t[0].career_stats and 'Transferred from ' in t[0].career_stats else None,
            'current_status': t[0].current_year
        }
        for t in transfers
    ]) 