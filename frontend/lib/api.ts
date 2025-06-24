const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

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
  const response = await fetch(`${API_BASE_URL}/seasons/${seasonId}/progress_players`, { method: "POST" })
  if (!response.ok) throw new Error("Failed to progress players")
  return response.json()
}

// TEAMS
export async function fetchTeams() {
  const response = await fetch(`${API_BASE_URL}/teams`)
  if (!response.ok) throw new Error("Failed to fetch teams")
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
export async function fetchPlayers() {
  const response = await fetch(`${API_BASE_URL}/players`)
  if (!response.ok) throw new Error("Failed to fetch players")
  return response.json()
}

export async function setPlayerRedshirt(playerId: number, redshirted: boolean) {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/redshirt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redshirted })
  })
  if (!response.ok) throw new Error("Failed to set redshirt status")
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

// DASHBOARD
export async function fetchDashboard() {
  const response = await fetch(`${API_BASE_URL}/dashboard`)
  if (!response.ok) throw new Error("Failed to fetch dashboard data")
  return response.json()
}
