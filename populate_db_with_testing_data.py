from app import app
from extensions import db
from models import Season, Conference, Team, TeamSeason, Player, PlayerSeason, Game, Award, AwardWinner, Honor
import random
import os
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
                off_ppg=None, def_ppg=None, sacks=None, interceptions=None,
                offense_yards_rank=None, defense_yards_rank=None, pass_yards_rank=None, rush_yards_rank=None, pass_tds_rank=None, rush_tds_rank=None, off_ppg_rank=None, def_ppg_rank=None, sacks_rank=None, interceptions_rank=None, points_for_rank=None, points_against_rank=None
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
def get_logo_filename(team_name):
    """Convert team name to logo filename format."""
    # Handle special cases first
    special_cases = {
        "Texas A&M Aggies": "Texas_AM_Aggies",
        "Louisiana Ragin' Cajuns": "Louisiana_Ragin_Cajuns",
        "Louisiana-Monroe Warhawks": "UL_Monroe_Warhawks",
        "Miami RedHawks": "Miami_OH_RedHawks",
        "San José State Spartans": "San_José_State_Spartans",
        "Ole Miss Rebels": "Ole_Miss_Rebels",
        "Connecticut Huskies": "UConn_Huskies",
        "FIU Panthers": "Florida_International_Panthers",
        "Florida Atlantic Owls": "Florida_Atlantic_Owls",
        "Appalachian State Mountaineers": "App_State_Mountaineers",
        "Arizona State Sun Devils": "Arizona_State_Sun_Devils",
        "Arkansas State Red Wolves": "Arkansas_State_Red_Wolves",
        "Boise State Broncos": "Boise_State_Broncos",
        "Boston College Eagles": "Boston_College_Eagles",
        "Bowling Green Falcons": "Bowling_Green_Falcons",
        "Central Michigan Chippewas": "Central_Michigan_Chippewas",
        "Charlotte 49ers": "Charlotte_49ers",
        "Cincinnati Bearcats": "Cincinnati_Bearcats",
        "Clemson Tigers": "Clemson_Tigers",
        "Coastal Carolina Chanticleers": "Coastal_Carolina_Chanticleers",
        "Colorado Buffaloes": "Colorado_Buffaloes",
        "Colorado State Rams": "Colorado_State_Rams",
        "Duke Blue Devils": "Duke_Blue_Devils",
        "East Carolina Pirates": "East_Carolina_Pirates",
        "Eastern Michigan Eagles": "Eastern_Michigan_Eagles",
        "Florida Gators": "Florida_Gators",
        "Florida State Seminoles": "Florida_State_Seminoles",
        "Fresno State Bulldogs": "Fresno_State_Bulldogs",
        "Georgia Bulldogs": "Georgia_Bulldogs",
        "Georgia Southern Eagles": "Georgia_Southern_Eagles",
        "Georgia State Panthers": "Georgia_State_Panthers",
        "Georgia Tech Yellow Jackets": "Georgia_Tech_Yellow_Jackets",
        "Hawaii Rainbow Warriors": "Hawaii_Rainbow_Warriors",
        "Houston Cougars": "Houston_Cougars",
        "Illinois Fighting Illini": "Illinois_Fighting_Illini",
        "Indiana Hoosiers": "Indiana_Hoosiers",
        "Iowa Hawkeyes": "Iowa_Hawkeyes",
        "Iowa State Cyclones": "Iowa_State_Cyclones",
        "Jacksonville State Gamecocks": "Jacksonville_State_Gamecocks",
        "James Madison Dukes": "James_Madison_Dukes",
        "Kansas Jayhawks": "Kansas_Jayhawks",
        "Kansas State Wildcats": "Kansas_State_Wildcats",
        "Kent State Golden Flashes": "Kent_State_Golden_Flashes",
        "Kentucky Wildcats": "Kentucky_Wildcats",
        "Liberty Flames": "Liberty_Flames",
        "Louisville Cardinals": "Louisville_Cardinals",
        "Marshall Thundering Herd": "Marshall_Thundering_Herd",
        "Maryland Terrapins": "Maryland_Terrapins",
        "Massachusetts Minutemen": "Massachusetts_Minutemen",
        "Memphis Tigers": "Memphis_Tigers",
        "Miami Hurricanes": "Miami_Hurricanes",
        "Michigan Wolverines": "Michigan_Wolverines",
        "Michigan State Spartans": "Michigan_State_Spartans",
        "Middle Tennessee Blue Raiders": "Middle_Tennessee_Blue_Raiders",
        "Minnesota Golden Gophers": "Minnesota_Golden_Gophers",
        "Mississippi State Bulldogs": "Mississippi_State_Bulldogs",
        "Missouri Tigers": "Missouri_Tigers",
        "Navy Midshipmen": "Navy_Midshipmen",
        "NC State Wolfpack": "NC_State_Wolfpack",
        "Nebraska Cornhuskers": "Nebraska_Cornhuskers",
        "Nevada Wolf Pack": "Nevada_Wolf_Pack",
        "New Mexico Lobos": "New_Mexico_Lobos",
        "New Mexico State Aggies": "New_Mexico_State_Aggies",
        "North Carolina Tar Heels": "North_Carolina_Tar_Heels",
        "North Texas Mean Green": "North_Texas_Mean_Green",
        "Northern Illinois Huskies": "Northern_Illinois_Huskies",
        "Northwestern Wildcats": "Northwestern_Wildcats",
        "Notre Dame Fighting Irish": "Notre_Dame_Fighting_Irish",
        "Ohio Bobcats": "Ohio_Bobcats",
        "Ohio State Buckeyes": "Ohio_State_Buckeyes",
        "Oklahoma Sooners": "Oklahoma_Sooners",
        "Oklahoma State Cowboys": "Oklahoma_State_Cowboys",
        "Old Dominion Monarchs": "Old_Dominion_Monarchs",
        "Oregon Ducks": "Oregon_Ducks",
        "Oregon State Beavers": "Oregon_State_Beavers",
        "Penn State Nittany Lions": "Penn_State_Nittany_Lions",
        "Pittsburgh Panthers": "Pittsburgh_Panthers",
        "Purdue Boilermakers": "Purdue_Boilermakers",
        "Rice Owls": "Rice_Owls",
        "Rutgers Scarlet Knights": "Rutgers_Scarlet_Knights",
        "San Diego State Aztecs": "San_Diego_State_Aztecs",
        "San Jose State Spartans": "San_José_State_Spartans",
        "SMU Mustangs": "SMU_Mustangs",
        "South Alabama Jaguars": "South_Alabama_Jaguars",
        "South Carolina Gamecocks": "South_Carolina_Gamecocks",
        "South Florida Bulls": "South_Florida_Bulls",
        "Southern Miss Golden Eagles": "Southern_Miss_Golden_Eagles",
        "Stanford Cardinal": "Stanford_Cardinal",
        "Syracuse Orange": "Syracuse_Orange",
        "TCU Horned Frogs": "TCU_Horned_Frogs",
        "Temple Owls": "Temple_Owls",
        "Tennessee Volunteers": "Tennessee_Volunteers",
        "Texas Longhorns": "Texas_Longhorns",
        "Texas State Bobcats": "Texas_State_Bobcats",
        "Texas Tech Red Raiders": "Texas_Tech_Red_Raiders",
        "Toledo Rockets": "Toledo_Rockets",
        "Troy Trojans": "Troy_Trojans",
        "Tulane Green Wave": "Tulane_Green_Wave",
        "Tulsa Golden Hurricane": "Tulsa_Golden_Hurricane",
        "UAB Blazers": "UAB_Blazers",
        "UCF Knights": "UCF_Knights",
        "UCLA Bruins": "UCLA_Bruins",
        "UNLV Rebels": "UNLV_Rebels",
        "USC Trojans": "USC_Trojans",
        "Utah Utes": "Utah_Utes",
        "Utah State Aggies": "Utah_State_Aggies",
        "UTEP Miners": "UTEP_Miners",
        "UTSA Roadrunners": "UTSA_Roadrunners",
        "Vanderbilt Commodores": "Vanderbilt_Commodores",
        "Virginia Cavaliers": "Virginia_Cavaliers",
        "Virginia Tech Hokies": "Virginia_Tech_Hokies",
        "Wake Forest Demon Deacons": "Wake_Forest_Demon_Deacons",
        "Washington Huskies": "Washington_Huskies",
        "Washington State Cougars": "Washington_State_Cougars",
        "West Virginia Mountaineers": "West_Virginia_Mountaineers",
        "Western Kentucky Hilltoppers": "Western_Kentucky_Hilltoppers",
        "Western Michigan Broncos": "Western_Michigan_Broncos",
        "Wisconsin Badgers": "Wisconsin_Badgers",
        "Wyoming Cowboys": "Wyoming_Cowboys"
    }
    if team_name in special_cases:
        logo_path = f"college_football_logos/{special_cases[team_name]}.png"
    else:
        # Default conversion: replace spaces with underscores and add .png
        logo_name = team_name.replace(" ", "_").replace("'", "")
        logo_path = f"college_football_logos/{logo_name}.png"
    # Check if the logo file exists, if not return a placeholder
    if not os.path.exists(logo_path):
        print(f"Warning: Logo file not found for {team_name}: {logo_path}")
        return "college_football_logos/placeholder.png"  # You might want to add a placeholder logo
    return logo_path
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
        logo_url = get_logo_filename(team_data[0])
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
            off_ppg=None, def_ppg=None, sacks=None, interceptions=None,
            offense_yards_rank=None, defense_yards_rank=None, pass_yards_rank=None, rush_yards_rank=None, pass_tds_rank=None, rush_tds_rank=None, off_ppg_rank=None, def_ppg_rank=None, sacks_rank=None, interceptions_rank=None, points_for_rank=None, points_against_rank=None
        ))
    db.session.commit()
    # --- Add a random freshman recruit, a transfer, and a couple of players to the user team roster ---
    if user_team:
        # Add a random freshman recruit (committed)
        from routes.recruiting import Recruit
        recruit = Recruit(
            name="Dylan Freshman",
            position="QB",
            recruit_stars=4,
            recruit_rank_nat=101,
            recruit_rank_pos=10,
            speed=88,
            dev_trait="Star",
            height="6'3\"",
            weight=210,
            state="TX",
            team_id=user_team.team_id,
            season_id=season.season_id,
            committed=True
        )
        db.session.add(recruit)
        db.session.flush()
        # Add a random transfer (committed)
        from routes.transfer import Transfer
        transfer = Transfer(
            name="Marcus Transfer",
            position="RB",
            previous_school="Old U",
            ovr_rating=85,
            recruit_stars=3,
            recruit_rank_pos=22,
            dev_trait="Impact",
            height="5'11\"",
            weight=200,
            state="CA",
            current_status="SO",
            team_id=user_team.team_id,
            season_id=season.season_id,
            committed=True
        )
        db.session.add(transfer)
        db.session.flush()
        # Add a couple of players directly to the roster
        player1 = Player(
            name="Chris Junior",
            position="WR",
            recruit_stars=3,
            recruit_rank_nat=200,
            state="FL",
            team_id=user_team.team_id
        )
        db.session.add(player1)
        db.session.flush()
        db.session.add(PlayerSeason(
            player_id=player1.player_id,
            season_id=season.season_id,
            team_id=user_team.team_id,
            player_class="JR",
            current_year="JR",
            redshirted=False,
            ovr_rating=82,
            speed=92,
            dev_trait="Normal",
            weight=185,
            height="6'0\"",
            completions=60,
            attempts=100,
            pass_yards=800,
            pass_tds=7,
            interceptions=3,
            rush_attempts=20,
            rush_yards=120,
            rush_tds=2,
            longest_rush=25,
            rush_fumbles=1,
            receptions=40,
            rec_yards=600,
            rec_tds=5,
            longest_rec=55,
            rec_drops=3,
            tackles=0,
            tfl=0,
            sacks=0,
            forced_fumbles=0,
            def_tds=0
        ))
        player2 = Player(
            name="Alex Senior",
            position="LB",
            recruit_stars=2,
            recruit_rank_nat=350,
            state="GA",
            team_id=user_team.team_id
        )
        db.session.add(player2)
        db.session.flush()
        db.session.add(PlayerSeason(
            player_id=player2.player_id,
            season_id=season.season_id,
            team_id=user_team.team_id,
            player_class="SR",
            current_year="SR",
            redshirted=False,
            ovr_rating=79,
            speed=80,
            dev_trait="Normal",
            weight=225,
            height="6'2\"",
            completions=0,
            attempts=0,
            pass_yards=0,
            pass_tds=0,
            interceptions=1,
            rush_attempts=5,
            rush_yards=20,
            rush_tds=0,
            longest_rush=8,
            rush_fumbles=0,
            receptions=0,
            rec_yards=0,
            rec_tds=0,
            longest_rec=0,
            rec_drops=0,
            tackles=90,
            tfl=12,
            sacks=4,
            forced_fumbles=2,
            def_tds=1
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
    # --- Create empty 12-team playoff bracket for the season ---
    playoff_games = [
        # First Round (week 17)
        {"week": 17, "playoff_round": "First Round", "home_seed": 5, "away_seed": 12},
        {"week": 17, "playoff_round": "First Round", "home_seed": 6, "away_seed": 11},
        {"week": 17, "playoff_round": "First Round", "home_seed": 7, "away_seed": 10},
        {"week": 17, "playoff_round": "First Round", "home_seed": 8, "away_seed": 9},
        # Quarterfinals (week 18)
        {"week": 18, "playoff_round": "Quarterfinals", "home_seed": 1},
        {"week": 18, "playoff_round": "Quarterfinals", "home_seed": 2},
        {"week": 18, "playoff_round": "Quarterfinals", "home_seed": 3},
        {"week": 18, "playoff_round": "Quarterfinals", "home_seed": 4},
        # Semifinals (week 19)
        {"week": 19, "playoff_round": "Semifinals"},
        {"week": 19, "playoff_round": "Semifinals"},
        # Championship (week 20)
        {"week": 20, "playoff_round": "Championship"},
    ]
    # Get top 12 teams by final_rank
    top_12_teams = TeamSeason.query.filter(TeamSeason.final_rank != None).order_by(TeamSeason.final_rank.asc()).limit(12).all()
    seeds = {ts.final_rank: ts.team_id for ts in top_12_teams}
    for g_info in playoff_games:
        home_id = seeds.get(g_info.get("home_seed")) if g_info.get("home_seed") else None
        away_id = seeds.get(g_info.get("away_seed")) if g_info.get("away_seed") else None
        game = Game(
            season_id=season.season_id,
            week=g_info["week"],
            home_team_id=home_id,
            away_team_id=away_id,
            game_type="Playoff",
            playoff_round=g_info["playoff_round"]
        )
        db.session.add(game)
    db.session.commit()
    print("Database has been populated with a single season and randomized data.")
    # Test logo mapping for a few teams
    test_teams = ["Texas Longhorns", "Alabama Crimson Tide", "Michigan Wolverines", "Georgia Bulldogs"]
    print("\nTesting logo mapping:")
    for team in test_teams:
        logo_path = get_logo_filename(team)
        exists = os.path.exists(logo_path)
        status = "✓" if exists else "✗"
        print(f"{status} {team}: {logo_path}")
# --- BACKFILL: Ensure all PlayerSeason.player_class and current_year fields are set ---
with app.app_context():
    player_seasons = PlayerSeason.query.filter(
        (PlayerSeason.player_class == None) |
        (PlayerSeason.player_class == "") |
        (PlayerSeason.current_year == None)
    ).all()
    for ps in player_seasons:
        if not ps.player_class:
            ps.player_class = "FR"  # Default to FR if unknown
        if not ps.current_year:
            ps.current_year = ps.player_class  # Use player_class as current_year
        if ps.redshirted is None:
            ps.redshirted = False  # Default redshirt status
    db.session.commit()
# --- Add National Awards and Winners for 2024 Season ---
    # Re-query season and teams to avoid DetachedInstanceError
    season = Season.query.filter_by(year=2024).first()
    teams = Team.query.all()
    abbr_to_team = {t.abbreviation: t for t in teams}
    national_awards = [
        {"name": "Bear Bryant COTY Award", "recipient": "Brian Hunter", "team_abbr": "LIB", "position": "HC"},
        {"name": "Broyles Award", "recipient": "Greg Daniels", "team_abbr": "GAST", "position": "AST"},
        {"name": "Heisman Trophy Award", "recipient": "JeyQuan Smith", "team_abbr": "USF", "position": "QB"},
        {"name": "Davey O'Brien Award (QB)", "recipient": "Byrum Brown", "team_abbr": "USF", "position": "QB"},
        {"name": "Doak Walker Award (RB)", "recipient": "Phil Mafah", "team_abbr": "CLEM", "position": "RB"},
        {"name": "Biletnikoff Award (WR)", "recipient": "JeyQuan Smith", "team_abbr": "USF", "position": "WR"},
        {"name": "John Mackey Award (TE)", "recipient": "Jake Briningstool", "team_abbr": "CLEM", "position": "TE"},
        {"name": "Rimington Trophy (OL)", "recipient": "Tate Ratledge", "team_abbr": "UGA", "position": "OL"},
        {"name": "Nagurski Award (DPOTY)", "recipient": "Jason Henderson", "team_abbr": "ODU", "position": "LB"},
        {"name": "Ted Hendricks Award (DE)", "recipient": "T.J. Parker", "team_abbr": "CLEM", "position": "DE"},
        {"name": "Butkus Award (LB)", "recipient": "Jason Henderson", "team_abbr": "ODU", "position": "LB"},
        {"name": "Jim Thorpe Award (DB)", "recipient": "Jeremiah Johnson", "team_abbr": "GAST", "position": "DB"},
    ]
    for award_info in national_awards:
        # Create or get Award
        award = Award.query.filter_by(name=award_info["name"]).first()
        if not award:
            award = Award(name=award_info["name"], description=f"{award_info['name']} winner")
            db.session.add(award)
            db.session.flush()
        # Get team
        team = abbr_to_team.get(award_info["team_abbr"])
        if not team:
            continue  # skip if team not found
        # Find or create player
        player = Player.query.filter_by(name=award_info["recipient"], team_id=team.team_id).first()
        if not player:
            player = Player(name=award_info["recipient"], position=award_info["position"], team_id=team.team_id)
            db.session.add(player)
            db.session.flush()
        # Ensure PlayerSeason exists for this player/team/season
        ps = PlayerSeason.query.filter_by(player_id=player.player_id, season_id=season.season_id, team_id=team.team_id).first()
        if not ps:
            ps = PlayerSeason(player_id=player.player_id, season_id=season.season_id, team_id=team.team_id, player_class="SR", current_year="SR", redshirted=False)
            db.session.add(ps)
            db.session.flush()
        # Create AwardWinner
        aw = AwardWinner.query.filter_by(award_id=award.award_id, season_id=season.season_id, player_id=player.player_id, team_id=team.team_id).first()
        if not aw:
            aw = AwardWinner(award_id=award.award_id, season_id=season.season_id, player_id=player.player_id, team_id=team.team_id)
            db.session.add(aw)
    db.session.commit()
# --- End National Awards ---
    # Add national-level honors
    national_honors = [
        Honor(name="National Offensive Player of the Week", side="offense", conference_id=None),
        Honor(name="National Defensive Player of the Week", side="defense", conference_id=None),
        Honor(name="All-American", side=None, conference_id=None),
    ]
    db.session.add_all(national_honors)
    db.session.commit()
    # Refetch conferences to avoid DetachedInstanceError
    for conf in Conference.query.all():
        conf_off_player_of_week = Honor(
            name=f"{conf.name} Offensive Player of the Week",
            side="offense",
            conference_id=conf.conference_id
        )
        conf_def_player_of_week = Honor(
            name=f"{conf.name} Defensive Player of the Week",
            side="defense",
            conference_id=conf.conference_id
        )
        conf_all_team = Honor(
            name=f"All {conf.name}",
            side=None,
            conference_id=conf.conference_id
        )
        db.session.add(conf_off_player_of_week)
        db.session.add(conf_def_player_of_week)
        db.session.add(conf_all_team)
    db.session.commit()