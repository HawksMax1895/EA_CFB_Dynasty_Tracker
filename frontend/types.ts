export interface Conference {
  conference_id: number;
  name: string;
  tier?: number;
}

export interface Season {
  season_id: number;
  year: number;
}

export interface Team {
  team_id: number;
  name: string;
  team_name?: string; // Some APIs return team_name instead of name
  abbreviation?: string;
  primary_conference_id?: number;
  is_user_controlled?: boolean;
  logo_url?: string;
}

export interface TeamSeason {
  team_season_id: number;
  team_id: number;
  season_id: number;
  conference_id: number;
  wins: number;
  losses: number;
  conference_wins: number;
  conference_losses: number;
  points_for?: number;
  points_against?: number;
  pass_yards?: number;
  rush_yards?: number;
  pass_tds?: number;
  rush_tds?: number;
  off_ppg?: number;
  def_ppg?: number;
  offense_yards?: number;
  defense_yards?: number;
  sacks?: number;
  interceptions?: number;
  prestige?: string;
  team_rating?: string;
  final_rank?: number;
  recruiting_rank?: number;
  offense_yards_rank?: number;
  defense_yards_rank?: number;
  pass_yards_rank?: number;
  rush_yards_rank?: number;
  pass_tds_rank?: number;
  rush_tds_rank?: number;
  off_ppg_rank?: number;
  def_ppg_rank?: number;
  sacks_rank?: number;
  interceptions_rank?: number;
  points_for_rank?: number;
  points_against_rank?: number;
  manual_conference_position?: number;
}

export interface Player {
  player_id: number;
  name: string;
  position: string;
  /** Class year e.g., 'FR', 'SO', 'JR', 'SR' */
  current_year?: string;
  /** True if the player is redshirting in the **current** season */
  redshirted?: boolean;
  /** True if the player has ever taken a redshirt year in their career */
  has_ever_redshirted?: boolean;
  /** Overall rating in the most recent/selected season */
  ovr_rating?: number;
  /** Development trait e.g., Normal, Star */
  dev_trait?: string;
  /** Recorded height string like 6'2" */
  height?: string;
  /** Recorded weight in pounds */
  weight?: number;
  /** Speed rating */
  speed?: number;
  recruit_stars?: number;
  recruit_rank_nat?: number;
  state?: string;
  team_id?: number;
}

export interface PlayerSeason {
  player_season_id: number;
  player_id: number;
  season_id: number;
  team_id: number;
  player_class?: string;
  current_year?: string;
  redshirted?: boolean;
  ovr_rating?: number;
  games_played?: number;
  completions?: number;
  attempts?: number;
  pass_yards?: number;
  pass_tds?: number;
  interceptions?: number;
  rush_attempts?: number;
  rush_yards?: number;
  rush_tds?: number;
  longest_rush?: number;
  rush_fumbles?: number;
  receptions?: number;
  rec_yards?: number;
  rec_tds?: number;
  longest_rec?: number;
  rec_drops?: number;
  tackles?: number;
  tfl?: number;
  sacks?: number;
  forced_fumbles?: number;
  def_tds?: number;
  awards?: string;
  speed?: number;
  dev_trait?: string;
  weight?: number;
  height?: string;
}

export interface Game {
  game_id: number;
  season_id: number;
  week: number;
  home_team_id?: number;
  away_team_id?: number;
  home_score?: number;
  away_score?: number;
  overtime?: boolean;
  game_type?: string;
  playoff_round?: string;
  neutral_site?: boolean;
}

export interface Award {
  award_id: number;
  name: string;
  description?: string;
}

export interface AwardWinner {
  award_winner_id: number;
  award_id: number;
  season_id: number;
  player_id: number;
  team_id: number;
}

export interface Honor {
  honor_id: number;
  name: string;
  side?: string;
  conference_id?: number;
}

export interface HonorWinner {
  honor_winner_id: number;
  player_id: number;
  team_id: number;
  season_id: number;
  honor_id: number;
  week?: number;
}

// Form Data Types
export interface CreateSeasonData {
  year?: number;
}

export interface CreateTeamData {
  name: string;
  abbreviation?: string;
  logo_url?: string;
}

export interface AddPlayerData {
  name: string;
  position: string;
  recruit_stars?: number;
  recruit_rank_nat?: number;
  state?: string;
  team_id: number;
  redshirt_used?: boolean;
  /** Starting class year for the player (defaults to 'FR') */
  current_year?: string;
}

export interface UpdatePlayerData {
  name?: string;
  position?: string;
  recruit_stars?: number;
  recruit_rank_nat?: number;
  state?: string;
  team_id?: number;
}

export interface RecruitData {
  name: string;
  position: string;
  recruit_stars: number;
  recruit_rank_nat?: number;
  state?: string;
  team_id: number;
}

export interface TransferData {
  name: string;
  position: string;
  ovr_rating: number;
  team_id: number;
  previous_team?: string;
}

export interface HonorData {
  honor_id: number;
  player_id: number;
  team_id: number;
  week?: number;
}

export interface AwardData {
  name: string;
  description?: string;
}

export interface HonorTypeData {
  name: string;
  side?: string;
  conference_id?: number;
}

export interface RecruitingRankingData {
  team_id: number;
  rank: number;
  points: number;
}

export interface UpdateTeamSeasonData {
  wins?: number;
  losses?: number;
  conference_wins?: number;
  conference_losses?: number;
  points_for?: number;
  points_against?: number;
  pass_yards?: number;
  rush_yards?: number;
  pass_tds?: number;
  rush_tds?: number;
  off_ppg?: number;
  def_ppg?: number;
  offense_yards?: number;
  defense_yards?: number;
  sacks?: number;
  interceptions?: number;
  prestige?: string;
  team_rating?: string;
  final_rank?: number;
  recruiting_rank?: number;
  manual_conference_position?: number;
}

export interface UpdatePlayerSeasonStatsData {
  ovr_rating?: number;
  games_played?: number;
  completions?: number;
  attempts?: number;
  pass_yards?: number;
  pass_tds?: number;
  interceptions?: number;
  rush_attempts?: number;
  rush_yards?: number;
  rush_tds?: number;
  longest_rush?: number;
  rush_fumbles?: number;
  receptions?: number;
  rec_yards?: number;
  rec_tds?: number;
  longest_rec?: number;
  rec_drops?: number;
  tackles?: number;
  tfl?: number;
  sacks?: number;
  forced_fumbles?: number;
  def_tds?: number;
  awards?: string;
  speed?: number;
  dev_trait?: string;
  weight?: number;
  height?: string;
}

export interface UpdateGameResultData {
  home_score: number;
  away_score: number;
}

export interface AwardWinnerData {
  player_id: number;
  team_id: number;
}

// Award and Honor related types
export interface AwardWinnerWithDetails {
  award_winner_id: number;
  award_id: number;
  season_id: number;
  player_id: number;
  team_id: number;
  has_winner: boolean;
  award_name?: string;
  player_name?: string;
  team_name?: string;
}

export interface HonorData {
  honor_id: number;
  player_id: number;
  team_id: number;
  week?: number;
}

export interface HonorType {
  honor_id: number;
  name: string;
  side?: string;
  conference_id?: number;
  requires_week?: boolean;
}

// Game and Bracket related types
export interface Game {
  game_id: number;
  season_id: number;
  week: number;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  overtime: boolean;
  game_type: string;
  playoff_round?: string;
  neutral_site: boolean;
}

export interface BracketData {
  [roundKey: string]: Game[];
}

export interface PlayoffEligibleTeam {
  team_id: number;
  name: string;
  final_rank: number | null;
  conference_id: number;
}

// Dashboard related types
export interface DashboardData {
  team: {
    current_season_record?: string;
    current_season_conference_record?: string;
    record?: string;
    conference_record?: string;
    national_ranking?: number;
    conference_position?: number;
    recruiting_commits?: number;
    recruiting_rank?: number;
  };
  recent_activity: Array<{
    title: string;
    description: string;
    time_ago: string;
  }>;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardData {
  season: Season;
  teams: TeamSeason[];
  players: PlayerSeason[];
  games: Game[];
}

export interface WinsChartData {
  team_id: number;
  team_name: string;
  wins: number;
  losses: number;
  season_id: number;
}

export interface PlayerRatingDevelopmentData {
  season_id: number;
  ovr_rating: number;
  season_year: number;
}
