"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, MapPin, Trophy, Clock } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchGames, addGame, updateGameResult, fetchGamesBySeason, fetchSeasons, fetchTeams, updateTeamSeason } from "@/lib/api"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command"
import { useSeason } from "@/context/SeasonContext"

export default function GamesPage() {
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ week: '', opponent_name: '', date: '', time: '', location: '', game_type: 'Regular' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [resultLoading, setResultLoading] = useState<number | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)
  const [resultForms, setResultForms] = useState<{ [key: number]: { home_score: string, away_score: string } }>({})
  const [teams, setTeams] = useState<any[]>([])
  const [teamMap, setTeamMap] = useState<{ [key: number]: string }>({})
  const [userTeamId, setUserTeamId] = useState<number | null>(null)
  const [dropdownFilters, setDropdownFilters] = useState<{ [gameId: number]: { home?: string; away?: string } }>({})
  const [openCombobox, setOpenCombobox] = useState<{ [gameId: number]: 'home' | 'away' | null }>({})
  const { seasons, selectedSeason, setSelectedSeason, setSeasons } = useSeason();

  useEffect(() => {
    // Fetch seasons and set in context
    fetchSeasons()
      .then((data) => {
        setSeasons(data)
      })
      .catch((err) => setError(err.message))
  }, [setSeasons])

  useEffect(() => {
    if (selectedSeason == null) return;
    setLoading(true)
    fetchGamesBySeason(selectedSeason)
      .then((data) => {
        setGames(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [selectedSeason])

  useEffect(() => {
    // Fetch teams for mapping
    fetchTeams().then((data) => {
      setTeams(data)
      const map: { [key: number]: string } = {}
      let userId: number | null = null
      data.forEach((team: any) => {
        map[team.team_id] = team.name
        if (team.is_user_controlled) userId = team.team_id
      })
      setTeamMap(map)
      setUserTeamId(userId)
    })
  }, [])

  // Automatic win/loss logic for user team
  const getUserResultBadge = (game: any) => {
    if (userTeamId == null) return null;
    const home = game.home_team_id === userTeamId;
    const away = game.away_team_id === userTeamId;
    const homeScore = Number(resultForms[game.game_id]?.home_score ?? game.home_score);
    const awayScore = Number(resultForms[game.game_id]?.away_score ?? game.away_score);
    if (!home && !away) return null;
    if (isNaN(homeScore) || isNaN(awayScore)) return <Badge variant="outline">Upcoming</Badge>;
    if (home && homeScore > awayScore) return <Badge className="bg-green-100 text-green-800">W</Badge>;
    if (away && awayScore > homeScore) return <Badge className="bg-green-100 text-green-800">W</Badge>;
    if (home && homeScore < awayScore) return <Badge className="bg-red-100 text-red-800">L</Badge>;
    if (away && awayScore < homeScore) return <Badge className="bg-red-100 text-red-800">L</Badge>;
    return <Badge variant="outline">-</Badge>;
  }

  const handleAddFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value })
  }
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeason(Number(e.target.value))
  }
  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      await addGame({ ...addForm, season_id: selectedSeason })
      setAddForm({ week: '', opponent_name: '', date: '', time: '', location: '', game_type: 'Regular' })
      const data = await fetchGamesBySeason(selectedSeason!)
      setGames(data)
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }
  const handleResultFormChange = (gameId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    setResultForms({
      ...resultForms,
      [gameId]: {
        ...resultForms[gameId],
        [e.target.name]: e.target.value
      }
    })
  }
  const handleUpdateResult = async (gameId: number, e: React.FormEvent) => {
    e.preventDefault()
    setResultLoading(gameId)
    setResultError(null)
    try {
      const { home_score, away_score } = resultForms[gameId] || {}
      await updateGameResult(gameId, { home_score: Number(home_score), away_score: Number(away_score) })
      const data = await fetchGamesBySeason(selectedSeason!)
      setGames(data)
      setResultForms((prev) => ({ ...prev, [gameId]: { home_score: '', away_score: '' } }))
    } catch (err: any) {
      setResultError(err.message)
    } finally {
      setResultLoading(null)
    }
  }

  // Inline update handler for score inputs
  const handleUpdateResultInline = async (gameId: number, home_score: number, away_score: number) => {
    setResultLoading(gameId)
    setResultError(null)
    try {
      await updateGameResult(gameId, { home_score, away_score })
      
      // Update the game locally instead of fetching all games
      setGames(prev => prev.map(game => 
        game.game_id === gameId 
          ? { ...game, home_score, away_score }
          : game
      ))
      
      // Recalculate wins/losses for both teams involved in the game
      const game = games.find(g => g.game_id === gameId);
      if (game && game.home_team_id && game.away_team_id) {
        const homeTeamId = game.home_team_id;
        const awayTeamId = game.away_team_id;
        
        // Get all games for the season with updated scores
        const updatedGames = games.map(g => 
          g.game_id === gameId ? { ...g, home_score, away_score } : g
        );
        
        // Calculate records for home team
        let homeWins = 0, homeLosses = 0, homeConfWins = 0, homeConfLosses = 0;
        const homeTeam = teams.find(t => t.team_id === homeTeamId);
        const homeConfId = homeTeam?.primary_conference_id;
        
        updatedGames.forEach((g: any) => {
          if (g.home_score == null || g.away_score == null) return;
          
          // Overall record
          if (g.home_team_id === homeTeamId) {
            if (g.home_score > g.away_score) homeWins++;
            else if (g.home_score < g.away_score) homeLosses++;
          } else if (g.away_team_id === homeTeamId) {
            if (g.away_score > g.home_score) homeWins++;
            else if (g.away_score < g.home_score) homeLosses++;
          }
          
          // Conference record (only count games against conference opponents)
          if (g.game_type === 'Conference') {
            const awayTeam = teams.find(t => t.team_id === g.away_team_id);
            const awayConfId = awayTeam?.primary_conference_id;
            
            if (g.home_team_id === homeTeamId && awayConfId === homeConfId) {
              if (g.home_score > g.away_score) homeConfWins++;
              else if (g.home_score < g.away_score) homeConfLosses++;
            } else if (g.away_team_id === homeTeamId && awayConfId === homeConfId) {
              if (g.away_score > g.home_score) homeConfWins++;
              else if (g.away_score < g.home_score) homeConfLosses++;
            }
          }
        });
        
        // Calculate records for away team
        let awayWins = 0, awayLosses = 0, awayConfWins = 0, awayConfLosses = 0;
        const awayTeam = teams.find(t => t.team_id === awayTeamId);
        const awayConfId = awayTeam?.primary_conference_id;
        
        updatedGames.forEach((g: any) => {
          if (g.home_score == null || g.away_score == null) return;
          
          // Overall record
          if (g.home_team_id === awayTeamId) {
            if (g.home_score > g.away_score) awayWins++;
            else if (g.home_score < g.away_score) awayLosses++;
          } else if (g.away_team_id === awayTeamId) {
            if (g.away_score > g.home_score) awayWins++;
            else if (g.away_score < g.home_score) awayLosses++;
          }
          
          // Conference record
          if (g.game_type === 'Conference') {
            const homeTeam = teams.find(t => t.team_id === g.home_team_id);
            const homeConfId = homeTeam?.primary_conference_id;
            
            if (g.home_team_id === awayTeamId && homeConfId === awayConfId) {
              if (g.home_score > g.away_score) awayConfWins++;
              else if (g.home_score < g.away_score) awayConfLosses++;
            } else if (g.away_team_id === awayTeamId && homeConfId === awayConfId) {
              if (g.away_score > g.home_score) awayConfWins++;
              else if (g.away_score < g.home_score) awayConfLosses++;
            }
          }
        });
        
        // Update both teams' records
        await Promise.all([
          updateTeamSeason(selectedSeason!, homeTeamId, { 
            wins: homeWins, 
            losses: homeLosses,
            conference_wins: homeConfWins,
            conference_losses: homeConfLosses
          }),
          updateTeamSeason(selectedSeason!, awayTeamId, { 
            wins: awayWins, 
            losses: awayLosses,
            conference_wins: awayConfWins,
            conference_losses: awayConfLosses
          })
        ]);
      }
    } catch (err: any) {
      setResultError(err.message)
    } finally {
      setResultLoading(null)
    }
  }

  const handleSwapHomeAway = async (gameId: number) => {
    const game = games.find(g => g.game_id === gameId);
    if (!game) return;
    
    setResultLoading(gameId);
    try {
      // Swap home and away teams, and also swap their scores
      await updateGameResult(gameId, {
        home_team_id: game.away_team_id,
        away_team_id: game.home_team_id,
        home_score: game.away_score,
        away_score: game.home_score
      });
      const data = await fetchGamesBySeason(selectedSeason!);
      setGames(data);
    } catch (error) {
      console.error('Failed to swap home/away:', error);
    } finally {
      setResultLoading(null);
    }
  }

  const handleSetByeWeek = async (gameId: number) => {
    const game = games.find(g => g.game_id === gameId);
    if (!game) return;
    
    setResultLoading(gameId);
    try {
      // Set game type to "Bye Week" and clear scores
      await updateGameResult(gameId, {
        game_type: 'Bye Week',
        home_score: null,
        away_score: null
      });
      const data = await fetchGamesBySeason(selectedSeason!);
      setGames(data);
    } catch (error) {
      console.error('Failed to set bye week:', error);
    } finally {
      setResultLoading(null);
    }
  }

  const handleRemoveByeWeek = async (gameId: number) => {
    const game = games.find(g => g.game_id === gameId);
    if (!game) return;
    
    setResultLoading(gameId);
    try {
      // Find the alphabetically first team that isn't the user-controlled team
      const availableTeams = teams.filter((t: any) => t.team_id !== userTeamId);
      const firstOpponent = availableTeams.sort((a: any, b: any) => a.name.localeCompare(b.name))[0];
      
      if (!firstOpponent) {
        console.error('No available opponents found');
        return;
      }
      
      // Set game type back to "Regular" and set the opponent
      await updateGameResult(gameId, {
        game_type: 'Regular',
        home_team_id: userTeamId,
        away_team_id: firstOpponent.team_id
      });
      const data = await fetchGamesBySeason(selectedSeason!);
      setGames(data);
    } catch (error) {
      console.error('Failed to remove bye week:', error);
    } finally {
      setResultLoading(null);
    }
  }

  if (loading) return <div className="p-8">Loading games...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Games & Schedule</h1>
          <p className="text-gray-600">View game results, upcoming schedule, and playoff brackets</p>
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
            <TabsTrigger value="schedule">Schedule & Results</TabsTrigger>
            <TabsTrigger value="playoffs">Playoff Bracket</TabsTrigger>
            <TabsTrigger value="stats">Season Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            {/* Game List with Update Result forms */}
            {[...games].sort((a, b) => a.week - b.week).map((game, index) => (
              <Card key={game.game_id || index} className="hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white to-gray-50">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          Week {game.week}
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-800">
                          {(() => {
                            const homeName = teamMap[game.home_team_id] || game.home_team_id;
                            const awayName = teamMap[game.away_team_id] || game.away_team_id;
                            
                            // Check if this is a bye week
                            if (game.game_type === 'Bye Week') {
                              return (
                                <span className="text-gray-500 italic">
                                  Bye Week
                                </span>
                              );
                            }
                            
                            if (homeName === 'TBD' && awayName === 'TBD') return 'TBD';
                            if (userTeamId) {
                              if (game.home_team_id === userTeamId) {
                                // User is home, opponent is away (combobox)
                                return (
                                  <>
                                    vs{' '}
                                    <Popover open={openCombobox[game.game_id] === 'away'} onOpenChange={open => setOpenCombobox(prev => ({ ...prev, [game.game_id]: open ? 'away' : null }))}>
                                      <PopoverTrigger asChild>
                                        <button className="font-medium border-2 border-blue-200 rounded-lg px-3 py-1 bg-white hover:bg-blue-50 transition-colors" onClick={e => { e.preventDefault(); setOpenCombobox(prev => ({ ...prev, [game.game_id]: 'away' })); }}>
                                          {awayName}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent align="start" className="p-0 w-60">
                                        <Command>
                                          <CommandInput placeholder="Search team..." />
                                          <CommandList>
                                            {teams.filter((t: any) => t.team_id !== userTeamId).map((t: any) => (
                                              <CommandItem key={t.team_id} value={t.name} onSelect={async () => {
                                                await updateGameResult(game.game_id, {
                                                  home_score: Number(resultForms[game.game_id]?.home_score ?? game.home_score ?? 0),
                                                  away_score: Number(resultForms[game.game_id]?.away_score ?? game.away_score ?? 0),
                                                  home_team_id: game.home_team_id,
                                                  away_team_id: t.team_id
                                                });
                                                const data = await fetchGamesBySeason(selectedSeason!);
                                                setGames(data);
                                                setOpenCombobox(prev => ({ ...prev, [game.game_id]: null }));
                                              }}>{t.name}</CommandItem>
                                            ))}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </>
                                );
                              }
                              if (game.away_team_id === userTeamId) {
                                // User is away, opponent is home (combobox)
                                return (
                                  <>
                                    @{' '}
                                    <Popover open={openCombobox[game.game_id] === 'home'} onOpenChange={open => setOpenCombobox(prev => ({ ...prev, [game.game_id]: open ? 'home' : null }))}>
                                      <PopoverTrigger asChild>
                                        <button className="font-medium border-2 border-blue-200 rounded-lg px-3 py-1 bg-white hover:bg-blue-50 transition-colors" onClick={e => { e.preventDefault(); setOpenCombobox(prev => ({ ...prev, [game.game_id]: 'home' })); }}>
                                          {homeName}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent align="start" className="p-0 w-60">
                                        <Command>
                                          <CommandInput placeholder="Search team..." />
                                          <CommandList>
                                            {teams.filter((t: any) => t.team_id !== userTeamId).map((t: any) => (
                                              <CommandItem key={t.team_id} value={t.name} onSelect={async () => {
                                                await updateGameResult(game.game_id, {
                                                  home_score: Number(resultForms[game.game_id]?.home_score ?? game.home_score ?? 0),
                                                  away_score: Number(resultForms[game.game_id]?.away_score ?? game.away_score ?? 0),
                                                  home_team_id: t.team_id,
                                                  away_team_id: game.away_team_id
                                                });
                                                const data = await fetchGamesBySeason(selectedSeason!);
                                                setGames(data);
                                                setOpenCombobox(prev => ({ ...prev, [game.game_id]: null }));
                                              }}>{t.name}</CommandItem>
                                            ))}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </>
                                );
                              }
                            }
                            if (homeName === 'TBD') return `@ ${awayName}`;
                            if (awayName === 'TBD') return `vs ${homeName}`;
                            // Default: show as home game
                            return `vs ${awayName}`;
                          })()}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={game.game_type === "Conference" ? "default" : game.game_type === "Bye Week" ? "secondary" : "secondary"} className="text-xs px-2 py-1">
                          {game.game_type ?? "Regular"}
                        </Badge>
                        {game.game_type !== 'Bye Week' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`overtime-${game.game_id}`}
                              checked={game.overtime || false}
                              onChange={async (e) => {
                                await updateGameResult(game.game_id, {
                                  overtime: e.target.checked
                                });
                                // Update locally
                                setGames(prev => prev.map(g => 
                                  g.game_id === game.game_id 
                                    ? { ...g, overtime: e.target.checked }
                                    : g
                                ));
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`overtime-${game.game_id}`} className="text-sm font-medium text-gray-700">
                              OT
                            </label>
                          </div>
                        )}
                        {userTeamId && (game.home_team_id === userTeamId || game.away_team_id === userTeamId) && game.game_type !== 'Bye Week' && (
                          <button
                            onClick={() => handleSwapHomeAway(game.game_id)}
                            disabled={resultLoading === game.game_id}
                            className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Swap home/away"
                          >
                            {game.home_team_id === userTeamId ? 'Home' : 'Away'} ↔
                          </button>
                        )}
                        {userTeamId && (game.home_team_id === userTeamId || game.away_team_id === userTeamId) && game.game_type !== 'Bye Week' && (
                          <button
                            onClick={() => handleSetByeWeek(game.game_id)}
                            disabled={resultLoading === game.game_id}
                            className="text-xs px-2 py-1 border rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed text-orange-600 border-orange-300 transition-colors"
                            title="Set as bye week"
                          >
                            Set Bye
                          </button>
                        )}
                        {userTeamId && (game.home_team_id === userTeamId || game.away_team_id === userTeamId) && game.game_type === 'Bye Week' && (
                          <button
                            onClick={() => handleRemoveByeWeek(game.game_id)}
                            disabled={resultLoading === game.game_id}
                            className="text-xs px-2 py-1 border rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed text-blue-600 border-blue-300 transition-colors"
                            title="Remove bye week"
                          >
                            Remove Bye
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-6">
                      {game.game_type === 'Bye Week' ? (
                        <div className="text-gray-500 italic text-sm bg-gray-100 px-3 py-2 rounded-lg">
                          No game this week
                        </div>
                      ) : (
                        <>
                          <div className="mb-3">
                            {getUserResultBadge(game)}
                          </div>
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm">
                            <div className="space-y-3">
                              {/* Away team row */}
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const awayTeam = teams.find((t: any) => t.team_id === game.away_team_id);
                                  if (awayTeam && awayTeam.logo_url) {
                                    return <img src={awayTeam.logo_url} alt={awayTeam.name} className="w-8 h-8 rounded-full shadow-sm" />;
                                  }
                                  return <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">?</div>;
                                })()}
                                {(() => {
                                  const awayTeam = teams.find((t: any) => t.team_id === game.away_team_id);
                                  if (awayTeam && awayTeam.abbreviation) {
                                    return <span className="text-sm font-semibold text-gray-700 min-w-[40px]">{awayTeam.abbreviation}</span>;
                                  }
                                  return <span className="text-sm font-semibold text-gray-700 min-w-[40px]">TBD</span>;
                                })()}
                                <input
                                  type="number"
                                  value={resultForms[game.game_id]?.away_score ?? (game.away_score ?? '')}
                                  onChange={e => setResultForms(prev => ({
                                    ...prev,
                                    [game.game_id]: {
                                      ...prev[game.game_id],
                                      away_score: e.target.value,
                                      home_score: prev[game.game_id]?.home_score ?? (game.home_score ?? '')
                                    }
                                  }))}
                                  onBlur={e => {
                                    const home_score = Number(resultForms[game.game_id]?.home_score ?? game.home_score ?? 0);
                                    const away_score = Number(resultForms[game.game_id]?.away_score ?? game.away_score ?? 0);
                                    if (!isNaN(home_score) && !isNaN(away_score)) {
                                      handleUpdateResultInline(game.game_id, home_score, away_score);
                                    }
                                  }}
                                  className={`border-2 border-gray-300 rounded-lg px-3 py-2 w-20 text-center text-lg font-bold focus:border-blue-500 focus:outline-none transition-colors ${resultLoading === game.game_id ? 'opacity-50' : ''}`}
                                  disabled={resultLoading === game.game_id}
                                />
                              </div>
                              {/* Home team row */}
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const homeTeam = teams.find((t: any) => t.team_id === game.home_team_id);
                                  if (homeTeam && homeTeam.logo_url) {
                                    return <img src={homeTeam.logo_url} alt={homeTeam.name} className="w-8 h-8 rounded-full shadow-sm" />;
                                  }
                                  return <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">?</div>;
                                })()}
                                {(() => {
                                  const homeTeam = teams.find((t: any) => t.team_id === game.home_team_id);
                                  if (homeTeam && homeTeam.abbreviation) {
                                    return <span className="text-sm font-semibold text-gray-700 min-w-[40px]">{homeTeam.abbreviation}</span>;
                                  }
                                  return <span className="text-sm font-semibold text-gray-700 min-w-[40px]">TBD</span>;
                                })()}
                                <input
                                  type="number"
                                  value={resultForms[game.game_id]?.home_score ?? (game.home_score ?? '')}
                                  onChange={e => setResultForms(prev => ({
                                    ...prev,
                                    [game.game_id]: {
                                      ...prev[game.game_id],
                                      home_score: e.target.value,
                                      away_score: prev[game.game_id]?.away_score ?? (game.away_score ?? '')
                                    }
                                  }))}
                                  onBlur={e => {
                                    const home_score = Number(resultForms[game.game_id]?.home_score ?? game.home_score ?? 0);
                                    const away_score = Number(resultForms[game.game_id]?.away_score ?? game.away_score ?? 0);
                                    if (!isNaN(home_score) && !isNaN(away_score)) {
                                      handleUpdateResultInline(game.game_id, home_score, away_score);
                                    }
                                  }}
                                  className={`border-2 border-gray-300 rounded-lg px-3 py-2 w-20 text-center text-lg font-bold focus:border-blue-500 focus:outline-none transition-colors ${resultLoading === game.game_id ? 'opacity-50' : ''}`}
                                  disabled={resultLoading === game.game_id}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0" />
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="playoffs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  College Football Playoff Bracket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* You can fetch and display playoff bracket from backend if available */}
                  <div>Playoff bracket coming soon...</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Offensive Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Points Per Game</span>
                      <span className="font-bold">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Yards Per Game</span>
                      <span className="font-bold">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passing Yards Per Game</span>
                      <span className="font-bold">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rushing Yards Per Game</span>
                      <span className="font-bold">-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Defensive Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Points Allowed Per Game</span>
                      <span className="font-bold">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yards Allowed Per Game</span>
                      <span className="font-bold">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Turnovers Forced</span>
                      <span className="font-bold">-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
