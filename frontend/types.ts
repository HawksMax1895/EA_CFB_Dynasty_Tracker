export interface Conference {
  conference_id: number;
  name: string;
}

export interface Season {
  season_id: number;
  year: number;
}

export interface Team {
  team_id: number;
  team_name: string;
  name?: string;
  is_user_controlled?: boolean;
  conference_name?: string;
  conference?: string;
  logo_url?: string;
  final_rank?: number | null;
  wins?: number | null;
  losses?: number | null;
  conference_wins?: number | null;
  conference_losses?: number | null;
  points_for?: number | null;
  points_against?: number | null;
  pass_yards?: number | null;
  rush_yards?: number | null;
  pass_tds?: number | null;
  rush_tds?: number | null;
  off_ppg?: number | null;
  def_ppg?: number | null;
  sacks?: number | null;
  interceptions?: number | null;
  offense_yards?: number | null;
  defense_yards?: number | null;
  prestige?: string | null;
  team_rating?: string | null;
  recruiting_rank?: number | null;
  rank?: number;
}

export interface Game {
  game_id: number;
  week: number;
  home_team_id: number;
  away_team_id: number;
  home_team_name?: string | null;
  away_team_name?: string | null;
  home_score: number | null;
  away_score: number | null;
  game_type: string;
  overtime: boolean;
  is_conference_game?: boolean;
}
