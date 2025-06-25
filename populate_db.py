from app import app
from extensions import db
from models import Season, Conference, Team, TeamSeason, Player, PlayerSeason, Game, Award, AwardWinner, Honor
import random

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

    # FBS Teams (school, abbreviation, conference)
    fbs_teams = [
        ("Air Force Falcons", "AF", "Mountain West"),
        ("Akron Zips", "AKR", "MAC"),
        ("Alabama Crimson Tide", "BAMA", "SEC"),
        ("Appalachian State Mountaineers", "APP", "Sun Belt"),
        ("Arizona Wildcats", "ARIZ", "Pac-12"),
        ("Arizona State Sun Devils", "ASU", "Pac-12"),
        ("Arkansas Razorbacks", "ARK", "SEC"),
        ("Arkansas State Red Wolves", "ARST", "Sun Belt"),
        ("Army Black Knights", "ARMY", "Independents"),
        ("Auburn Tigers", "AUB", "SEC"),
        ("Ball State Cardinals", "BALL", "MAC"),
        ("Baylor Bears", "BAY", "Big 12"),
        ("Boise State Broncos", "BSU", "Mountain West"),
        ("Boston College Eagles", "BC", "ACC"),
        ("Bowling Green Falcons", "BGSU", "MAC"),
        ("Buffalo Bulls", "BUFF", "MAC"),
        ("BYU Cougars", "BYU", "Big 12"),
        ("California Golden Bears", "CAL", "Pac-12"),
        ("Central Michigan Chippewas", "CMU", "MAC"),
        ("Charlotte 49ers", "CLT", "American"),
        ("Cincinnati Bearcats", "CIN", "Big 12"),
        ("Clemson Tigers", "CLEM", "ACC"),
        ("Coastal Carolina Chanticleers", "CCU", "Sun Belt"),
        ("Colorado Buffaloes", "COLO", "Pac-12"),
        ("Colorado State Rams", "CSU", "Mountain West"),
        ("Connecticut Huskies", "UCONN", "Independents"),
        ("Duke Blue Devils", "DUKE", "ACC"),
        ("East Carolina Pirates", "ECU", "American"),
        ("Eastern Michigan Eagles", "EMU", "MAC"),
        ("FIU Panthers", "FIU", "Conference USA"),
        ("Florida Atlantic Owls", "FAU", "American"),
        ("Florida Gators", "UF", "SEC"),
        ("Florida International Panthers", "FIU", "Conference USA"),
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
        ("Kansas State Wildcats", "KSU", "Big 12"),
        ("Kent State Golden Flashes", "KENT", "MAC"),
        ("Kentucky Wildcats", "UK", "SEC"),
        ("Liberty Flames", "LIB", "Conference USA"),
        ("Louisiana Ragin' Cajuns", "ULL", "Sun Belt"),
        ("Louisiana-Monroe Warhawks", "ULM", "Sun Belt"),
        ("Louisiana State Tigers", "LSU", "SEC"),
        ("Louisville Cardinals", "LOU", "ACC"),
        ("Marshall Thundering Herd", "MRSH", "Sun Belt"),
        ("Maryland Terrapins", "UMD", "Big Ten"),
        ("Massachusetts Minutemen", "UMASS", "Independents"),
        ("Memphis Tigers", "MEM", "American"),
        ("Miami Hurricanes", "MIA", "ACC"),
        ("Miami RedHawks", "M-OH", "MAC"),
        ("Michigan Wolverines", "MICH", "Big Ten"),
        ("Michigan State Spartans", "MSU", "Big Ten"),
        ("Middle Tennessee Blue Raiders", "MTSU", "Conference USA"),
        ("Minnesota Golden Gophers", "MINN", "Big Ten"),
        ("Mississippi Rebels", "MISS", "SEC"),
        ("Mississippi State Bulldogs", "MSST", "SEC"),
        ("Missouri Tigers", "MIZZ", "SEC"),
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
        ("Oklahoma Sooners", "OU", "Big 12"),
        ("Oklahoma State Cowboys", "OKST", "Big 12"),
        ("Old Dominion Monarchs", "ODU", "Sun Belt"),
        ("Ole Miss Rebels", "MISS", "SEC"),
        ("Oregon Ducks", "ORE", "Pac-12"),
        ("Oregon State Beavers", "ORST", "Pac-12"),
        ("Penn State Nittany Lions", "PSU", "Big Ten"),
        ("Pittsburgh Panthers", "PITT", "ACC"),
        ("Purdue Boilermakers", "PUR", "Big Ten"),
        ("Rice Owls", "RICE", "American"),
        ("Rutgers Scarlet Knights", "RUTG", "Big Ten"),
        ("San Diego State Aztecs", "SDSU", "Mountain West"),
        ("San Jose State Spartans", "SJSU", "Mountain West"),
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
        ("Texas Longhorns", "TEX", "Big 12"),
        ("Texas State Bobcats", "TXST", "Sun Belt"),
        ("Texas Tech Red Raiders", "TTU", "Big 12"),
        ("Toledo Rockets", "TOL", "MAC"),
        ("Troy Trojans", "TROY", "Sun Belt"),
        ("Tulane Green Wave", "TULN", "American"),
        ("Tulsa Golden Hurricane", "TLSA", "American"),
        ("UAB Blazers", "UAB", "American"),
        ("UCLA Bruins", "UCLA", "Pac-12"),
        ("UCF Knights", "UCF", "Big 12"),
        ("UConn Huskies", "UCONN", "Independents"),
        ("UMass Minutemen", "UMASS", "Independents"),
        ("UNLV Rebels", "UNLV", "Mountain West"),
        ("USC Trojans", "USC", "Pac-12"),
        ("Utah Utes", "UTAH", "Pac-12"),
        ("Utah State Aggies", "USU", "Mountain West"),
        ("UTEP Miners", "UTEP", "Conference USA"),
        ("UTSA Roadrunners", "UTSA", "American"),
        ("Vanderbilt Commodores", "VAN", "SEC"),
        ("Virginia Cavaliers", "UVA", "ACC"),
        ("Virginia Tech Hokies", "VT", "ACC"),
        ("Wake Forest Demon Deacons", "WF", "ACC"),
        ("Washington Huskies", "UW", "Pac-12"),
        ("Washington State Cougars", "WSU", "Pac-12"),
        ("West Virginia Mountaineers", "WVU", "Big 12"),
        ("Western Kentucky Hilltoppers", "WKU", "Conference USA"),
        ("Western Michigan Broncos", "WMU", "MAC"),
        ("Wisconsin Badgers", "WISC", "Big Ten"),
        ("Wyoming Cowboys", "WYO", "Mountain West"),
    ]
    logo_map = {
        "AF": "air-force",
        "AKR": "akron",
        "BAMA": "alabama",
        "APP": "appalachian-state",
        "ARIZ": "arizona",
        "ASU": "arizona-state",
        "ARK": "arkansas",
        "ARST": "arkansas-state",
        "ARMY": "army",
        "AUB": "auburn",
        "BALL": "ball-state",
        "BAY": "baylor",
        "BSU": "boise-state",
        "BC": "boston-college",
        "BGSU": "bowling-green",
        "BUFF": "buffalo",
        "BYU": "byu",
        "CAL": "california",
        "CMU": "central-michigan",
        "CLT": "charlotte",
        "CIN": "cincinnati",
        "CLEM": "clemson",
        "CCU": "coastal-carolina",
        "COLO": "colorado",
        "CSU": "colorado-state",
        "UCONN": "connecticut",
        "DUKE": "duke",
        "ECU": "east-carolina",
        "EMU": "eastern-michigan",
        "FIU": "fiu",
        "FAU": "florida-atlantic",
        "UF": "florida",
        "FSU": "florida-state",
        "FRES": "fresno-state",
        "UGA": "georgia",
        "GASO": "georgia-southern",
        "GAST": "georgia-state",
        "GT": "georgia-tech",
        "HAW": "hawaii",
        "HOU": "houston",
        "ILL": "illinois",
        "IND": "indiana",
        "IOWA": "iowa",
        "ISU": "iowa-state",
        "JSU": "jacksonville-state",
        "JMU": "james-madison",
        "KU": "kansas",
        "KSU": "kansas-state",
        "KENT": "kent-state",
        "UK": "kentucky",
        "LIB": "liberty",
        "ULL": "louisiana",
        "ULM": "louisiana-monroe",
        "LSU": "lsu",
        "LOU": "louisville",
        "MRSH": "marshall",
        "UMD": "maryland",
        "UMASS": "umass",
        "MEM": "memphis",
        "MIA": "miami-fl",
        "M-OH": "miami-oh",
        "MICH": "michigan",
        "MSU": "michigan-state",
        "MTSU": "middle-tennessee",
        "MINN": "minnesota",
        "MISS": "ole-miss",
        "MSST": "mississippi-state",
        "MIZZ": "missouri",
        "NAVY": "navy",
        "NCST": "nc-state",
        "NEB": "nebraska",
        "NEV": "nevada",
        "UNM": "new-mexico",
        "NMSU": "new-mexico-state",
        "UNC": "north-carolina",
        "UNT": "north-texas",
        "NIU": "northern-illinois",
        "NW": "northwestern",
        "ND": "notre-dame",
        "OHIO": "ohio",
        "OSU": "ohio-state",
        "OU": "oklahoma",
        "OKST": "oklahoma-state",
        "ODU": "old-dominion",
        "ORE": "oregon",
        "ORST": "oregon-state",
        "PSU": "penn-state",
        "PITT": "pittsburgh",
        "PUR": "purdue",
        "RICE": "rice",
        "RUTG": "rutgers",
        "SDSU": "san-diego-state",
        "SJSU": "san-jose-state",
        "SMU": "smu",
        "USA": "south-alabama",
        "SCAR": "south-carolina",
        "USF": "south-florida",
        "USM": "southern-miss",
        "STAN": "stanford",
        "SYR": "syracuse",
        "TCU": "tcu",
        "TEM": "temple",
        "TENN": "tennessee",
        "TAMU": "texas-am",
        "TEX": "texas",
        "TXST": "texas-state",
        "TTU": "texas-tech",
        "TOL": "toledo",
        "TROY": "troy",
        "TULN": "tulane",
        "TLSA": "tulsa",
        "UAB": "uab",
        "UCLA": "ucla",
        "UCF": "ucf",
        "UNLV": "unlv",
        "USC": "usc",
        "UTAH": "utah",
        "USU": "utah-state",
        "UTEP": "utep",
        "UTSA": "utsa",
        "VAN": "vanderbilt",
        "UVA": "virginia",
        "VT": "virginia-tech",
        "WF": "wake-forest",
        "UW": "washington",
        "WSU": "washington-state",
        "WVU": "west-virginia",
        "WKU": "western-kentucky",
        "WMU": "western-michigan",
        "WISC": "wisconsin",
        "WYO": "wyoming"
    }

    # Teams
    team_objs = []
    user_team_id = None
    for name, abbr, conf in fbs_teams:
        is_user = abbr == "BALL"
        logo_suffix = logo_map.get(abbr, abbr.lower())
        logo_url = f"https://a.espncdn.com/i/teamlogos/ncaa/500/{logo_suffix}.png"
        team = Team(
            name=name,
            abbreviation=abbr,
            primary_conference_id=conf_objs.get(conf, conf_objs["Independents"]).conference_id,
            logo_url=logo_url,
            is_user_controlled=is_user
        )
        team_objs.append(team)
        if is_user:
            user_team_id = team.team_id
    db.session.add_all(team_objs)
    db.session.commit()

    # Seasons
    seasons = [Season(year=2022), Season(year=2023), Season(year=2024)]
    db.session.add_all(seasons)
    db.session.commit()

    # TeamSeasons
    team_seasons = []
    for season in seasons:
        for team in team_objs:
            conf_id = team.primary_conference_id
            conf_wins = random.randint(0, 8)
            conf_losses = random.randint(0, 8)
            if conf_wins + conf_losses > 12:
                if conf_wins > conf_losses:
                    conf_wins = 12 - conf_losses
                else:
                    conf_losses = 12 - conf_wins
            team_seasons.append(TeamSeason(
                team_id=team.team_id,
                season_id=season.season_id,
                conference_id=conf_id,
                wins=random.randint(5, 13),
                losses=random.randint(0, 7),
                conference_wins=conf_wins,
                conference_losses=conf_losses,
                points_for=random.randint(200, 600),
                points_against=random.randint(150, 500),
                offense_yards=random.randint(3000, 7000),
                defense_yards=random.randint(3000, 7000),
                prestige=str(random.randint(70, 99)),
                team_rating=str(random.randint(70, 99)),
                final_rank=random.randint(1, 25),
                recruiting_rank=random.randint(1, 50)
            ))
    db.session.add_all(team_seasons)
    db.session.commit()

    # Players (only for user team)
    positions = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K"]
    players = []
    for team in team_objs:
        if not team.is_user_controlled:
            continue
        for i in range(10):  # 10 players for user team
            p = Player(
                name=f"{team.abbreviation} Player {i+1}",
                position=random.choice(positions),
                recruit_stars=random.randint(2, 5),
                recruit_rank_nat=random.randint(1, 1000),
                team_id=team.team_id,
                current_year=random.choice(["FR", "SO", "JR", "SR"]),
                redshirted=random.choice([True, False]),
                career_stats="{}"
            )
            players.append(p)
    db.session.add_all(players)
    db.session.commit()

    # PlayerSeasons (only for user team)
    player_seasons = []
    for season in seasons:
        for player in players:
            player_seasons.append(PlayerSeason(
                player_id=player.player_id,
                season_id=season.season_id,
                team_id=player.team_id,
                player_class=random.choice(["FR", "SO", "JR", "SR"]),
                ovr_rating=random.randint(60, 99),
                games_played=random.randint(1, 15),
                pass_yards=random.randint(0, 4000),
                pass_tds=random.randint(0, 40),
                rush_yards=random.randint(0, 2000),
                rush_tds=random.randint(0, 25),
                rec_yards=random.randint(0, 1500),
                rec_tds=random.randint(0, 20),
                tackles=random.randint(0, 120),
                sacks=random.randint(0, 15),
                interceptions=random.randint(0, 10),
                awards=""
            ))
    db.session.add_all(player_seasons)
    db.session.commit()

    # Games (only for user team)
    games = []
    for season in seasons:
        user_team = next((t for t in team_objs if t.is_user_controlled), None)
        if not user_team:
            continue
        # Schedule 12 games: 6 home, 6 away, vs random other teams
        other_teams = [t for t in team_objs if t.team_id != user_team.team_id]
        random.shuffle(other_teams)
        for week in range(1, 13):
            opp = other_teams[week % len(other_teams)]
            if week % 2 == 0:
                home_team_id = user_team.team_id
                away_team_id = opp.team_id
            else:
                home_team_id = opp.team_id
                away_team_id = user_team.team_id
            games.append(Game(
                season_id=season.season_id,
                week=week,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                home_score=random.randint(10, 60),
                away_score=random.randint(10, 60),
                overtime=random.choice([True, False]),
                game_type="Regular",
                playoff_round=None,
                neutral_site=random.choice([True, False])
            ))
    db.session.add_all(games)
    db.session.commit()

    # Ensure TBD team exists
    tbd_team = Team.query.filter_by(name='TBD').first()
    if not tbd_team:
        tbd_team = Team(name='TBD', abbreviation='TBD', primary_conference_id=list(conf_objs.values())[0].conference_id)
        db.session.add(tbd_team)
        db.session.commit()

    # Ensure weeks 0-16 exist for all seasons
    for season in seasons:
        user_team = next((t for t in team_objs if t.is_user_controlled), None)
        if not user_team:
            continue
        for week in range(17):
            # Check if a game already exists for this week in this season
            existing = Game.query.filter_by(season_id=season.season_id, week=week).first()
            if not existing:
                db.session.add(Game(
                    season_id=season.season_id,
                    week=week,
                    home_team_id=user_team.team_id,
                    away_team_id=user_team.team_id,
                    game_type="Bye Week"
                ))
    db.session.commit()

    # Awards
    awards = [
        Award(name="Heisman Trophy", description="Best player in college football"),
        Award(name="Best QB", description="Best quarterback"),
        Award(name="Best RB", description="Best running back"),
    ]
    db.session.add_all(awards)
    db.session.commit()

    # AwardWinners
    award_winners = []
    for season in seasons:
        for award in awards:
            player = random.choice(players)
            award_winners.append(AwardWinner(
                award_id=award.award_id,
                season_id=season.season_id,
                player_id=player.player_id,
                team_id=player.team_id
            ))
    db.session.add_all(award_winners)
    db.session.commit()

    # Honors
    honors = []
    for season in seasons:
        for player in random.sample(players, 10):
            honors.append(Honor(
                player_id=player.player_id,
                team_id=player.team_id,
                season_id=season.season_id,
                honor_type=random.choice(["All-Conference", "All-American"])
            ))
    db.session.add_all(honors)
    db.session.commit()

    print("Database populated with example data!")

# --- BACKFILL TEAMSEASON RECORDS FOR ALL SEASONS/TEAMS ---
def backfill_user_team_seasons():
    seasons = Season.query.all()
    user_team = Team.query.filter_by(is_user_controlled=True).first()
    if not user_team:
        print("No user-controlled team found.")
        return
    created = 0
    for season in seasons:
        ts = TeamSeason.query.filter_by(season_id=season.season_id, team_id=user_team.team_id).first()
        if not ts:
            conference_id = user_team.primary_conference_id
            if not conference_id:
                first_conf = Conference.query.first()
                conference_id = first_conf.conference_id if first_conf else None
            ts = TeamSeason(team_id=user_team.team_id, season_id=season.season_id, conference_id=conference_id)
            db.session.add(ts)
            created += 1
    db.session.commit()
    print(f"Created {created} missing TeamSeason records for user-controlled team.")

    # Recalculate records for user-controlled team in all seasons
    for season in seasons:
        ts = TeamSeason.query.filter_by(season_id=season.season_id, team_id=user_team.team_id).first()
        if not ts:
            continue
        games = Game.query.filter(
            Game.season_id == season.season_id,
            ((Game.home_team_id == user_team.team_id) | (Game.away_team_id == user_team.team_id))
        ).all()
        wins = losses = conf_wins = conf_losses = 0
        for g in games:
            if g.home_score is None or g.away_score is None or g.game_type not in ("Regular", "Conference"):
                continue
            is_home = g.home_team_id == user_team.team_id
            is_away = g.away_team_id == user_team.team_id
            team_score = g.home_score if is_home else g.away_score
            opp_score = g.away_score if is_home else g.home_score
            if team_score > opp_score:
                wins += 1
            elif team_score < opp_score:
                losses += 1
            # Conference win/loss: only if both teams are in the same conference and game_type is 'Conference'
            if g.game_type == 'Conference' and g.home_team_id and g.away_team_id:
                home_ts = TeamSeason.query.filter_by(season_id=season.season_id, team_id=g.home_team_id).first()
                away_ts = TeamSeason.query.filter_by(season_id=season.season_id, team_id=g.away_team_id).first()
                if home_ts and away_ts and home_ts.conference_id and away_ts.conference_id and home_ts.conference_id == away_ts.conference_id:
                    if is_home and g.home_score > g.away_score:
                        conf_wins += 1
                    elif is_home and g.home_score < g.away_score:
                        conf_losses += 1
                    elif is_away and g.away_score > g.home_score:
                        conf_wins += 1
                    elif is_away and g.away_score < g.home_score:
                        conf_losses += 1
        ts.wins = wins
        ts.losses = losses
        ts.conference_wins = conf_wins
        ts.conference_losses = conf_losses
        db.session.add(ts)
    db.session.commit()
    print("Recalculated win/loss records for user-controlled team.")

if __name__ == "__main__":
    with app.app_context():
        backfill_user_team_seasons() 