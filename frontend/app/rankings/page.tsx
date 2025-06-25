"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Medal, Repeat, RefreshCw } from "lucide-react"
import React, { useEffect, useState, useMemo } from "react"
import { fetchSeasons, updateTeamSeason, fetchTeams } from "@/lib/api"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useRouter } from "next/navigation"
import SortableTeamRow from "@/components/sortable-team-row"
import type { Team, Conference, Season } from "@/types"
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command"
import { SeasonSelector } from "@/components/SeasonSelector"
import { useSeason } from "@/context/SeasonContext"

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
  const { seasons, selectedSeason, setSelectedSeason, setSeasons } = useSeason();
  const [teams, setTeams] = useState<Team[]>([])
  const [standings, setStandings] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState("ap-poll")
  const [refreshKey, setRefreshKey] = useState(0)
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({})

  // Fetch all teams for the selected season (for AP Poll and replacement dropdown)
  const [apPollTeams, setApPollTeams] = useState<Team[]>([])
  const [allSeasonTeams, setAllSeasonTeams] = useState<Team[]>([])
  const router = useRouter();
  const [selectedConference, setSelectedConference] = useState<number | null>(null);

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
        if (userTeam && (userTeam as any).primary_conference_id) {
          setSelectedConference((userTeam as any).primary_conference_id)
        } else if (confs.length > 0) {
          setSelectedConference(confs[0].conference_id)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError("Failed to load conferences, seasons, or teams")
        setLoading(false)
      })
  }, [setSeasons])

  // Fetch conference teams when tab or season/conference changes
  useEffect(() => {
    if (selectedTab !== 'conference' || !selectedConference || !selectedSeason) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/conferences/${selectedConference}/teams?season_id=${selectedSeason}`)
      .then(res => res.json())
      .then(confTeams => {
        setTeams(confTeams);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load conference teams");
        setLoading(false);
      });
  }, [selectedTab, selectedConference, selectedSeason]);

  // Fetch and merge records for standings when teams or season changes
  useEffect(() => {
    if (!selectedSeason || teams.length === 0) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/seasons/${selectedSeason}/teams`).then(res => res.json())
      .then(allRecords => {
        const recordsMap = Object.fromEntries(allRecords.map((r: any) => [r.team_id, r]))
        const merged = teams.map((t: any, i: number) => {
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
        setStandings(merged)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load teams or records")
        setLoading(false)
      })
  }, [selectedSeason, teams]);

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
    const key = `${index}-${field}`
    setInputValues(prev => ({ ...prev, [key]: value }))
  }

  const handleInputBlur = async (index: number, field: string, value: string) => {
    if (!selectedSeason) return
    const team = standings[index]
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    
    // Update the standings with the numeric value
    setStandings(prev => prev.map((t, i) => 
      i === index ? { ...t, [field]: num } : t
    ))
    
    const data: any = { [field]: num }
    try {
      await updateTeamSeason(selectedSeason, team.team_id, data)
    } catch (e) {
      setError("Failed to update record")
    }
  }

  // Get input value for a field, falling back to the actual team value
  const getInputValue = (index: number, field: string, defaultValue: number | null = 0) => {
    const key = `${index}-${field}`
    if (inputValues[key] !== undefined) {
      return inputValues[key]
    }
    
    // Get the actual team value from standings or apPollTeams
    let team
    if (selectedTab === 'conference') {
      team = standings[index]
    } else {
      team = apPollTeams[index]
    }
    
    if (team) {
      const actualValue = team[field as keyof Team]
      return actualValue?.toString() || '0'
    }
    
    return '0'
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

  // State for swap popover (index of open popover)
  const [swapPopover, setSwapPopover] = React.useState<{ index: number | null }>({ index: null })

  const availableTeams = useMemo(() => {
    const ids = new Set(apPollTeams.map(t => t.team_id))
    return allSeasonTeams.filter(t => !ids.has(t.team_id))
  }, [apPollTeams, allSeasonTeams])

  // Add refresh function
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Helper to check if a team is user-controlled
  const isUserControlledTeam = (teamId: number) => {
    const userTeam = allSeasonTeams.find(t => t.team_id === teamId)
    return userTeam && (userTeam as any).is_user_controlled
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Rankings</h1>
              <p className="text-gray-600">End of season rankings and standings</p>
            </div>
            <div className="flex items-center gap-4">
              <SeasonSelector />
            </div>
          </div>
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
                                    value={getInputValue(index, "wins")}
                                    onChange={e => {
                                      const value = e.target.value
                                      handleInputChange(index, "wins", value)
                                    }}
                                    onBlur={e => handleInputBlur(index, "wins", e.target.value)}
                                    aria-label="Overall Wins"
                                    readOnly={isUserControlledTeam(team.team_id)}
                                    disabled={isUserControlledTeam(team.team_id)}
                                  />
                                  <span className="mx-1 text-2xl font-bold">-</span>
                                  <input
                                    className="border-b-2 border-blue-400 bg-transparent w-12 text-center text-xl font-bold focus:outline-none"
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={getInputValue(index, "losses")}
                                    onChange={e => {
                                      const value = e.target.value
                                      handleInputChange(index, "losses", value)
                                    }}
                                    onBlur={e => handleInputBlur(index, "losses", e.target.value)}
                                    aria-label="Overall Losses"
                                    readOnly={isUserControlledTeam(team.team_id)}
                                    disabled={isUserControlledTeam(team.team_id)}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Overall</div>
                              </div>
                              {/* Swap button and popover - moved to far right */}
                              <Popover open={popoverOpen} onOpenChange={open => setSwapPopover(open ? { index } : { index: null })}>
                                <PopoverTrigger asChild>
                                  <button className="ml-2 p-1 rounded hover:bg-gray-200" aria-label="Swap team" type="button">
                                    <Repeat className="w-5 h-5 text-blue-500" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="p-0 w-72">
                                  <Command>
                                    <CommandInput placeholder="Search team..." />
                                    <CommandList>
                                      {availableTeams.map(t => (
                                        <CommandItem key={t.team_id} value={t.team_name} onSelect={async () => {
                                          if (!selectedSeason || typeof selectedSeason !== 'number') return;
                                          const newTop25 = [...apPollTeams]
                                          newTop25[index] = { ...t, final_rank: index + 1 }
                                          const replacedTeam = team
                                          // Only update the swapped-in and swapped-out teams
                                          try {
                                            await updateTeamSeason(selectedSeason, t.team_id, { final_rank: index + 1 })
                                            await updateTeamSeason(selectedSeason, replacedTeam.team_id, { final_rank: null })
                                            setApPollTeams(newTop25)
                                            setSwapPopover({ index: null })
                                          } catch (e) {
                                            setError("Failed to update team swap")
                                          }
                                        }}>
                                          {t.team_name}
                                        </CommandItem>
                                      ))}
                                    </CommandList>
                                  </Command>
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
                                  value={getInputValue(index, "wins")}
                                  onChange={e => handleInputChange(index, "wins", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "wins", e.target.value)}
                                  aria-label="Overall Wins"
                                  readOnly={isUserControlledTeam(team.team_id)}
                                  disabled={isUserControlledTeam(team.team_id)}
                                />
                                <span className="mx-1 text-2xl font-bold">-</span>
                                <input
                                  className="border-b-2 border-blue-400 bg-transparent w-12 text-center text-xl font-bold focus:outline-none"
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={getInputValue(index, "losses")}
                                  onChange={e => handleInputChange(index, "losses", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "losses", e.target.value)}
                                  aria-label="Overall Losses"
                                  readOnly={isUserControlledTeam(team.team_id)}
                                  disabled={isUserControlledTeam(team.team_id)}
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
                                  value={getInputValue(index, "conference_wins")}
                                  onChange={e => handleInputChange(index, "conference_wins", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "conference_wins", e.target.value)}
                                  aria-label="Conference Wins"
                                  readOnly={isUserControlledTeam(team.team_id)}
                                  disabled={isUserControlledTeam(team.team_id)}
                                />
                                <span className="mx-1 text-xl font-bold">-</span>
                                <input
                                  className="border-b border-green-400 bg-transparent w-10 text-center text-lg font-semibold focus:outline-none"
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={getInputValue(index, "conference_losses")}
                                  onChange={e => handleInputChange(index, "conference_losses", e.target.value)}
                                  onBlur={e => handleInputBlur(index, "conference_losses", e.target.value)}
                                  aria-label="Conference Losses"
                                  readOnly={isUserControlledTeam(team.team_id)}
                                  disabled={isUserControlledTeam(team.team_id)}
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
