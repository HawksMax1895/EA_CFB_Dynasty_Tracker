from app import app
from extensions import db
from models import Season, Conference, Team, TeamSeason, Player, PlayerSeason, Game, Award, AwardWinner, Honor
import random

with app.app_context():
    db.drop_all()
    db.create_all()

    # Conferences
    confs = [
        Conference(name="SEC", tier=1),
        Conference(name="Big Ten", tier=1),
        Conference(name="Sun Belt", tier=2),
    ]
    db.session.add_all(confs)
    db.session.commit()

    # Seasons
    seasons = [Season(year=2022), Season(year=2023), Season(year=2024)]
    db.session.add_all(seasons)
    db.session.commit()

    # Teams
    teams = [
        Team(name="Alabama Crimson Tide", abbreviation="BAMA", primary_conference_id=confs[0].conference_id, is_user_controlled=True, logo_url="https://via.placeholder.com/100?text=BAMA"),
        Team(name="Georgia Bulldogs", abbreviation="UGA", primary_conference_id=confs[0].conference_id, logo_url="https://via.placeholder.com/100?text=UGA"),
        Team(name="Ohio State Buckeyes", abbreviation="OSU", primary_conference_id=confs[1].conference_id, logo_url="https://via.placeholder.com/100?text=OSU"),
        Team(name="Appalachian State Mountaineers", abbreviation="APP", primary_conference_id=confs[2].conference_id, logo_url="https://via.placeholder.com/100?text=APP"),
    ]
    db.session.add_all(teams)
    db.session.commit()

    # TeamSeasons
    team_seasons = []
    for season in seasons:
        for team in teams:
            conf_id = team.primary_conference_id
            team_seasons.append(TeamSeason(
                team_id=team.team_id,
                season_id=season.season_id,
                conference_id=conf_id,
                wins=random.randint(5, 13),
                losses=random.randint(0, 7),
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

    # Players
    positions = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K"]
    players = []
    for team in teams:
        for i in range(10):  # 10 players per team
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

    # PlayerSeasons
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

    # Games
    games = []
    for season in seasons:
        for week in range(1, 13):
            for i in range(0, len(teams), 2):
                if i+1 < len(teams):
                    games.append(Game(
                        season_id=season.season_id,
                        week=week,
                        home_team_id=teams[i].team_id,
                        away_team_id=teams[i+1].team_id,
                        home_score=random.randint(10, 60),
                        away_score=random.randint(10, 60),
                        overtime=random.choice([True, False]),
                        game_type="Regular",
                        playoff_round=None,
                        neutral_site=random.choice([True, False])
                    ))
    db.session.add_all(games)
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