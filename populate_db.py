from app import app
from extensions import db
from models import Season, Conference, Team, TeamSeason, Player, PlayerSeason, Game, Award, AwardWinner, Honor
import random

def backfill_all_season_games(tbd_team_id):
    """Ensure every season has a full 17-week schedule."""
    seasons = Season.query.all()
    user_team = Team.query.filter_by(is_user_controlled=True).first()
    if not user_team: return

    for season in seasons:
        for week in range(17): # Weeks 0-16
            game_exists = Game.query.filter_by(season_id=season.season_id, week=week).first()
            if not game_exists:
                # Create a placeholder game with TBD teams
                game = Game(
                    season_id=season.season_id,
                    week=week,
                    home_team_id=tbd_team_id,
                    away_team_id=tbd_team_id,
                )
                db.session.add(game)
    db.session.commit()

def backfill_user_team_seasons():
    """Ensure the user-controlled team has a TeamSeason record for every season."""
    user_team = Team.query.filter_by(is_user_controlled=True).first()
    if not user_team: return
    
    seasons = Season.query.all()
    for season in seasons:
        team_season = TeamSeason.query.filter_by(
            team_id=user_team.team_id, 
            season_id=season.season_id
        ).first()

        if not team_season:
            team_season = TeamSeason(
                team_id=user_team.team_id,
                season_id=season.season_id,
                conference_id=user_team.primary_conference_id,
                wins=0, losses=0, conference_wins=0, conference_losses=0,
                points_for=None, points_against=None, offense_yards=None, defense_yards=None,
                pass_yards=None, rush_yards=None, pass_tds=None, rush_tds=None,
                off_ppg=None, def_ppg=None, sacks=None, interceptions=None
            )
            db.session.add(team_season)
    db.session.commit()

def create_placeholder_game(season_id, week):
    # Find a "TBD" team or create one
    tbd_team = Team.query.filter_by(name="TBD").first()
    if not tbd_team:
        tbd_team = Team(name="TBD", abbreviation="TBD", is_user_controlled=False)
        db.session.add(tbd_team)
        db.session.commit()

    game = Game(
        season_id=season_id,
        week=week,
        home_team_id=tbd_team.team_id,
        away_team_id=tbd_team.team_id,
    )
    db.session.add(game)
    db.session.commit()
    return game

with app.app_context():
    db.drop_all()
    db.create_all()

    # FBS Conferences
    fbs_confs = [
        "ACC", "American", "Big 12", "Big Ten", "Conference USA", "MAC", "Mountain West", "Pac-12", "SEC", "Sun Belt", "Independents"
    ]
    conf_objs = {name: Conference(name=name, tier=1) for name in fbs_confs}
    db.session.add_all(conf_objs.values())
    db.session.commit()

    # FBS Teams data
    fbs_teams = [
        ("Air Force Falcons", "AF", "Mountain West"), ("Akron Zips", "AKR", "MAC"), ("Alabama Crimson Tide", "BAMA", "SEC"),
        ("Appalachian State Mountaineers", "APP", "Sun Belt"), ("Arizona Wildcats", "ARIZ", "Pac-12"), ("Arizona State Sun Devils", "ASU", "Pac-12"),
        ("Arkansas Razorbacks", "ARK", "SEC"), ("Arkansas State Red Wolves", "ARST", "Sun Belt"), ("Army Black Knights", "ARMY", "Independents"),
        ("Auburn Tigers", "AUB", "SEC"), ("Ball State Cardinals", "BALL", "MAC"), ("Baylor Bears", "BAY", "Big 12"),
        ("Boise State Broncos", "BSU", "Mountain West"), ("Boston College Eagles", "BC", "ACC"), ("Bowling Green Falcons", "BGSU", "MAC"),
        ("Buffalo Bulls", "BUFF", "MAC"), ("BYU Cougars", "BYU", "Big 12"), ("California Golden Bears", "CAL", "Pac-12"),
        ("Central Michigan Chippewas", "CMU", "MAC"), ("Charlotte 49ers", "CLT", "American"), ("Cincinnati Bearcats", "CIN", "Big 12"),
        ("Clemson Tigers", "CLEM", "ACC"), ("Coastal Carolina Chanticleers", "CCU", "Sun Belt"), ("Colorado Buffaloes", "COLO", "Pac-12"),
        ("Colorado State Rams", "CSU", "Mountain West"), ("Connecticut Huskies", "UCONN", "Independents"), ("Duke Blue Devils", "DUKE", "ACC"),
        ("East Carolina Pirates", "ECU", "American"), ("Eastern Michigan Eagles", "EMU", "MAC"), ("FIU Panthers", "FIU", "Conference USA"),
        ("Florida Atlantic Owls", "FAU", "American"), ("Florida Gators", "UF", "SEC"), ("Florida State Seminoles", "FSU", "ACC"),
        ("Fresno State Bulldogs", "FRES", "Mountain West"), ("Georgia Bulldogs", "UGA", "SEC"), ("Georgia Southern Eagles", "GASO", "Sun Belt"),
        ("Georgia State Panthers", "GAST", "Sun Belt"), ("Georgia Tech Yellow Jackets", "GT", "ACC"), ("Hawaii Rainbow Warriors", "HAW", "Mountain West"),
        ("Houston Cougars", "HOU", "Big 12"), ("Illinois Fighting Illini", "ILL", "Big Ten"), ("Indiana Hoosiers", "IND", "Big Ten"),
        ("Iowa Hawkeyes", "IOWA", "Big Ten"), ("Iowa State Cyclones", "ISU", "Big 12"), ("Jacksonville State Gamecocks", "JSU", "Conference USA"),
        ("James Madison Dukes", "JMU", "Sun Belt"), ("Kansas Jayhawks", "KU", "Big 12"), ("Kansas State Wildcats", "KSU", "Big 12"),
        ("Kent State Golden Flashes", "KENT", "MAC"), ("Kentucky Wildcats", "UK", "SEC"), ("Liberty Flames", "LIB", "Conference USA"),
        ("Louisiana Ragin' Cajuns", "ULL", "Sun Belt"), ("Louisiana-Monroe Warhawks", "ULM", "Sun Belt"), ("LSU Tigers", "LSU", "SEC"),
        ("Louisville Cardinals", "LOU", "ACC"), ("Marshall Thundering Herd", "MRSH", "Sun Belt"), ("Maryland Terrapins", "UMD", "Big Ten"),
        ("Massachusetts Minutemen", "UMASS", "Independents"), ("Memphis Tigers", "MEM", "American"), ("Miami Hurricanes", "MIA", "ACC"),
        ("Miami RedHawks", "M-OH", "MAC"), ("Michigan Wolverines", "MICH", "Big Ten"), ("Michigan State Spartans", "MSU", "Big Ten"),
        ("Middle Tennessee Blue Raiders", "MTSU", "Conference USA"), ("Minnesota Golden Gophers", "MINN", "Big Ten"),
        ("Ole Miss Rebels", "MISS", "SEC"), ("Mississippi State Bulldogs", "MSST", "SEC"), ("Missouri Tigers", "MIZZ", "SEC"),
        ("Navy Midshipmen", "NAVY", "American"), ("NC State Wolfpack", "NCST", "ACC"), ("Nebraska Cornhuskers", "NEB", "Big Ten"),
        ("Nevada Wolf Pack", "NEV", "Mountain West"), ("New Mexico Lobos", "UNM", "Mountain West"), ("New Mexico State Aggies", "NMSU", "Conference USA"),
        ("North Carolina Tar Heels", "UNC", "ACC"), ("North Texas Mean Green", "UNT", "American"), ("Northern Illinois Huskies", "NIU", "MAC"),
        ("Northwestern Wildcats", "NW", "Big Ten"), ("Notre Dame Fighting Irish", "ND", "Independents"), ("Ohio Bobcats", "OHIO", "MAC"),
        ("Ohio State Buckeyes", "OSU", "Big Ten"), ("Oklahoma Sooners", "OU", "Big 12"), ("Oklahoma State Cowboys", "OKST", "Big 12"),
        ("Old Dominion Monarchs", "ODU", "Sun Belt"), ("Oregon Ducks", "ORE", "Pac-12"), ("Oregon State Beavers", "ORST", "Pac-12"),
        ("Penn State Nittany Lions", "PSU", "Big Ten"), ("Pittsburgh Panthers", "PITT", "ACC"), ("Purdue Boilermakers", "PUR", "Big Ten"),
        ("Rice Owls", "RICE", "American"), ("Rutgers Scarlet Knights", "RUTG", "Big Ten"), ("San Diego State Aztecs", "SDSU", "Mountain West"),
        ("San Jose State Spartans", "SJSU", "Mountain West"), ("SMU Mustangs", "SMU", "ACC"), ("South Alabama Jaguars", "USA", "Sun Belt"),
        ("South Carolina Gamecocks", "SCAR", "SEC"), ("South Florida Bulls", "USF", "American"), ("Southern Miss Golden Eagles", "USM", "Sun Belt"),
        ("Stanford Cardinal", "STAN", "ACC"), ("Syracuse Orange", "SYR", "ACC"), ("TCU Horned Frogs", "TCU", "Big 12"),
        ("Temple Owls", "TEM", "American"), ("Tennessee Volunteers", "TENN", "SEC"), ("Texas A&M Aggies", "TAMU", "SEC"),
        ("Texas Longhorns", "TEX", "Big 12"), ("Texas State Bobcats", "TXST", "Sun Belt"), ("Texas Tech Red Raiders", "TTU", "Big 12"),
        ("Toledo Rockets", "TOL", "MAC"), ("Troy Trojans", "TROY", "Sun Belt"), ("Tulane Green Wave", "TULN", "American"),
        ("Tulsa Golden Hurricane", "TLSA", "American"), ("UAB Blazers", "UAB", "American"), ("UCLA Bruins", "UCLA", "Pac-12"),
        ("UCF Knights", "UCF", "Big 12"), ("UNLV Rebels", "UNLV", "Mountain West"), ("USC Trojans", "USC", "Pac-12"),
        ("Utah Utes", "UTAH", "Pac-12"), ("Utah State Aggies", "USU", "Mountain West"), ("UTEP Miners", "UTEP", "Conference USA"),
        ("UTSA Roadrunners", "UTSA", "American"), ("Vanderbilt Commodores", "VAN", "SEC"), ("Virginia Cavaliers", "UVA", "ACC"),
        ("Virginia Tech Hokies", "VT", "ACC"), ("Wake Forest Demon Deacons", "WF", "ACC"), ("Washington Huskies", "UW", "Pac-12"),
        ("Washington State Cougars", "WSU", "Pac-12"), ("West Virginia Mountaineers", "WVU", "Big 12"), ("Western Kentucky Hilltoppers", "WKU", "Conference USA"),
        ("Western Michigan Broncos", "WMU", "MAC"), ("Wisconsin Badgers", "WISC", "Big Ten"), ("Wyoming Cowboys", "WYO", "Mountain West")
    ]
    logo_map = {t[1]: t[0].lower().replace(" ", "-").replace("'", "") for t in fbs_teams}

    # Create a single season
    season = Season(year=2024)
    db.session.add(season)
    db.session.commit()

    # Create Teams and initial TeamSeason records
    all_teams = []
    user_team = None
    teams_map = {}
    for team_data in fbs_teams:
        if team_data[0] in teams_map: continue

        is_user_controlled = team_data[0] == "Texas Longhorns"
        logo_url = f"https://a.espncdn.com/i/teamlogos/ncaa/500/{logo_map.get(team_data[1], '')}.png"
        
        team_obj = Team(
            name=team_data[0], abbreviation=team_data[1],
            primary_conference_id=conf_objs[team_data[2]].conference_id,
            is_user_controlled=is_user_controlled, logo_url=logo_url
        )
        if is_user_controlled: user_team = team_obj
        
        all_teams.append(team_obj)
        teams_map[team_data[0]] = team_obj
        db.session.add(team_obj)

        # Create TeamSeason with null/0 stats for now
        db.session.add(TeamSeason(
            team=team_obj, season=season, conference=conf_objs[team_data[2]],
            wins=0, losses=0, conference_wins=0, conference_losses=0,
            points_for=None, points_against=None, offense_yards=None, defense_yards=None,
            pass_yards=None, rush_yards=None, pass_tds=None, rush_tds=None,
            off_ppg=None, def_ppg=None, sacks=None, interceptions=None
        ))
    db.session.commit()

    # --- Generate schedule and record for user team ---
    if user_team:
        other_teams = [t for t in all_teams if t.team_id != user_team.team_id]
        random.shuffle(other_teams)
        
        games_to_create, user_stats = [], {
            'wins': 0, 'losses': 0, 'conf_wins': 0, 'conf_losses': 0, 'pf': 0, 'pa': 0
        }

        for i in range(12): # 12 regular season games
            opponent = other_teams[i]
            user_score, opp_score = random.randint(7, 52), random.randint(7, 52)
            if user_score == opp_score: user_score += 1
            
            user_stats['pf'] += user_score
            user_stats['pa'] += opp_score
            
            is_conf_game = user_team.primary_conference_id == opponent.primary_conference_id
            
            if user_score > opp_score:
                user_stats['wins'] += 1
                if is_conf_game: user_stats['conf_wins'] += 1
            else:
                user_stats['losses'] += 1
                if is_conf_game: user_stats['conf_losses'] += 1

            games_to_create.append(Game(
                season_id=season.season_id, week=i + 1,
                home_team_id=user_team.team_id if i % 2 == 0 else opponent.team_id,
                away_team_id=opponent.team_id if i % 2 == 0 else user_team.team_id,
                home_score=user_score if i % 2 == 0 else opp_score,
                away_score=opp_score if i % 2 == 0 else user_score
            ))
        db.session.add_all(games_to_create)

        # Update user team's TeamSeason record
        user_ts = TeamSeason.query.filter_by(team_id=user_team.team_id, season_id=season.season_id).first()
        if user_ts:
            user_ts.wins, user_ts.losses = user_stats['wins'], user_stats['losses']
            user_ts.conference_wins, user_ts.conference_losses = user_stats['conf_wins'], user_stats['conf_losses']
            user_ts.points_for, user_ts.points_against = user_stats['pf'], user_stats['pa']
            user_ts.off_ppg, user_ts.def_ppg = round(user_stats['pf'] / 12, 1), round(user_stats['pa'] / 12, 1)
            # Randomize other stats for user team for a populated look
            user_ts.pass_yards, user_ts.rush_yards = random.randint(2000, 4500), random.randint(1500, 3000)
            user_ts.pass_tds, user_ts.rush_tds = random.randint(15, 40), random.randint(10, 30)
            user_ts.sacks, user_ts.interceptions = random.randint(10, 40), random.randint(5, 20)
            user_ts.offense_yards = user_ts.pass_yards + user_ts.rush_yards
            user_ts.defense_yards = random.randint(3000, 6000)

    # --- Populate random stats for all other teams ---
    non_user_team_seasons = TeamSeason.query.filter(
        TeamSeason.season_id == season.season_id,
        TeamSeason.team_id != (user_team.team_id if user_team else -1)
    ).all()
    
    ranks = list(range(1, len(non_user_team_seasons) + 1))
    random.shuffle(ranks)
    
    for i, ts in enumerate(non_user_team_seasons):
        ts.wins, ts.losses = random.randint(0, 12), 0
        ts.losses = 12 - ts.wins
        ts.conference_wins, ts.conference_losses = random.randint(0, 8), 0
        ts.conference_losses = 8 - ts.conference_wins
        ts.final_rank = ranks[i]
        
        ts.points_for, ts.points_against = random.randint(200, 600), random.randint(150, 500)
        ts.off_ppg, ts.def_ppg = round(ts.points_for / 12, 1), round(ts.points_against / 12, 1)
        ts.pass_yards, ts.rush_yards = random.randint(2000, 4500), random.randint(1500, 3000)
        ts.pass_tds, ts.rush_tds = random.randint(15, 40), random.randint(10, 30)
        ts.sacks, ts.interceptions = random.randint(10, 40), random.randint(5, 20)
        ts.offense_yards = ts.pass_yards + ts.rush_yards
        ts.defense_yards = random.randint(3000, 6000)

    db.session.commit()

    print("Database has been populated with a single season and randomized data.") 