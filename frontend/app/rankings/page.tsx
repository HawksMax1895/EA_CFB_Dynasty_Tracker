"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Medal, Repeat } from "lucide-react"
import React, { useEffect, useState, useMemo } from "react"
import { fetchSeasons, updateTeamSeason, fetchTeams } from "@/lib/api"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useRouter } from "next/navigation"
import SortableTeamRow from "@/components/sortable-team-row"
import type { Team, Conference, Season } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export default function RankingsPage() {
  const apPoll = [
    { rank: 1, team: "Georgia", record: "13-1", points: 1547, previousRank: 3 },
    { rank: 2, team: "Michigan", record: "12-2", points: 1489, previousRank: 1 },
    { rank: 3, team: "Texas", record: "12-2", points: 1432, previousRank: 4 },
    { rank: 4, team: "Washington", record: "11-3", points: 1378, previousRank: 6 },
    { rank: 5, team: "Alabama", record: "11-2", points: 1324, previousRank: 2 },
    { rank: 6, team: "Oregon", record: "11-2", points: 1267, previousRank: 8 },
    { rank: 7, team: "Florida State", record: "13-1", points: 1198, previousRank: 5 },
    { rank: 8, team: "LSU", record: "10-3", points: 1134, previousRank: 12 },
    { rank: 9, team: "Penn State", record: "10-3", points: 1087, previousRank: 7 },
    { rank: 10, team: "Ohio State", record: "11-2", points: 1023, previousRank: 9 },
  ]

  // Conference/season selection and standings state
  const [conferences, setConferences] = useState<Conference[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedConference, setSelectedConference] = useState<number | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [standings, setStandings] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState("ap-poll")

  // Fetch all teams for the selected season (for AP Poll and replacement dropdown)
  const [apPollTeams, setApPollTeams] = useState<Team[]>([])
  const [allSeasonTeams, setAllSeasonTeams] = useState<Team[]>([])
  const router = useRouter();
  useEffect(() => {
    if (!selectedSeason) return
    setLoading(true)
    fetch(`${API_BASE_URL}/seasons/${selectedSeason}/teams?all=true`).then(res => res.json())
      .then((allTeams) => {
        setAllSeasonTeams(allTeams)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load all teams for season")
        setLoading(false)
      })
  }, [selectedSeason])

  // Fetch conferences and seasons on mount
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE_URL}/conferences`).then(res => res.json()),
      fetchSeasons(),
      fetchTeams()
    ])
      .then(([confs, seas, allTeams]) => {
        setConferences(confs)
        setSeasons(seas)
        // Find user team and its conference
        const userTeam = (allTeams as Team[]).find((t: any) => (t as any).is_user_controlled)
        if (userTeam && userTeam.primary_conference_id) {
          setSelectedConference(userTeam.primary_conference_id)
        } else if (confs.length > 0) {
          setSelectedConference(confs[0].conference_id)
        }
        if (seas.length > 0) setSelectedSeason(seas[seas.length - 1].season_id)
        setLoading(false)
      })
      .catch((err) => {
        setError("Failed to load conferences, seasons, or teams")
        setLoading(false)
      })
  }, [])

  // Fetch teams and records for selected conference/season
  useEffect(() => {
    if (!selectedConference || !selectedSeason) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE_URL}/conferences/${selectedConference}/teams?season_id=${selectedSeason}`).then(res => res.json()),
      fetch(`${API_BASE_URL}/seasons/${selectedSeason}/teams`).then(res => res.json())
    ])
      .then(([confTeams, allRecords]) => {
        // Merge records into conference teams
        const recordsMap = Object.fromEntries(allRecords.map((r: any) => [r.team_id, r]))
        const merged = confTeams.map((t: any, i: number) => {
          const rec = recordsMap[t.team_id] || {}
          return {
            ...t,
            wins: rec.wins,
            losses: rec.losses,
            conference_wins: rec.conference_wins,
            conference_losses: rec.conference_losses,
            points_for: rec.points_for,
            points_against: rec.points_against,
            rank: i + 1
          }
        })
        setTeams(confTeams)
        setStandings(merged)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load teams or records")
        setLoading(false)
      })
  }, [selectedConference, selectedSeason])

  // Fetch AP Poll (top 25) teams for the selected season
  useEffect(() => {
    if (!selectedSeason) return
    fetch(`${API_BASE_URL}/seasons/${selectedSeason}/teams`).then(res => res.json())
      .then((top25) => {
        // Sort by final_rank if present, otherwise by index
        const sorted = [...top25].sort((a, b) => {
          if (a.final_rank && b.final_rank) return a.final_rank - b.final_rank
          if (a.final_rank) return -1
          if (b.final_rank) return 1
          return 0
        })
        setApPollTeams(sorted)
      })
      .catch(() => {
        setError("Failed to load AP Poll teams")
      })
  }, [selectedSeason])


  // Update record and backend on change
  const handleInputChange = (index: number, field: string, value: string) => {
    setStandings(prev => prev.map((team, i) => (i === index ? { ...team, [field]: value } : team)))
  }

  const handleInputBlur = async (index: number, field: string, value: string) => {
    if (!selectedSeason) return
    const team = standings[index]
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    const data: any = { [field]: num }
    try {
      await updateTeamSeason(selectedSeason, team.team_id, data)
    } catch (e) {
      setError("Failed to update record")
    }
  }


  // Add back getRankChange for AP Poll
  function getRankChange(current: number, previous: number) {
    const change = previous - current
    if (change > 0) {
      return <Badge className="bg-green-100 text-green-800">↑{change}</Badge>
    } else if (change < 0) {
      return <Badge className="bg-red-100 text-red-800">↓{Math.abs(change)}</Badge>
    } else {
      return <Badge variant="outline">-</Badge>
    }
  }

  // State for swap popover (index of open popover and search value)
  const [swapPopover, setSwapPopover] = React.useState<{ index: number | null, search: string }>({ index: null, search: "" })

  const availableTeams = useMemo(() => {
    const ids = new Set(apPollTeams.map(t => t.team_id))
    return allSeasonTeams.filter(t => !ids.has(t.team_id))
  }, [apPollTeams, allSeasonTeams])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Rankings</h1>
          <p className="text-gray-600">End of season rankings and standings</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ap-poll">AP Poll</TabsTrigger>
            <TabsTrigger value="conference">Conference</TabsTrigger>
          </TabsList>

          <TabsContent value="ap-poll" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2 pl-4">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Final AP Poll (Top 25)
                  </CardTitle>
                  <div className="min-h-[48px]" style={{ width: '260px' }}></div>
                </div>
              </CardHeader>
              <CardContent>
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={async (event) => {
                    const { active, over } = event
                    if (!over || active.id === over.id) return
                    const oldIndex = apPollTeams.findIndex(t => t.team_id === active.id)
                    const newIndex = apPollTeams.findIndex(t => t.team_id === over.id)
                    const newOrder = arrayMove(apPollTeams, oldIndex, newIndex)
                    setApPollTeams(newOrder.map((team, i) => ({ ...team, final_rank: i + 1 })))
                    // Multi-move: update all teams whose position changed
                    if (selectedSeason) {
                      try {
                        const start = Math.min(oldIndex, newIndex)
                        const end = Math.max(oldIndex, newIndex)
                        const changedTeams = newOrder.slice(start, end + 1)
                        await Promise.all(
                          changedTeams.map((team, i) =>
                            updateTeamSeason(selectedSeason, team.team_id, { final_rank: start + i + 1 })
                          )
                        )
                      } catch (e) {
                        setError("Failed to update team order")
                      }
                    }
                  }}
                >
                  <SortableContext
                    items={apPollTeams.map(t => t.team_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {apPollTeams.map((team, index) => {
                        const popoverOpen = swapPopover.index === index
                        const search = popoverOpen ? swapPopover.search : ""
                        const filteredTeams = availableTeams.filter(t => t.team_name.toLowerCase().includes(search.toLowerCase()))
                        return (
                          <SortableTeamRow key={team.team_id} team={team} index={index}>
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={`text-2xl font-bold w-8 ${index === 0 ? 'text-yellow-500' : 'text-blue-600'}`}>{index + 1}</div>
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={team.logo_url || "/placeholder-logo.png"}
                                  alt={team.team_name}
                                  className="w-8 h-8 rounded-full object-cover border"
                                  style={{ background: '#fff' }}
                                />
                                <div className="font-semibold text-lg flex items-center gap-2 truncate">
                                  {team.team_name}
                                </div>
                              </div>
                              <div className="text-base text-gray-700 font-medium min-w-[120px]">{team.conference_name || team.conference || ""}</div>
                            </div>
                            <div className="flex items-center gap-8 ml-auto">
                              {/* Overall Record Headline */}
                              <div className="flex flex-col items-center min-w-[90px]">
                                <div className="text-xl font-bold flex items-center gap-2">
                                  <input
                                    className="border-b-2 border-blue-400 bg-transparent w-12 text-center text-xl font-bold focus:outline-none"
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={team.wins ?? 0}
                                    onChange={e => {
                                      const value = e.target.value
                                      setApPollTeams(prev => prev.map((t, i) => (i === index ? { ...t, wins: value } : t)))
                                      handleInputChange(index, "wins", value)
                                    }}
                                    onBlur={e => handleInputBlur(index, "wins", e.target.value)}
                                    aria-label="Overall Wins"
                                  />
                                  <span className="mx-1 text-2xl font-bold">-</span>
                                  <input
                                    className="border-b-2 border-blue-400 bg-transparent w-12 text-center text-xl font-bold focus:outline-none"
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={team.losses ?? 0}
                                    onChange={e => {
                                      const value = e.target.value
                                      setApPollTeams(prev => prev.map((t, i) => (i === index ? { ...t, losses: value } : t)))
                                      handleInputChange(index, "losses", value)
                                    }}
                                    onBlur={e => handleInputBlur(index, "losses", e.target.value)}
                                    aria-label="Overall Losses"
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Overall</div>
                              </div>
                              {/* Swap button and popover - moved to far right */}
                              <Popover open={popoverOpen} onOpenChange={open => setSwapPopover(open ? { index, search: "" } : { index: null, search: "" })}>
                                <PopoverTrigger asChild>
                                  <button className="ml-2 p-1 rounded hover:bg-gray-200" aria-label="Swap team" type="button">
                                    <Repeat className="w-5 h-5 text-blue-500" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-72">
                                  <input
                                    type="text"
                                    className="w-full border rounded px-2 py-1 mb-2"
                                    placeholder="Type to filter teams..."
                                    value={search}
                                    onChange={e => setSwapPopover({ index, search: e.target.value })}
                                    autoFocus
                                  />
                                  <div className="max-h-60 overflow-y-auto">
                                    {filteredTeams.length === 0 && <div className="text-gray-500 text-sm p-2">No teams found</div>}
                                    {filteredTeams.map(t => (
                                      <button
                                        key={t.team_id}
                                        className="w-full text-left px-2 py-1 hover:bg-blue-100 rounded flex items-center gap-2"
                                        onClick={async () => {
                                          if (!selectedSeason || typeof selectedSeason !== 'number') return;
                                          const newTop25 = [...apPollTeams]
                                          newTop25[index] = { ...t, final_rank: index + 1 }
                                          const replacedTeam = team
                                          // Only update the swapped-in and swapped-out teams
                                          try {
                                            await updateTeamSeason(selectedSeason, t.team_id, { final_rank: index + 1 })
                                            await updateTeamSeason(selectedSeason, replacedTeam.team_id, { final_rank: null })
                                            setApPollTeams(newTop25)
                                            setSwapPopover({ index: null, search: "" })
                                          } catch (e) {
                                            setError("Failed to update team swap")
                                          }
                                        }}
                                      >
                                        <img src={t.logo_url || "/placeholder-logo.png"} alt={t.team_name} className="w-6 h-6 rounded-full border" />
                                        <span>{t.team_name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </SortableTeamRow>
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conference" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2 pl-4">
                    <Medal className="h-5 w-5 text-blue-500" />
                    Conference Standings
                  </CardTitle>
                  <div className="flex gap-4 items-center">
                    <select
                      className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white text-gray-800 text-base"
                      value={selectedConference ?? ''}
                      onChange={e => {
                        setSelectedTab('conference');
                        setSelectedConference(Number(e.target.value));
                      }}
                    >
                      {conferences.map((conf: any) => (
                        <option key={conf.conference_id} value={conf.conference_id}>{conf.name}</option>
                      ))}
                    </select>
                    <select
                      className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white text-gray-800 text-base"
                      value={selectedSeason ?? ''}
                      onChange={e => {
                        setSelectedTab('conference');
                        setSelectedSeason(Number(e.target.value));
                      }}
                    >
                      {seasons.map((season: any) => (
                        <option key={season.season_id} value={season.season_id}>{season.year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={async (event) => {
                    const { active, over } = event
                    if (!over || active.id === over.id) return
                    const oldIndex = standings.findIndex(t => t.team_id === active.id)
                    const newIndex = standings.findIndex(t => t.team_id === over.id)
                    const newOrder = arrayMove(standings, oldIndex, newIndex)
                    setStandings(newOrder.map((team, i) => ({ ...team, rank: i + 1 })))
                    // Update backend order
                    if (selectedSeason) {
                      try {
                        await Promise.all(
                          newOrder.map((team, i) =>
                            updateTeamSeason(selectedSeason, team.team_id, { final_rank: i + 1 })
                          )
                        )
                      } catch (e) {
                        setError("Failed to update team order")
                      }
                    }
                  }}
                >
                  <SortableContext
                    items={standings.map(t => t.team_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {standings.map((team, index) => (
                        <SortableTeamRow key={team.team_id} team={team} index={index}>
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`text-2xl font-bold w-8 ${team.rank === 1 ? 'text-yellow-500' : 'text-blue-600'}`}>{team.rank}</div>
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={team.logo_url || "/placeholder-logo.png"}
                                alt={team.team_name}
                                className="w-8 h-8 rounded-full object-cover border"
                                style={{ background: '#fff' }}
                              />
                              <div className="font-semibold text-lg flex items-center gap-2 truncate">
                                {team.team_name}
                                {index === 0 && (
                                  <Badge className="bg-yellow-100 text-yellow-800 ml-2 flex items-center gap-1">
                                    <Trophy className="w-4 h-4 text-yellow-500" /> Champion
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-8 ml-auto">
                            {/* Overall Record Headline */}
                            <div className="flex flex-col items-center min-w-[90px]">
                              <div className="text-xl font-bold flex items-center gap-2">
                                <input
                                  className="border-b-2 border-blue-400 bg-transparent w-12 text-center text-xl font-bold focus:outline-none"
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={team.wins ?? 0}
                                  onChange={e => handleInputChange(index, "wins", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "wins", e.target.value)}
                                  aria-label="Overall Wins"
                                />
                                <span className="mx-1 text-2xl font-bold">-</span>
                                <input
                                  className="border-b-2 border-blue-400 bg-transparent w-12 text-center text-xl font-bold focus:outline-none"
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={team.losses ?? 0}
                                  onChange={e => handleInputChange(index, "losses", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "losses", e.target.value)}
                                  aria-label="Overall Losses"
                                />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Overall</div>
                            </div>
                            {/* Conference Record Headline */}
                            <div className="flex flex-col items-center min-w-[90px]">
                              <div className="text-lg font-semibold flex items-center gap-2">
                                <input
                                  className="border-b border-green-400 bg-transparent w-10 text-center text-lg font-semibold focus:outline-none"
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={team.conference_wins ?? 0}
                                  onChange={e => handleInputChange(index, "conference_wins", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "conference_wins", e.target.value)}
                                  aria-label="Conference Wins"
                                />
                                <span className="mx-1 text-xl font-bold">-</span>
                                <input
                                  className="border-b border-green-400 bg-transparent w-10 text-center text-lg font-semibold focus:outline-none"
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={team.conference_losses ?? 0}
                                  onChange={e => handleInputChange(index, "conference_losses", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "conference_losses", e.target.value)}
                                  aria-label="Conference Losses"
                                />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Conference</div>
                            </div>
                          </div>
                        </SortableTeamRow>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
