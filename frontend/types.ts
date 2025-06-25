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
  rank?: number;
}
