export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"

// SEASONS
export async function fetchSeasons() {
  const response = await fetch(`${API_BASE_URL}/seasons`)
  if (!response.ok) throw new Error("Failed to fetch seasons")
  return response.json()
}

export async function createSeason(year?: number) {
  const response = await fetch(`${API_BASE_URL}/seasons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(year ? { year } : {})
  })
  if (!response.ok) throw new Error("Failed to create season")
  return response.json()
}

export async function progressPlayers(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/players/progression`, { method: "POST" })
  if (!response.ok) throw new Error("Failed to progress players")
  return response.json()
}

export async function progressPlayerClass() {
  // Get the current season (you might want to make this configurable)
  const seasons = await fetchSeasons()
  const currentSeason = seasons[seasons.length - 1] // Get the most recent season
  if (!currentSeason) {
    throw new Error("No season found")
  }
  return progressPlayers(currentSeason.season_id)
}

// TEAMS
export async function fetchTeams() {
  const response = await fetch(`${API_BASE_URL}/teams`)
  if (!response.ok) throw new Error("Failed to fetch teams")
  return response.json()
}

export async function fetchTeamsBySeason(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/teams?all=true`)
  if (!response.ok) throw new Error("Failed to fetch teams for season")
  return response.json()
}

export async function createTeam(data: { name: string; abbreviation?: string; logo_url?: string }) {
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
export async function fetchPlayers(teamId: number = 1) {
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

export async function addPlayer(data: any) {
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

export async function addRecruitingClass(data: { team_id: number; season_id: number; recruits: any[] }) {
  const response = await fetch(`${API_BASE_URL}/recruiting-class`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to add recruiting class")
  return response.json()
}

export async function updateRecruit(recruitId: number, data: any) {
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

export async function addTransferPortal(data: { team_id: number; season_id: number; transfers: any[] }) {
  const response = await fetch(`${API_BASE_URL}/transfer-portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to add transfer portal class")
  return response.json()
}

export async function updateTransfer(transferId: number, data: any) {
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

export async function addHonors(seasonId: number, teamId: number, honors: any[]) {
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/teams/${teamId}/honors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ honors })
  })
  if (!response.ok) throw new Error("Failed to add honors")
  return response.json()
}

// RANKINGS
export async function fetchRecruitingRankings(seasonId: number) {
  const response = await fetch(`${API_BASE_URL}/recruiting-rankings?season_id=${seasonId}`)
  if (!response.ok) throw new Error("Failed to fetch recruiting rankings")
  return response.json()
}

export async function updateRecruitingRankings(data: { season_id: number; rankings: any[] }) {
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

export async function updateGameResult(gameId: number, data: { home_score: number, away_score: number }) {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error("Failed to update game result")
  return response.json()
}

// DASHBOARD
export async function fetchDashboard() {
  const response = await fetch(`${API_BASE_URL}/dashboard`)
  if (!response.ok) throw new Error("Failed to fetch dashboard data")
  return response.json()
}

// Update Team Season
// Supports: wins, losses, conference_wins, conference_losses, points_for, points_against, offense_yards, defense_yards, pass_yards, rush_yards, pass_tds, rush_tds, off_ppg, def_ppg, sacks, interceptions, prestige, team_rating, final_rank, recruiting_rank, conference_id
export async function updateTeamSeason(seasonId: number, teamId: number, data: any) {
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
