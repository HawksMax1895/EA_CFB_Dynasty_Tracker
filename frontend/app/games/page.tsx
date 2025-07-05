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
import Bracket from './Bracket';

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

  console.log('GamesPage: selectedSeason', selectedSeason);

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
              setEditableStats({
                ...userTeam,
                offense_yards: userTeam.offense_yards,
                defense_yards: userTeam.defense_yards
              });
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
        // Background refetch to ensure consistency
        fetchTeamsBySeason(selectedSeason).then(teams => {
          const userTeam = teams.find((t: Team) => t.is_user_controlled);
          if (userTeam && (userTeam.offense_yards !== updatedStats.offense_yards || userTeam.defense_yards !== updatedStats.defense_yards)) {
            setTeamSeasonStats(userTeam);
            setEditableStats({
              ...userTeam,
              offense_yards: userTeam.offense_yards,
              defense_yards: userTeam.defense_yards
            });
          }
        });
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
    if (home && homeScore > awayScore) return <Badge variant="success">W</Badge>;
    if (away && awayScore > homeScore) return <Badge variant="success">W</Badge>;
    if (home && homeScore < awayScore) return <Badge variant="destructive">L</Badge>;
    if (away && awayScore < homeScore) return <Badge variant="destructive">L</Badge>;
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
      const firstOpponent = availableTeams.sort((a: Team, b: Team) => ((a as any).name || a.team_name).localeCompare((b as any).name || b.team_name))[0];
      
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

  if (selectedSeason == null) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading season...</p>
      </div>
    </div>
  );
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading games...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-destructive text-6xl mb-4">⚠️</div>
        <p className="text-destructive text-lg">Error: {error}</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Standardized Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Games & Schedule</h1>
          <p className="text-muted-foreground text-lg">View game results, upcoming schedule, and playoff brackets</p>
        </div>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="schedule">Schedule & Results</TabsTrigger>
          <TabsTrigger value="playoffs">Playoff Bracket</TabsTrigger>
          <TabsTrigger value="stats">Season Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {[...games].sort((a, b) => a.week - b.week).map((game, index) => (
            <Card key={game.game_id || index} className="hover:shadow-xl transition-all duration-300 border border-card bg-card">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        Week {game.week}
                      </div>
                      <CardTitle className="text-xl font-bold text-foreground">
                        {(() => {
                          const homeName = game.home_team_name || teamMap[game.home_team_id] || game.home_team_id;
                          const awayName = game.away_team_name || teamMap[game.away_team_id] || game.away_team_id;
                          
                          if (game.game_type === 'Bye Week') {
                            return (
                              <span className="text-muted-foreground italic">
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
                                      <button className="font-medium border-2 border-primary/20 rounded-lg px-3 py-1 bg-card hover:bg-primary/5 transition-colors text-foreground" onClick={e => { e.preventDefault(); setOpenCombobox(prev => ({ ...prev, [game.game_id]: 'away' })); }}>
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
                                      <button className="font-medium border-2 border-primary/20 rounded-lg px-3 py-1 bg-card hover:bg-primary/5 transition-colors text-foreground" onClick={e => { e.preventDefault(); setOpenCombobox(prev => ({ ...prev, [game.game_id]: 'home' })); }}>
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
                            className="w-4 h-4 text-primary bg-card border-card rounded focus:ring-primary"
                          />
                          <label htmlFor={`overtime-${game.game_id}`} className="text-sm font-medium text-foreground/80">
                            OT
                          </label>
                        </div>
                      )}
                      {userTeamId && (game.home_team_id === userTeamId || game.away_team_id === userTeamId) && game.game_type !== 'Bye Week' && (
                        <button
                          onClick={() => handleSwapHomeAway(game.game_id)}
                          disabled={resultLoading === game.game_id}
                          className="text-xs px-2 py-1 border rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed text-orange-600 border-orange-300 transition-colors"
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
                          className="text-xs px-2 py-1 border rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed text-orange-600 border-orange-300 transition-colors"
                          title="Remove bye week"
                        >
                          Remove Bye
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-6">
                    {game.game_type === 'Bye Week' ? (
                      <div className="text-muted-foreground italic text-sm bg-muted px-3 py-2 rounded-lg">
                        No game this week
                      </div>
                    ) : (
                      <>
                        <div className="mb-3">
                          {getUserResultBadge(game)}
                        </div>
                        <div className="bg-card rounded-lg border-2 border-card p-4 shadow-sm">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const awayTeam = teams.find((t: Team) => t.team_id === game.away_team_id);
                                if (awayTeam && awayTeam.logo_url) {
                                  return <img src={awayTeam.logo_url} alt={(awayTeam as any).team_name || (awayTeam as any).name} className="w-8 h-8 rounded-full shadow-sm" />;
                                }
                                return <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs text-muted-foreground">?</div>;
                              })()}
                              {(() => {
                                const awayTeam = teams.find((t: Team) => t.team_id === game.away_team_id);
                                if (awayTeam && awayTeam.abbreviation) {
                                  return <span className="text-sm font-semibold text-foreground min-w-[var(--size-10)]">{awayTeam.abbreviation}</span>;
                                }
                                return <span className="text-sm font-semibold text-foreground min-w-[var(--size-10)]">TBD</span>;
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
                                className={`border-2 border-card rounded-lg px-3 py-2 w-20 text-center text-lg font-bold focus:border-primary focus:outline-none transition-colors text-foreground bg-muted ${resultLoading === game.game_id ? 'opacity-50' : ''}`}
                                disabled={resultLoading === game.game_id}
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              {(() => {
                                const homeTeam = teams.find((t: Team) => t.team_id === game.home_team_id);
                                if (homeTeam && homeTeam.logo_url) {
                                  return <img src={homeTeam.logo_url} alt={(homeTeam as any).team_name || (homeTeam as any).name} className="w-8 h-8 rounded-full shadow-sm" />;
                                }
                                return <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs text-muted-foreground">?</div>;
                              })()}
                              {(() => {
                                const homeTeam = teams.find((t: Team) => t.team_id === game.home_team_id);
                                if (homeTeam && homeTeam.abbreviation) {
                                  return <span className="text-sm font-semibold text-foreground min-w-[var(--size-10)]">{homeTeam.abbreviation}</span>;
                                }
                                return <span className="text-sm font-semibold text-foreground min-w-[var(--size-10)]">TBD</span>;
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
                                className={`border-2 border-card rounded-lg px-3 py-2 w-20 text-center text-lg font-bold focus:border-primary focus:outline-none transition-colors text-foreground bg-muted ${resultLoading === game.game_id ? 'opacity-50' : ''}`}
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
              <Bracket seasonId={selectedSeason} />
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
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground">
                        {editableStats.off_ppg ?? "-"}
                      </span>
                      <input
                        type="number"
                        name="off_ppg_rank"
                        value={editableStats.off_ppg_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Offensive Yards</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="offense_yards"
                        value={editableStats.offense_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="offense_yards_rank"
                        value={editableStats.offense_yards_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Passing Yards</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="pass_yards"
                        value={editableStats.pass_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="pass_yards_rank"
                        value={editableStats.pass_yards_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Rushing Yards</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="rush_yards"
                        value={editableStats.rush_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="rush_yards_rank"
                        value={editableStats.rush_yards_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Passing TDs</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="pass_tds"
                        value={editableStats.pass_tds ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="pass_tds_rank"
                        value={editableStats.pass_tds_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Rushing TDs</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="rush_tds"
                        value={editableStats.rush_tds ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="rush_tds_rank"
                        value={editableStats.rush_tds_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
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
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground">
                        {editableStats.def_ppg ?? "-"}
                      </span>
                      <input
                        type="number"
                        name="def_ppg_rank"
                        value={editableStats.def_ppg_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Defensive Yards</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="defense_yards"
                        value={editableStats.defense_yards ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="defense_yards_rank"
                        value={editableStats.defense_yards_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Sacks</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="sacks"
                        value={editableStats.sacks ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="sacks_rank"
                        value={editableStats.sacks_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Interceptions</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="interceptions"
                        value={editableStats.interceptions ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-24 text-right font-bold bg-muted rounded-md p-1 text-foreground"
                      />
                      <input
                        type="number"
                        name="interceptions_rank"
                        value={editableStats.interceptions_rank ?? ""}
                        onChange={handleStatChange}
                        onBlur={handleStatUpdate}
                        className="w-12 text-xs text-muted-foreground border border-card rounded p-1 ml-2 bg-muted"
                        min={1}
                        max={130}
                        placeholder="#"
                      />
                    </div>
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
    </>
  )
}
