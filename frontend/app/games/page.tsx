"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy } from "lucide-react"
import React, { useEffect, useState } from "react"
import { updateGameResult, fetchGamesBySeason, fetchTeams, updateTeamSeason, fetchTeamsBySeason } from "@/lib/api"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command"
import { useSeason } from "@/context/SeasonContext"
import { Team, Game } from "@/types";

export default function GamesPage() {
  // Component State
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  
  const [resultLoading, setResultLoading] = useState<number | null>(null)
  
  const [resultForms, setResultForms] = useState<{ [key: number]: { home_score: string, away_score: string } }>({})
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMap, setTeamMap] = useState<{ [key: number]: string }>({})
  const [userTeamId, setUserTeamId] = useState<number | null>(null)
  
  const [openCombobox, setOpenCombobox] = useState<{ [gameId: number]: 'home' | 'away' | null }>({})
  const { selectedSeason } = useSeason();
  const [teamSeasonStats, setTeamSeasonStats] = useState<Team | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editableStats, setEditableStats] = useState<Partial<Team>>({});

  // Effects
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
    fetchTeams().then((data) => {
      setTeams(data)
      const map: { [key: number]: string } = {}
      let userId: number | null = null
      data.forEach((team: Team) => {
        const name = (team as any).team_name || (team as any).name
        map[team.team_id] = name
        if (team.is_user_controlled) userId = team.team_id
      })
      setTeamMap(map)
      setUserTeamId(userId)
    })
  }, [])

  useEffect(() => {
    if (!selectedSeason) return;
    setStatsLoading(true);
    fetchTeamsBySeason(selectedSeason)
        .then(teams => {
            const userTeam = teams.find((t: Team) => t.is_user_controlled);
            setTeamSeasonStats(userTeam || null);
            if (userTeam) {
              setEditableStats(userTeam);
            }
        })
        .catch(err => {
            setError(err.message);
        })
        .finally(() => {
            setStatsLoading(false);
        });
  }, [selectedSeason]);

  // Handlers
  const handleStatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableStats(prev => ({ ...prev, [name]: value }));
  };

  const handleStatUpdate = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!selectedSeason || !userTeamId) return;

    // Allow updates even if teamSeasonStats is null (for initial creation)
    const numericValue = name !== 'prestige' && name !== 'team_rating' ? (value === '' ? null : parseFloat(value)) : value;
    
    // Get the original value from the editable state, which reflects the most recent data
    const originalValue = teamSeasonStats ? teamSeasonStats[name as keyof Team] : null;

    if (String(numericValue) !== String(originalValue)) {
      try {
        await updateTeamSeason(selectedSeason, userTeamId, { [name]: numericValue });
        
        // Optimistically update the local state
        const updatedStats = { ...teamSeasonStats, [name]: numericValue, team_id: userTeamId };
        setTeamSeasonStats(updatedStats as Team);
        setEditableStats(updatedStats);

      } catch (error) {
        console.error("Failed to update stat:", error);
        // Revert on error
        setEditableStats(teamSeasonStats || {});
      }
    }
  };

  const getUserResultBadge = (game: Game) => {
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

  const handleUpdateResultInline = async (gameId: number, home_score: number, away_score: number) => {
    setResultLoading(gameId)
    
    try {
      await updateGameResult(gameId, { home_score, away_score })
      
      setGames(prev => prev.map(game => 
        game.game_id === gameId 
          ? { ...game, home_score, away_score }
          : game
      ))
      
      const game = games.find(g => g.game_id === gameId);
      if (game && game.home_team_id && game.away_team_id) {
        const homeTeamId = game.home_team_id;
        const awayTeamId = game.away_team_id;
        
        const updatedGames = games.map(g => 
          g.game_id === gameId ? { ...g, home_score, away_score } : g
        );
        
        let homeWins = 0, homeLosses = 0, homeConfWins = 0, homeConfLosses = 0;
        const homeTeam = teams.find(t => t.team_id === homeTeamId);
        const homeConfId = homeTeam?.primary_conference_id;
        
        updatedGames.forEach((g: Game) => {
          if (g.home_score == null || g.away_score == null) return;
          
          if (g.home_team_id === homeTeamId) {
            if (g.home_score > g.away_score) homeWins++;
            else if (g.home_score < g.away_score) homeLosses++;
          } else if (g.away_team_id === homeTeamId) {
            if (g.away_score > g.home_score) homeWins++;
            else if (g.away_score < g.home_score) homeLosses++;
          }
          
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
        
        let awayWins = 0, awayLosses = 0, awayConfWins = 0, awayConfLosses = 0;
        const awayTeam = teams.find(t => t.team_id === awayTeamId);
        const awayConfId = awayTeam?.primary_conference_id;
        
        updatedGames.forEach((g: Game) => {
          if (g.home_score == null || g.away_score == null) return;
          
          if (g.home_team_id === awayTeamId) {
            if (g.home_score > g.away_score) awayWins++;
            else if (g.home_score < g.away_score) awayLosses++;
          } else if (g.away_team_id === awayTeamId) {
            if (g.away_score > g.home_score) awayWins++;
            else if (g.away_score < g.home_score) awayLosses++;
          }
          
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
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setResultLoading(null)
    }
  }

  const handleSwapHomeAway = async (gameId: number) => {
    const game = games.find(g => g.game_id === gameId);
    if (!game) return;
    
    setResultLoading(gameId);
    try {
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
      const availableTeams = teams.filter((t: Team) => t.team_id !== userTeamId);
      const firstOpponent = availableTeams.sort((a: Team, b: Team) => a.team_name.localeCompare(b.team_name))[0];
      
      if (!firstOpponent) {
        console.error('No available opponents found');
        return;
      }
      
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
                            const homeName = game.home_team_name || teamMap[game.home_team_id] || game.home_team_id;
                            const awayName = game.away_team_name || teamMap[game.away_team_id] || game.away_team_id;
                            
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
                                            {[...teams].sort((a: Team, b: Team) => {
                                              const nameA = (a as any).team_name || (a as any).name || '';
                                              const nameB = (b as any).team_name || (b as any).name || '';
                                              return nameA.localeCompare(nameB);
                                            }).map((t: Team) => (
                                              <CommandItem key={t.team_id} value={(t as any).team_name || (t as any).name} onSelect={async () => {
                                                await updateGameResult(game.game_id, {
                                                  home_score: Number(resultForms[game.game_id]?.home_score ?? game.home_score ?? 0),
                                                  away_score: Number(resultForms[game.game_id]?.away_score ?? game.away_score ?? 0),
                                                  home_team_id: game.home_team_id,
                                                  away_team_id: t.team_id
                                                });
                                                const data = await fetchGamesBySeason(selectedSeason!);
                                                setGames(data);
                                                setOpenCombobox(prev => ({ ...prev, [game.game_id]: null }));
                                              }}>{(t as any).team_name || (t as any).name}</CommandItem>
                                            ))}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </>
                                );
                              }
                              if (game.away_team_id === userTeamId) {
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
                                            {[...teams].sort((a: Team, b: Team) => {
                                              const nameA = (a as any).team_name || (a as any).name || '';
                                              const nameB = (b as any).team_name || (b as any).name || '';
                                              return nameA.localeCompare(nameB);
                                            }).map((t: Team) => (
                                              <CommandItem key={t.team_id} value={(t as any).team_name || (t as any).name} onSelect={async () => {
                                                await updateGameResult(game.game_id, {
                                                  home_score: Number(resultForms[game.game_id]?.home_score ?? game.home_score ?? 0),
                                                  away_score: Number(resultForms[game.game_id]?.away_score ?? game.away_score ?? 0),
                                                  home_team_id: t.team_id,
                                                  away_team_id: game.away_team_id
                                                });
                                                const data = await fetchGamesBySeason(selectedSeason!);
                                                setGames(data);
                                                setOpenCombobox(prev => ({ ...prev, [game.game_id]: null }));
                                              }}>{(t as any).team_name || (t as any).name}</CommandItem>
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
                            return `vs ${awayName}`;
                          })()}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={game.game_type === "Conference" ? "default" : game.game_type === "Bye Week" ? "secondary" : "secondary"} className="text-xs px-2 py-1">
                          {game.game_type ?? "Regular"}
                        </Badge>
                        {game.game_type !== 'Bye Week' && (
                          <Badge variant={game.is_conference_game ? "default" : "secondary"} className="text-xs px-2 py-1">
                            {game.is_conference_game ? 'Conf' : 'Non-Conf'}
                          </Badge>
                        )}
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
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const awayTeam = teams.find((t: Team) => t.team_id === game.away_team_id);
                                  if (awayTeam && awayTeam.logo_url) {
                                    return <img src={awayTeam.logo_url} alt={(awayTeam as any).team_name || (awayTeam as any).name} className="w-8 h-8 rounded-full shadow-sm" />;
                                  }
                                  return <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">?</div>;
                                })()}
                                {(() => {
                                  const awayTeam = teams.find((t: Team) => t.team_id === game.away_team_id);
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
                                  onBlur={() => {
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
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const homeTeam = teams.find((t: Team) => t.team_id === game.home_team_id);
                                  if (homeTeam && homeTeam.logo_url) {
                                    return <img src={homeTeam.logo_url} alt={(homeTeam as any).team_name || (homeTeam as any).name} className="w-8 h-8 rounded-full shadow-sm" />;
                                  }
                                  return <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">?</div>;
                                })()}
                                {(() => {
                                  const homeTeam = teams.find((t: Team) => t.team_id === game.home_team_id);
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
                                  onBlur={() => {
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
                  <div>Playoff bracket coming soon...</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {statsLoading ? (
              <div>Loading stats...</div>
            ) : teamSeasonStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Offensive Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Points Per Game</span>
                      <input
                        type="number"
                        name="off_ppg"
                        value={editableStats.off_ppg ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Offensive Yards</span>
                      <input
                        type="number"
                        name="offense_yards"
                        value={editableStats.offense_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Passing Yards</span>
                      <input
                        type="number"
                        name="pass_yards"
                        value={editableStats.pass_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Rushing Yards</span>
                      <input
                        type="number"
                        name="rush_yards"
                        value={editableStats.rush_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Passing TDs</span>
                      <input
                        type="number"
                        name="pass_tds"
                        value={editableStats.pass_tds ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Rushing TDs</span>
                      <input
                        type="number"
                        name="rush_tds"
                        value={editableStats.rush_tds ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
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
                    <div className="flex justify-between items-center">
                      <span>Points Allowed Per Game</span>
                      <input
                        type="number"
                        name="def_ppg"
                        value={editableStats.def_ppg ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Yards Allowed</span>
                      <input
                        type="number"
                        name="defense_yards"
                        value={editableStats.defense_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Sacks</span>
                      <input
                        type="number"
                        name="sacks"
                        value={editableStats.sacks ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Interceptions</span>
                      <input
                        type="number"
                        name="interceptions"
                        value={editableStats.interceptions ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-gray-100 rounded-md p-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            ) : (
              <div>No season stats available.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
