from app import app
from extensions import db
from models import Season, Conference, Team, TeamSeason, Award, Honor, Game
import os


def get_logo_filename(team_name):
    """Convert team name to logo filename format."""
    # Handle special cases first
    special_cases = {
        "Texas A&M Aggies": "Texas_AM_Aggies",
        "Louisiana Ragin' Cajuns": "Louisiana_Ragin_Cajuns",
        "Louisiana Tech Bulldogs": "Louisiana_Tech_Bulldogs",
        "Louisiana-Monroe Warhawks": "UL_Monroe_Warhawks",
        "Miami RedHawks": "Miami_OH_RedHawks",
        "San José State Spartans": "San_José_State_Spartans",
        "Ole Miss Rebels": "Ole_Miss_Rebels",
        "Connecticut Huskies": "UConn_Huskies",
        "Delaware Blue Hens": "Delaware_Blue_Hens",
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
        "Kennesaw State Owls": "Kennesaw_State_Owls",
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
        "Michigan State Spartans": "Michigan_State_Spartans",
        "Michigan Wolverines": "Michigan_Wolverines",
        "Middle Tennessee Blue Raiders": "Middle_Tennessee_Blue_Raiders",
        "Minnesota Golden Gophers": "Minnesota_Golden_Gophers",
        "Mississippi State Bulldogs": "Mississippi_State_Bulldogs",
        "Missouri Tigers": "Missouri_Tigers",
        "Missouri State Bears": "Missouri_State_Bears",
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
        "Sam Houston Bearkats": "Sam_Houston_Bearkats",
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
        # Try SVG first, then PNG
        svg_path = f"college_football_logos/{special_cases[team_name]}.svg"
        png_path = f"college_football_logos/{special_cases[team_name]}.png"
        
        if os.path.exists(svg_path):
            logo_path = svg_path
        elif os.path.exists(png_path):
            logo_path = png_path
        else:
            print(f"Warning: Logo file not found for {team_name}: {svg_path} or {png_path}")
            return "college_football_logos/placeholder.svg"  # Use SVG placeholder
    else:
        # Default conversion: replace spaces with underscores and try both formats
        logo_name = team_name.replace(" ", "_").replace("'", "")
        svg_path = f"college_football_logos/{logo_name}.svg"
        png_path = f"college_football_logos/{logo_name}.png"
        
        if os.path.exists(svg_path):
            logo_path = svg_path
        elif os.path.exists(png_path):
            logo_path = png_path
        else:
            print(f"Warning: Logo file not found for {team_name}: {svg_path} or {png_path}")
            return "college_football_logos/placeholder.svg"  # Use SVG placeholder

    return logo_path


with app.app_context():
    # Clear existing data
    db.drop_all()
    db.create_all()
    print("Database cleared and recreated.")

    # Create FBS Conferences
    fbs_confs = [
        "ACC", "American", "Big 12", "Big Ten", "Conference USA", "MAC",
        "Mountain West", "Pac-12", "SEC", "Sun Belt", "Independents"
    ]
    conf_objs = {
        name: Conference(name=name, tier=1)
        for name in fbs_confs
    }
    db.session.add_all(conf_objs.values())
    db.session.commit()
    print(f"Created {len(fbs_confs)} conferences.")

    # Create 2026 Season
    season = Season(year=2026)
    db.session.add(season)
    db.session.commit()
    print(f"Created season: {season.year}")

    # FBS Teams data
    fbs_teams = [
        ("Air Force Falcons", "AF", "Mountain West"),
        ("Akron Zips", "AKR", "MAC"),
        ("Alabama Crimson Tide", "BAMA", "SEC"),
        ("Appalachian State Mountaineers", "APP", "Sun Belt"),
        ("Arizona Wildcats", "ARIZ", "Big 12"),
        ("Arizona State Sun Devils", "ASU", "Big 12"),
        ("Arkansas Razorbacks", "ARK", "SEC"),
        ("Arkansas State Red Wolves", "ARST", "Sun Belt"),
        ("Army Black Knights", "ARMY", "American"),
        ("Auburn Tigers", "AUB", "SEC"),
        ("Ball State Cardinals", "BALL", "MAC"),
        ("Baylor Bears", "BAY", "Big 12"),
        ("Boise State Broncos", "BSU", "Mountain West"),
        ("Boston College Eagles", "BC", "ACC"),
        ("Bowling Green Falcons", "BGSU", "MAC"),
        ("Buffalo Bulls", "BUFF", "MAC"),
        ("BYU Cougars", "BYU", "Big 12"),
        ("California Golden Bears", "CAL", "ACC"),
        ("Central Michigan Chippewas", "CMU", "MAC"),
        ("Charlotte 49ers", "CLT", "American"),
        ("Cincinnati Bearcats", "CIN", "Big 12"),
        ("Clemson Tigers", "CLEM", "ACC"),
        ("Coastal Carolina Chanticleers", "CCU", "Sun Belt"),
        ("Colorado Buffaloes", "COLO", "Big 12"),
        ("Colorado State Rams", "CSU", "Mountain West"),
        ("Connecticut Huskies", "UCONN", "Independents"),
        ("Delaware Blue Hens", "DEL", "Conference USA"),
        ("Duke Blue Devils", "DUKE", "ACC"),
        ("East Carolina Pirates", "ECU", "American"),
        ("Eastern Michigan Eagles", "EMU", "MAC"),
        ("FIU Panthers", "FIU", "Conference USA"),
        ("Florida Atlantic Owls", "FAU", "American"),
        ("Florida Gators", "UF", "SEC"),
        ("Florida State Seminoles", "FSU", "ACC"),
        ("Fresno State Bulldogs", "FRES", "Mountain West"),
        ("Georgia Bulldogs", "UGA", "SEC"),
        ("Georgia Southern Eagles", "GASO", "Sun Belt"),
        ("Georgia State Panthers", "GAST", "Sun Belt"),
        ("Georgia Tech Yellow Jackets", "GT", "ACC"),
        ("Hawaii Rainbow Warriors", "HAW", "Mountain West"),
        ("Houston Cougars", "HOU", "Big 12"),
        ("Illinois Fighting Illini", "ILL", "Big Ten"),
        ("Indiana Hoosiers", "IND", "Big Ten"),
        ("Iowa Hawkeyes", "IOWA", "Big Ten"),
        ("Iowa State Cyclones", "ISU", "Big 12"),
        ("Jacksonville State Gamecocks", "JSU", "Conference USA"),
        ("James Madison Dukes", "JMU", "Sun Belt"),
        ("Kansas Jayhawks", "KU", "Big 12"),
        ("Kennesaw State Owls", "KENN", "Conference USA"),
        ("Kansas State Wildcats", "KSU", "Big 12"),
        ("Kent State Golden Flashes", "KENT", "MAC"),
        ("Kentucky Wildcats", "UK", "SEC"),
        ("Liberty Flames", "LIB", "Conference USA"),
        ("Louisiana Ragin' Cajuns", "ULL", "Sun Belt"),
        ("Louisiana Tech Bulldogs", "LA Tech", "Conference USA"),
        ("Louisiana-Monroe Warhawks", "ULM", "Sun Belt"),
        ("LSU Tigers", "LSU", "SEC"),
        ("Louisville Cardinals", "LOU", "ACC"),
        ("Marshall Thundering Herd", "MRSH", "Sun Belt"),
        ("Maryland Terrapins", "UMD", "Big Ten"),
        ("Massachusetts Minutemen", "UMASS", "MAC"),
        ("Memphis Tigers", "MEM", "American"),
        ("Miami Hurricanes", "MIA", "ACC"),
        ("Miami RedHawks", "M-OH", "MAC"),
        ("Michigan Wolverines", "MICH", "Big Ten"),
        ("Michigan State Spartans", "MSU", "Big Ten"),
        ("Middle Tennessee Blue Raiders", "MTSU", "Conference USA"),
        ("Minnesota Golden Gophers", "MINN", "Big Ten"),
        ("Ole Miss Rebels", "MISS", "SEC"),
        ("Mississippi State Bulldogs", "MSST", "SEC"),
        ("Missouri Tigers", "MIZZ", "SEC"),
        ("Missouri State Bears", "MSU", "Conference USA"),
        ("Navy Midshipmen", "NAVY", "American"),
        ("NC State Wolfpack", "NCST", "ACC"),
        ("Nebraska Cornhuskers", "NEB", "Big Ten"),
        ("Nevada Wolf Pack", "NEV", "Mountain West"),
        ("New Mexico Lobos", "UNM", "Mountain West"),
        ("New Mexico State Aggies", "NMSU", "Conference USA"),
        ("North Carolina Tar Heels", "UNC", "ACC"),
        ("North Texas Mean Green", "UNT", "American"),
        ("Northern Illinois Huskies", "NIU", "MAC"),
        ("Northwestern Wildcats", "NW", "Big Ten"),
        ("Notre Dame Fighting Irish", "ND", "Independents"),
        ("Ohio Bobcats", "OHIO", "MAC"),
        ("Ohio State Buckeyes", "OSU", "Big Ten"),
        ("Oklahoma Sooners", "OU", "SEC"),
        ("Oklahoma State Cowboys", "OKST", "Big 12"),
        ("Old Dominion Monarchs", "ODU", "Sun Belt"),
        ("Oregon Ducks", "ORE", "Big Ten"),
        ("Oregon State Beavers", "ORST", "Pac-12"),
        ("Penn State Nittany Lions", "PSU", "Big Ten"),
        ("Pittsburgh Panthers", "PITT", "ACC"),
        ("Purdue Boilermakers", "PUR", "Big Ten"),
        ("Rice Owls", "RICE", "American"),
        ("Rutgers Scarlet Knights", "RUTG", "Big Ten"),
        ("San Diego State Aztecs", "SDSU", "Mountain West"),
        ("San Jose State Spartans", "SJSU", "Mountain West"),
        ("Sam Houston Bearkats", "SHSU", "Conference USA"),
        ("SMU Mustangs", "SMU", "ACC"),
        ("South Alabama Jaguars", "USA", "Sun Belt"),
        ("South Carolina Gamecocks", "SCAR", "SEC"),
        ("South Florida Bulls", "USF", "American"),
        ("Southern Miss Golden Eagles", "USM", "Sun Belt"),
        ("Stanford Cardinal", "STAN", "ACC"),
        ("Syracuse Orange", "SYR", "ACC"),
        ("TCU Horned Frogs", "TCU", "Big 12"),
        ("Temple Owls", "TEM", "American"),
        ("Tennessee Volunteers", "TENN", "SEC"),
        ("Texas A&M Aggies", "TAMU", "SEC"),
        ("Texas Longhorns", "TEX", "SEC"),
        ("Texas State Bobcats", "TXST", "Sun Belt"),
        ("Texas Tech Red Raiders", "TTU", "Big 12"),
        ("Toledo Rockets", "TOL", "MAC"),
        ("Troy Trojans", "TROY", "Sun Belt"),
        ("Tulane Green Wave", "TULN", "American"),
        ("Tulsa Golden Hurricane", "TLSA", "American"),
        ("UAB Blazers", "UAB", "American"),
        ("UCLA Bruins", "UCLA", "Big Ten"),
        ("UCF Knights", "UCF", "Big 12"),
        ("UNLV Rebels", "UNLV", "Mountain West"),
        ("USC Trojans", "USC", "Big Ten"),
        ("Utah Utes", "UTAH", "Big 12"),
        ("Utah State Aggies", "USU", "Mountain West"),
        ("UTEP Miners", "UTEP", "Conference USA"),
        ("UTSA Roadrunners", "UTSA", "American"),
        ("Vanderbilt Commodores", "VAN", "SEC"),
        ("Virginia Cavaliers", "UVA", "ACC"),
        ("Virginia Tech Hokies", "VT", "ACC"),
        ("Wake Forest Demon Deacons", "WF", "ACC"),
        ("Washington Huskies", "UW", "Big Ten"),
        ("Washington State Cougars", "WSU", "Pac-12"),
        ("West Virginia Mountaineers", "WVU", "Big 12"),
        ("Western Kentucky Hilltoppers", "WKU", "Conference USA"),
        ("Western Michigan Broncos", "WMU", "MAC"),
        ("Wisconsin Badgers", "WISC", "Big Ten"),
        ("Wyoming Cowboys", "WYO", "Mountain West")
    ]

    # Create Teams and initial TeamSeason records
    all_teams = []
    teams_map = {}
    for team_data in fbs_teams:
        if team_data[0] in teams_map:
            continue
        is_user_controlled = team_data[0] == "Texas Longhorns"
        logo_url = get_logo_filename(team_data[0])
        team_obj = Team(
            name=team_data[0], abbreviation=team_data[1],
            primary_conference_id=conf_objs[team_data[2]].conference_id,
            is_user_controlled=is_user_controlled, logo_url=logo_url
        )
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
            offense_yards_rank=None, defense_yards_rank=None, pass_yards_rank=None,
            rush_yards_rank=None, pass_tds_rank=None, rush_tds_rank=None,
            off_ppg_rank=None, def_ppg_rank=None, sacks_rank=None, interceptions_rank=None,
            points_for_rank=None, points_against_rank=None
        ))
    db.session.commit()
    print(f"Created {len(all_teams)} teams with TeamSeason records.")

    # -------------------------
    # Initialize schedule with bye weeks for every team in every regular season week
    # -------------------------
    REGULAR_SEASON_WEEKS = 12  # Typical number of regular-season weeks prior to playoffs
    bye_games = []
    for week in range(1, REGULAR_SEASON_WEEKS + 1):
        for team in all_teams:
            bye_games.append(Game(
                season_id=season.season_id,
                week=week,
                home_team_id=team.team_id,
                away_team_id=None,
                game_type="Bye Week"
            ))
    db.session.add_all(bye_games)
    db.session.commit()
    print(f"Created bye-week schedule: {len(bye_games)} games across {REGULAR_SEASON_WEEKS} weeks.")

    # -------------------------
    # Set initial Top-25 rankings for the season
    # -------------------------
    top_25_teams = [
        "Alabama Crimson Tide", "Texas Longhorns", "Ohio State Buckeyes", "Penn State Nittany Lions",
        "Notre Dame Fighting Irish", "Georgia Bulldogs", "Clemson Tigers", "Texas A&M Aggies",
        "Oregon Ducks", "LSU Tigers", "Miami Hurricanes", "Florida Gators", "Texas Tech Red Raiders",
        "Arizona State Sun Devils", "Michigan Wolverines", "Ole Miss Rebels", "Oklahoma Sooners",
        "Indiana Hoosiers", "SMU Mustangs", "Tennessee Volunteers", "Missouri Tigers", "Auburn Tigers",
        "Duke Blue Devils", "South Carolina Gamecocks", "Illinois Fighting Illini"
    ]
    team_name_to_rank = {name: idx + 1 for idx, name in enumerate(top_25_teams)}

    team_seasons = TeamSeason.query.filter_by(season_id=season.season_id).all()
    for ts in team_seasons:
        if ts.team and ts.team.name in team_name_to_rank:
            ts.final_rank = team_name_to_rank[ts.team.name]
    db.session.commit()
    print("Assigned initial Top-25 national rankings.")

    # Create National Awards
    national_awards = [
        {"name": "Bear Bryant COTY Award", "description": "College Football Coach of the Year"},
        {"name": "Broyles Award", "description": "Assistant Coach of the Year"},
        {"name": "Heisman Trophy Award", "description": "Most Outstanding Player in College Football"},
        {"name": "Davey O'Brien Award (QB)", "description": "Best Quarterback"},
        {"name": "Doak Walker Award (RB)", "description": "Best Running Back"},
        {"name": "Biletnikoff Award (WR)", "description": "Best Wide Receiver"},
        {"name": "John Mackey Award (TE)", "description": "Best Tight End"},
        {"name": "Rimington Trophy (OL)", "description": "Best Center"},
        {"name": "Nagurski Award (DPOTY)", "description": "Defensive Player of the Year"},
        {"name": "Ted Hendricks Award (DE)", "description": "Best Defensive End"},
        {"name": "Butkus Award (LB)", "description": "Best Linebacker"},
        {"name": "Jim Thorpe Award (DB)", "description": "Best Defensive Back"},
        {"name": "Lou Groza Award (K)", "description": "Best Placekicker"},
        {"name": "Ray Guy Award (P)", "description": "Best Punter"},
        {"name": "Walter Camp Award", "description": "Player of the Year"},
        {"name": "Maxwell Award", "description": "College Player of the Year"},
        {"name": "Bednarik Award", "description": "Defensive Player of the Year"},
        {"name": "Outland Trophy", "description": "Best Interior Lineman"},
        {"name": "Lombardi Award", "description": "Best Lineman or Linebacker"},
        {"name": "Lott Trophy", "description": "Defensive Impact Player of the Year"},
    ]
    for award_info in national_awards:
        award = Award(name=award_info["name"], description=award_info["description"])
        db.session.add(award)
    db.session.commit()
    print(f"Created {len(national_awards)} national awards.")

    # Create National Honors
    national_honors = [
        Honor(name="National Offensive Player of the Week", side="offense", conference_id=None),
        Honor(name="National Defensive Player of the Week", side="defense", conference_id=None),
        Honor(name="All-American", side=None, conference_id=None),
        Honor(name="All-American First Team", side=None, conference_id=None),
        Honor(name="All-American Second Team", side=None, conference_id=None),
        Honor(name="All-American Third Team", side=None, conference_id=None),
        Honor(name="All-American Honorable Mention", side=None, conference_id=None),
    ]
    db.session.add_all(national_honors)
    db.session.commit()
    print(f"Created {len(national_honors)} national honors.")

    # Create Conference Honors for each conference
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
        conf_all_conf = Honor(
            name=f"{conf.name} All-Conference",
            side=None,
            conference_id=conf.conference_id
        )
        conf_all_conf_first = Honor(
            name=f"{conf.name} All-Conference First Team",
            side=None,
            conference_id=conf.conference_id
        )
        conf_all_conf_second = Honor(
            name=f"{conf.name} All-Conference Second Team",
            side=None,
            conference_id=conf.conference_id
        )
        db.session.add_all([
            conf_off_player_of_week,
            conf_def_player_of_week,
            conf_all_conf,
            conf_all_conf_first,
            conf_all_conf_second
        ])
    db.session.commit()
    print(f"Created conference honors for all {len(Conference.query.all())} conferences.")

    print("\n=== Clean Installation Complete ===")
    print(f"✓ Created season: {season.year}")
    print(f"✓ Created {len(all_teams)} teams")
    print(f"✓ Created {len(Conference.query.all())} conferences")
    print(f"✓ Created {len(Award.query.all())} awards")
    print(f"✓ Created {len(Honor.query.all())} honors")
    print("✓ No games, players, award winners, or honor winners created")
    print("\nDatabase is ready for manual data entry!")
