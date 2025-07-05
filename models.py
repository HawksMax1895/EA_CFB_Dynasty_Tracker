from extensions import db


class Season(db.Model):
    __tablename__ = 'seasons'
    season_id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False, unique=True)
    team_seasons = db.relationship('TeamSeason', backref='season', lazy=True)
    games = db.relationship('Game', backref='season', lazy=True)
    award_winners = db.relationship('AwardWinner', backref='season', lazy=True)
    player_seasons = db.relationship('PlayerSeason', backref='season', lazy=True)

    def get_previous(self):
        return Season.query.filter(Season.year < self.year).order_by(Season.year.desc()).first()

    def get_next(self):
        return Season.query.filter(Season.year > self.year).order_by(Season.year.asc()).first()


class Conference(db.Model):
    __tablename__ = 'conferences'
    conference_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, unique=True)
    tier = db.Column(db.Integer)
    team_seasons = db.relationship('TeamSeason', backref='conference', lazy=True)


class Team(db.Model):
    __tablename__ = 'teams'
    team_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, unique=True)
    abbreviation = db.Column(db.String(10))
    primary_conference_id = db.Column(db.Integer, db.ForeignKey('conferences.conference_id'))
    is_user_controlled = db.Column(db.Boolean, default=False)
    logo_url = db.Column(db.String(256))  # URL or path to the logo image
    team_seasons = db.relationship('TeamSeason', backref='team', lazy=True)
    player_seasons = db.relationship('PlayerSeason', backref='team', lazy=True)
    players = db.relationship('Player', backref='current_team', lazy=True, foreign_keys='Player.team_id')
    award_winners = db.relationship('AwardWinner', backref='team', lazy=True)


class TeamSeason(db.Model):
    __tablename__ = 'team_seasons'
    team_season_id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.season_id'), nullable=False)
    conference_id = db.Column(db.Integer, db.ForeignKey('conferences.conference_id'), nullable=False)
    wins = db.Column(db.Integer, default=0, nullable=False)
    losses = db.Column(db.Integer, default=0, nullable=False)
    conference_wins = db.Column(db.Integer, default=0, nullable=False)
    conference_losses = db.Column(db.Integer, default=0, nullable=False)
    points_for = db.Column(db.Integer)
    points_against = db.Column(db.Integer)
    pass_yards = db.Column(db.Integer)
    rush_yards = db.Column(db.Integer)
    pass_tds = db.Column(db.Integer)
    rush_tds = db.Column(db.Integer)
    off_ppg = db.Column(db.Float)
    def_ppg = db.Column(db.Float)
    offense_yards = db.Column(db.Integer)
    defense_yards = db.Column(db.Integer)
    sacks = db.Column(db.Integer)
    interceptions = db.Column(db.Integer)
    prestige = db.Column(db.String(8))
    team_rating = db.Column(db.String(8))
    final_rank = db.Column(db.Integer)
    recruiting_rank = db.Column(db.Integer)
    offense_yards_rank = db.Column(db.Integer)
    defense_yards_rank = db.Column(db.Integer)
    pass_yards_rank = db.Column(db.Integer)
    rush_yards_rank = db.Column(db.Integer)
    pass_tds_rank = db.Column(db.Integer)
    rush_tds_rank = db.Column(db.Integer)
    off_ppg_rank = db.Column(db.Integer)
    def_ppg_rank = db.Column(db.Integer)
    sacks_rank = db.Column(db.Integer)
    interceptions_rank = db.Column(db.Integer)
    points_for_rank = db.Column(db.Integer)
    points_against_rank = db.Column(db.Integer)
    manual_conference_position = db.Column(db.Integer, nullable=True)  # User-set conference position for the season


class Player(db.Model):
    __tablename__ = 'players'
    player_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    position = db.Column(db.String(8), nullable=False)
    recruit_stars = db.Column(db.Integer)
    recruit_rank_nat = db.Column(db.Integer)
    state = db.Column(db.String(2))  # State abbreviation
    team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'))
    player_seasons = db.relationship('PlayerSeason', backref='player', lazy=True)
    award_winners = db.relationship('AwardWinner', backref='player', lazy=True)


class PlayerSeason(db.Model):
    __tablename__ = 'player_seasons'
    player_season_id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('players.player_id'), nullable=False)
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.season_id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)
    player_class = db.Column(db.String(16))
    current_year = db.Column(db.String(8))  # Moved from Player table
    redshirted = db.Column(db.Boolean, default=False)  # Moved from Player table
    ovr_rating = db.Column(db.Integer)
    games_played = db.Column(db.Integer)
    # Passing stats
    completions = db.Column(db.Integer)
    attempts = db.Column(db.Integer)
    pass_yards = db.Column(db.Integer)
    pass_tds = db.Column(db.Integer)
    interceptions = db.Column(db.Integer)
    # Rushing stats
    rush_attempts = db.Column(db.Integer)
    rush_yards = db.Column(db.Integer)
    rush_tds = db.Column(db.Integer)
    longest_rush = db.Column(db.Integer)
    rush_fumbles = db.Column(db.Integer)
    # Receiving stats
    receptions = db.Column(db.Integer)
    rec_yards = db.Column(db.Integer)
    rec_tds = db.Column(db.Integer)
    longest_rec = db.Column(db.Integer)
    rec_drops = db.Column(db.Integer)
    # Defensive stats
    tackles = db.Column(db.Integer)
    tfl = db.Column(db.Integer)  # Tackles for loss
    sacks = db.Column(db.Integer)
    forced_fumbles = db.Column(db.Integer)
    def_tds = db.Column(db.Integer)  # Defensive touchdowns
    # Awards and other info
    awards = db.Column(db.String(128))
    speed = db.Column(db.Integer)
    dev_trait = db.Column(db.String(16))
    weight = db.Column(db.Integer)
    height = db.Column(db.String(8))  # Height (e.g., 6'2") - Can change as player grows


class Game(db.Model):
    __tablename__ = 'games'
    game_id = db.Column(db.Integer, primary_key=True)
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.season_id'), nullable=False)
    week = db.Column(db.Integer, nullable=False)
    home_team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=True)
    away_team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=True)
    home_score = db.Column(db.Integer)
    away_score = db.Column(db.Integer)
    overtime = db.Column(db.Boolean, default=False)
    game_type = db.Column(db.String(16), default='Regular')
    playoff_round = db.Column(db.String(16))
    neutral_site = db.Column(db.Boolean, default=False)


class Award(db.Model):
    __tablename__ = 'awards'
    award_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, unique=True)
    description = db.Column(db.Text)
    award_winners = db.relationship('AwardWinner', backref='award', lazy=True)


class AwardWinner(db.Model):
    __tablename__ = 'award_winners'
    award_winner_id = db.Column(db.Integer, primary_key=True)
    award_id = db.Column(db.Integer, db.ForeignKey('awards.award_id'), nullable=False)
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.season_id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('players.player_id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)


# Honor: Defines the type of honor and side (offense/defense/null)
class Honor(db.Model):
    __tablename__ = 'honors'
    honor_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(
        db.String(32), nullable=False, unique=True
    )  # e.g., 'all_conference', 'all_american',
    # 'national_player_of_the_week',
    # 'conference_player_of_the_week'
    side = db.Column(db.String(16))  # 'offense', 'defense', or NULL
    # Only set for conference-level honors, null for national honors
    conference_id = db.Column(
        db.Integer, db.ForeignKey('conferences.conference_id'), nullable=True
    )  # Only set for conference-level honors, null for national honors
    honor_winners = db.relationship('HonorWinner', backref='honor', lazy=True)


# HonorWinner references Honor
class HonorWinner(db.Model):
    __tablename__ = 'honor_winners'
    honor_winner_id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('players.player_id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.season_id'), nullable=False)
    honor_id = db.Column(db.Integer, db.ForeignKey('honors.honor_id'), nullable=False)
    week = db.Column(db.Integer)  # Only set for weekly honors
