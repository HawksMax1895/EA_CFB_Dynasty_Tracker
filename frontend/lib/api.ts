import type {
  Season, 
  Team, 
  TeamSeason, 
  Player, 
  PlayerSeason, 
  Game, 
  Award, 
  AwardWinner, 
  Honor, 
  CreateTeamData,
  AddPlayerData,
  UpdatePlayerData,
  RecruitData,
  TransferData,
  HonorData,
  AwardData,
  HonorTypeData,
  RecruitingRankingData,
  UpdateTeamSeasonData,
  UpdatePlayerSeasonStatsData,
  UpdateGameResultData,
  AwardWinnerData,
  ApiResponse
} from '../types'

// Base URL for all API requests. Set the environment variable
// NEXT_PUBLIC_API_URL (e.g. in frontend/.env.local) to override the default
// when running the frontend on a different machine than the backend.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"

// SEASONS
export async function fetchSeasons(): Promise<Season[]> {
  const response = await fetch(`${API_BASE_URL}/seasons`)
  if (!response.ok) throw new Error("Failed to fetch seasons")
  return response.json()
}

export async function createSeason(year?: number): Promise<Season> {
  const response = await fetch(`${API_BASE_URL}/seasons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(year ? { year } : {})
  })
  if (!response.ok) throw new Error("Failed to create season")
  return response.json()
}

export async function progressPlayers(seasonId: number): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/players/progression`, { method: "POST" })
  if (!response.ok) throw new Error("Failed to progress players")
  return response.json()
}

export async function progressPlayerClass(): Promise<ApiResponse> {
  // Get the current season (you might want to make this configurable)
  const seasons = await fetchSeasons()
  const currentSeason = seasons[0] // seasons returned in descending order; first element is most recent
  if (!currentSeason) {
    throw new Error("No season found")
  }
  return progressPlayers(currentSeason.season_id)
}

// TEAMS
export async function fetchTeams(): Promise<Team[]> {
  const response = await fetch(`${API_BASE_URL}/teams`)
  if (!response.ok) throw new Error("Failed to fetch teams")
  return response.json()
}

export async function fetchTeamsBySeason(seasonId: number): Promise<TeamSeason[]> {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/teams?all=true`)
  if (!response.ok) throw new Error("Failed to fetch teams for season")
  return response.json()
}

export async function createTeam(data: CreateTeamData): Promise<Team> {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to create team")
  return response.json()
}

export async function uploadTeamLogo(teamId: number, file: File) {
  const formData = new FormData()
  formData.append("logo", file)
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/logo`, {
    method: "POST",
    body: formData
  })
  if (!response.ok) throw new Error("Failed to upload logo")
  return response.json()
}

// PLAYERS
export async function fetchPlayers(teamId: number = 1): Promise<Player[]> {
  const response = await fetch(`${API_BASE_URL}/players?team_id=${teamId}`)
  if (!response.ok) throw new Error("Failed to fetch players")
  return response.json()
}

export async function setPlayerRedshirt(playerId: number, redshirted: boolean, seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/redshirt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redshirted, season_id: seasonId })
  })
  if (!response.ok) throw new Error("Failed to set redshirt status")
  return response.json()
}

export async function addPlayer(data: AddPlayerData): Promise<Player> {
  const teamId = data.team_id;
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to add player")
  return response.json()
}

// RECRUITING
export async function fetchRecruitingClass(teamId: number, seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/recruiting-class?team_id=${teamId}&season_id=${seasonId}`)
  if (!response.ok) throw new Error("Failed to fetch recruiting class")
  return response.json()
}

export async function addRecruitingClass(data: { team_id: number; season_id: number; recruits: RecruitData[] }): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/recruiting-class`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to add recruiting class")
  return response.json()
}

export async function updateRecruit(recruitId: number, data: RecruitData): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/recruiting-class/${recruitId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update recruit")
  return response.json()
}

export async function deleteRecruit(recruitId: number) {
  const response = await fetch(`${API_BASE_URL}/recruiting-class/${recruitId}`, {
    method: "DELETE"
  })
  if (!response.ok) throw new Error("Failed to delete recruit")
  return response.json()
}

// TRANSFER PORTAL
export async function fetchTransferPortal(teamId: number, seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/transfer-portal?team_id=${teamId}&season_id=${seasonId}`)
  if (!response.ok) throw new Error("Failed to fetch transfer portal class")
  return response.json()
}

export async function addTransferPortal(data: { team_id: number; season_id: number; transfers: TransferData[] }): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/transfer-portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to add transfer portal class")
  return response.json()
}

export async function updateTransfer(transferId: number, data: TransferData): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/transfer-portal/${transferId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update transfer")
  return response.json()
}

export async function deleteTransfer(transferId: number) {
  const response = await fetch(`${API_BASE_URL}/transfer-portal/${transferId}`, {
    method: "DELETE"
  })
  if (!response.ok) throw new Error("Failed to delete transfer")
  return response.json()
}

// HONORS
export async function fetchHonors(seasonId: number, teamId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/teams/${teamId}/honors`)
  if (!response.ok) throw new Error("Failed to fetch honors")
  return response.json()
}

export async function addHonors(seasonId: number, teamId: number, honors: HonorData[]): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/teams/${teamId}/honors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ honors })
  })
  if (!response.ok) throw new Error("Failed to add honors")
  return response.json()
}

export async function fetchHonorsBySeason(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/honors`);
  if (!response.ok) throw new Error("Failed to fetch honors for season");
  return response.json();
}

// HONOR TYPES
export async function fetchHonorTypes() {
  const response = await fetch(`${API_BASE_URL}/honors/types`)
  if (!response.ok) throw new Error("Failed to fetch honor types")
  return response.json()
}

export async function createHonorType(data: HonorTypeData): Promise<Honor> {
  const response = await fetch(`${API_BASE_URL}/honors/types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to create honor type")
  return response.json()
}

export async function updateHonorType(honorId: number, data: Partial<HonorTypeData>): Promise<Honor> {
  const response = await fetch(`${API_BASE_URL}/honors/types/${honorId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update honor type")
  return response.json()
}

export async function deleteHonorType(honorId: number) {
  const response = await fetch(`${API_BASE_URL}/honors/types/${honorId}`, {
    method: "DELETE"
  })
  if (!response.ok) throw new Error("Failed to delete honor type")
  return response.json()
}

export async function checkHonorRequiresWeek(honorId: number) {
  const response = await fetch(`${API_BASE_URL}/honors/types/${honorId}/requires-week`)
  if (!response.ok) throw new Error("Failed to check honor week requirement")
  return response.json()
}

// RANKINGS
export async function fetchRecruitingRankings(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/recruiting-rankings?season_id=${seasonId}`)
  if (!response.ok) throw new Error("Failed to fetch recruiting rankings")
  return response.json()
}

export async function updateRecruitingRankings(data: { season_id: number; rankings: RecruitingRankingData[] }): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/recruiting-rankings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update recruiting rankings")
  return response.json()
}

// AWARDS
export async function fetchAwards() {
  const response = await fetch(`${API_BASE_URL}/awards`)
  if (!response.ok) throw new Error("Failed to fetch awards")
  return response.json()
}

export async function createAward(data: AwardData): Promise<Award> {
  const response = await fetch(`${API_BASE_URL}/awards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to create award")
  return response.json()
}

export async function updateAward(awardId: number, data: AwardData): Promise<Award> {
  const response = await fetch(`${API_BASE_URL}/awards/${awardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update award")
  return response.json()
}

export async function deleteAward(awardId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/awards/${awardId}`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("Failed to delete award");
  return response.json();
}

export async function fetchAwardWinnersBySeason(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/awards`)
  if (!response.ok) throw new Error("Failed to fetch award winners")
  return response.json()
}

export async function fetchAllAwardsForSeason(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/awards/all`)
  if (!response.ok) throw new Error("Failed to fetch all awards for season")
  return response.json()
}

export async function updateAwardWinner(awardWinnerId: number, data: AwardWinnerData): Promise<AwardWinner> {
  const response = await fetch(`${API_BASE_URL}/award-winners/${awardWinnerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update award winner")
  return response.json()
}

export async function declareAwardWinner(seasonId: number, awardId: number, playerId: number, teamId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/awards/${awardId}/winner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, team_id: teamId })
  })
  if (!response.ok) throw new Error("Failed to declare award winner")
  return response.json()
}

// GAMES
export async function fetchGames() {
  const response = await fetch(`${API_BASE_URL}/games`)
  if (!response.ok) throw new Error("Failed to fetch games")
  return response.json()
}

export async function fetchGamesBySeason(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/games?type=regular`)
  if (!response.ok) throw new Error("Failed to fetch games for season")
  return response.json()
}

export async function updateGameResult(gameId: number, data: UpdateGameResultData): Promise<Game> {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update game result")
  return response.json()
}

// DASHBOARD
export async function fetchDashboard(seasonId?: number) {
  let url = `${API_BASE_URL}/dashboard`;
  if (seasonId) {
    url += `?season_id=${seasonId}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch dashboard");
  return response.json();
}

export async function fetchWinsChart() {
  const response = await fetch(`${API_BASE_URL}/dashboard/wins-chart`);
  if (!response.ok) throw new Error("Failed to fetch wins chart data");
  return response.json();
}

// Update Team Season
// Supports: wins, losses, conference_wins, conference_losses, points_for, points_against, offense_yards, defense_yards, pass_yards, rush_yards, pass_tds, rush_tds, off_ppg, def_ppg, sacks, interceptions, prestige, team_rating, final_rank, recruiting_rank, conference_id
export async function updateTeamSeason(seasonId: number, teamId: number, data: UpdateTeamSeasonData): Promise<TeamSeason> {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/teams/${teamId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update team season")
  return response.json()
}

// PLAYOFFS
export async function fetchPlayoffEligibleTeams(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/playoff/${seasonId}/playoff-eligible-teams`)
  if (!response.ok) throw new Error("Failed to fetch playoff eligible teams")
  return response.json()
}

export async function manualSeedBracket(seasonId: number, teamIds: number[]) {
  const response = await fetch(`${API_BASE_URL}/playoff/${seasonId}/manual-seed-bracket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_ids: teamIds })
  })
  if (!response.ok) throw new Error("Failed to seed bracket")
  return response.json()
}

export async function fetchBracket(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/playoff/${seasonId}/bracket`)
  if (!response.ok) throw new Error("Failed to fetch bracket")
  return response.json()
}

export async function setUserControlledTeam(teamId: number) {
  const response = await fetch(`${API_BASE_URL}/teams/user-controlled`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_id: teamId })
  })
  if (!response.ok) throw new Error("Failed to set user-controlled team")
  return response.json()
}

export async function deleteSeason(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("Failed to delete season");
  return response.json();
}

export async function fetchPlayersBySeason(seasonId: number, teamId: number = 1) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/teams/${teamId}/players`)
  if (!response.ok) throw new Error("Failed to fetch players for season")
  return response.json()
}

export async function updatePlayerSeasonStats(playerId: number, seasonId: number, stats: UpdatePlayerSeasonStatsData): Promise<PlayerSeason> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/seasons/${seasonId}/stats`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stats)
  })
  if (!response.ok) throw new Error("Failed to update player season stats")
  return response.json()
}

export async function updatePlayerProfile(playerId: number, data: UpdatePlayerData): Promise<Player> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update player profile")
  return response.json()
}

export async function updatePlayerComprehensive(playerId: number, data: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/comprehensive`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update player comprehensive data")
  return response.json()
}

export async function fetchAllPlayersBySeason(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/players`);
  if (!response.ok) throw new Error("Failed to fetch all players for season");
  return response.json();
}

export async function fetchPlayerAwards(playerId: number) {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/awards`);
  if (!response.ok) throw new Error("Failed to fetch player awards");
  return response.json();
}

export async function fetchPlayerHonors(playerId: number) {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/honors`);
  if (!response.ok) throw new Error("Failed to fetch player honors");
  return response.json();
}

export async function fetchPlayerRatingDevelopment(playerId: number) {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/rating-development`);
  if (!response.ok) throw new Error("Failed to fetch player rating development");
  return response.json();
}

// Mark a player as leaving (will leave team after this season)
export async function setPlayerLeaving(playerId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/leave`, {
    method: "POST"
  });
  if (!response.ok) throw new Error("Failed to mark player as leaving");
  return response.json();
}

// Delete a player from the system
export async function deletePlayer(playerId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("Failed to delete player");
  return response.json();
}
