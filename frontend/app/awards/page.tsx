"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Award, Star, Medal, Pencil } from "lucide-react"
import React, { useEffect, useState, useRef } from "react"
import { fetchAwards, fetchHonors, addHonors, fetchAwardWinnersBySeason, fetchAllAwardsForSeason, fetchAllPlayersBySeason, fetchTeamsBySeason, updateAwardWinner, declareAwardWinner, addPlayer, fetchHonorsBySeason, fetchHonorTypes, checkHonorRequiresWeek } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { useSeason } from "@/context/SeasonContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AwardsPage() {
  const [awardWinners, setAwardWinners] = useState<any[]>([])
  const [allAwards, setAllAwards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedSeason } = useSeason();
  const [editModal, setEditModal] = useState<{ open: boolean, awardWinner: any | null }>({ open: false, awardWinner: null })
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [editPlayerId, setEditPlayerId] = useState<number | null>(null)
  const [editTeamId, setEditTeamId] = useState<number | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayer, setNewPlayer] = useState({ name: "", position: "", team_id: null as number | null, ovr_rating: 70 })
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [playerSelectOpen, setPlayerSelectOpen] = useState(false)
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerTeamFilter, setPlayerTeamFilter] = useState<number | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const teamSearchInputRef = useRef<HTMLInputElement>(null);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);
  const [userSelectedPlayer, setUserSelectedPlayer] = useState(false);
  const [seasonHonors, setSeasonHonors] = useState<any[]>([]);
  const [honorsLoading, setHonorsLoading] = useState(false);
  const [honorsError, setHonorsError] = useState<string | null>(null);
  const [addHonorOpen, setAddHonorOpen] = useState(false);
  const [newHonor, setNewHonor] = useState({ player_id: '', honor_id: '', side: '', conference_id: '', week: '' });
  const [addingHonor, setAddingHonor] = useState(false);
  const [addHonorError, setAddHonorError] = useState<string | null>(null);
  const [honorTypes, setHonorTypes] = useState<any[]>([]);
  const [selectedHonorRequiresWeek, setSelectedHonorRequiresWeek] = useState(false);

  const filteredPlayers = allPlayers.filter(p => {
    const matchesName = p.name.toLowerCase().includes(playerSearch.toLowerCase());
    const matchesTeam = playerTeamFilter == null || p.team_id === playerTeamFilter;
    return matchesName && matchesTeam;
  });

  useEffect(() => {
    if (!selectedSeason) return;
    setLoading(true)
    Promise.all([
      fetchAllAwardsForSeason(selectedSeason),
      fetchAllPlayersBySeason(selectedSeason),
      fetchTeamsBySeason(selectedSeason)
    ])
      .then(([awardsData, playersData, teamsData]) => {
        setAllAwards(awardsData)
        setAwardWinners(awardsData.filter((award: any) => award.has_winner))
        setAllPlayers(playersData)
        setAllTeams(teamsData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [selectedSeason])

  useEffect(() => {
    if (teamSearchInputRef.current) {
      teamSearchInputRef.current.focus();
    }
  }, [playerTeamFilter, playerSelectOpen]);

  useEffect(() => {
    if (!userSelectedPlayer && playerSearch && filteredPlayers.length > 0) {
      setEditPlayerId(filteredPlayers[0].player_id);
      setEditTeamId(filteredPlayers[0].team_id);
    }
    // If search is cleared, do not auto-select
    if (!playerSearch) {
      setUserSelectedPlayer(false);
    }
  }, [playerSearch, filteredPlayers, userSelectedPlayer]);

  useEffect(() => {
    if (!selectedSeason) return;
    setHonorsLoading(true);
    fetchHonorsBySeason(selectedSeason)
      .then(setSeasonHonors)
      .catch(e => setHonorsError(e.message))
      .finally(() => setHonorsLoading(false));
  }, [selectedSeason]);

  useEffect(() => {
    fetchHonorTypes()
      .then(setHonorTypes)
      .catch(e => console.error('Failed to fetch honor types:', e));
  }, []);

  // Check if selected honor requires week field
  const checkHonorWeekRequirement = async (honorId: string) => {
    if (!honorId) {
      setSelectedHonorRequiresWeek(false);
      return;
    }
    
    try {
      const result = await checkHonorRequiresWeek(parseInt(honorId));
      setSelectedHonorRequiresWeek(result.requires_week);
    } catch (error) {
      console.error('Failed to check honor week requirement:', error);
      setSelectedHonorRequiresWeek(false);
    }
  };

  const openEdit = (award: any) => {
    setEditPlayerId(award.player_id || null)
    setEditTeamId(award.team_id || null)
    setEditModal({ open: true, awardWinner: award })
  }
  const closeEdit = () => setEditModal({ open: false, awardWinner: null })

  const handleSaveEdit = async () => {
    if (!editModal.awardWinner || !editPlayerId) return;
    // Find the selected player's team
    const selected = allPlayers.find(p => p.player_id === editPlayerId)
    const teamId = selected?.team_id
    if (!teamId) return;
    setSavingEdit(true)
    try {
      if (editModal.awardWinner.has_winner) {
        await updateAwardWinner(editModal.awardWinner.award_winner_id, { player_id: editPlayerId, team_id: teamId })
      } else {
        await declareAwardWinner(selectedSeason!, editModal.awardWinner.award_id, editPlayerId, teamId)
      }
      // Refresh list
      const data = await fetchAllAwardsForSeason(selectedSeason!)
      setAllAwards(data)
      setAwardWinners(data.filter((award: any) => award.has_winner))
      closeEdit()
    } catch (err) {
      alert("Failed to update award winner")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Add player submitted", newPlayer);
    if (!newPlayer.name || !newPlayer.position || !newPlayer.team_id) return;
    setAddingPlayer(true);
    try {
      const created = await addPlayer({ 
        ...newPlayer, 
        team_id: newPlayer.team_id,
        season_id: selectedSeason,
        ovr_rating: newPlayer.ovr_rating
      });
      // Refresh player list and select new player
      const players = await fetchAllPlayersBySeason(selectedSeason!);
      setAllPlayers(players);
      setEditPlayerId(created.player_id); // Auto-select the new player
      setShowAddPlayer(false); // Only hide the add player form
      setNewPlayer({ name: "", position: "", team_id: null, ovr_rating: 70 });
      // Do NOT call handleSaveEdit or close the modal here
    } catch (err) {
      alert("Failed to add player");
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleAddHonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHonor.player_id || !newHonor.honor_id || !selectedSeason) {
      setAddHonorError('Player and honor type are required');
      return;
    }
    
    // Check if week is required for the selected honor
    if (selectedHonorRequiresWeek && (!newHonor.week || newHonor.week === '')) {
      setAddHonorError('Week is required for Player of the Week honors');
      return;
    }
    
    setAddingHonor(true);
    setAddHonorError(null);
    try {
      const selectedPlayer = userTeamPlayers.find(p => p.player_id.toString() === newHonor.player_id);
      if (!selectedPlayer) {
        throw new Error('Selected player not found');
      }
      
      await addHonors(selectedSeason, selectedPlayer.team_id, [{
        player_id: parseInt(newHonor.player_id),
        honor_id: parseInt(newHonor.honor_id),
        week: selectedHonorRequiresWeek ? parseInt(newHonor.week) : null
      }]);
      
      setAddHonorOpen(false);
      setNewHonor({ player_id: '', honor_id: '', side: '', conference_id: '', week: '' });
      setSelectedHonorRequiresWeek(false);
      
      // Refresh honors list
      setHonorsLoading(true);
      fetchHonorsBySeason(selectedSeason)
        .then(setSeasonHonors)
        .catch(e => setHonorsError(e.message))
        .finally(() => setHonorsLoading(false));
    } catch (err: any) {
      setAddHonorError(err.message || 'Failed to add honor');
    } finally {
      setAddingHonor(false);
    }
  };

  // Find the user-controlled team and players above the return
  const userTeam = allTeams.find(t => t.is_user_controlled);
  const userTeamPlayers = userTeam ? allPlayers.filter(p => p.team_id === userTeam.team_id) : [];
  
  // Filter honor types to only show national honors and user team's conference honors
  const filteredHonorTypes = honorTypes.filter(honor => 
    honor.conference_id === null || // National honors
    honor.conference_id === userTeam?.primary_conference_id // User team's conference honors
  );

  if (loading) return <div className="p-8">Loading award winners...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Awards & Honors</h1>
            <p className="text-gray-600 text-lg">View national, weekly, and all-conference awards for each season</p>
          </div>
        </div>
        <div className="bg-white/80 rounded-xl shadow border border-gray-200 p-0">
          <Tabs defaultValue="season" className="w-full">
            <TabsList className="flex gap-2 bg-gray-50 rounded-t-xl px-2 py-1">
              <TabsTrigger value="season" className="text-lg px-6 py-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow">National Season Awards</TabsTrigger>
              <TabsTrigger value="weekly" className="text-lg px-6 py-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow">Honors</TabsTrigger>
            </TabsList>
            <TabsContent value="season" className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allAwards.length === 0 ? (
                  <div className="text-gray-500">No awards available for this season.</div>
                ) : (
                  allAwards.map((award, idx) => (
                    <Card key={idx} className={`hover:shadow-xl border-2 transition-all duration-300 overflow-hidden ${
                      award.has_winner 
                        ? 'border-yellow-100/60 bg-white/80 backdrop-blur-sm' 
                        : 'border-gray-200/60 bg-gray-50/80 backdrop-blur-sm'
                    }`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <Trophy className={`h-6 w-6 drop-shadow ${
                              award.has_winner ? 'text-yellow-500' : 'text-gray-400'
                            }`} />
                            <span className="font-bold text-gray-900">{award.award_name}</span>
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={`shadow ${
                              award.has_winner 
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                            }`}>
                              {award.has_winner ? 'National' : 'TBD'}
                            </Badge>
                            <button onClick={() => openEdit(award)} className="ml-2 p-1 rounded hover:bg-yellow-50 transition" title="Edit Award Winner">
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center gap-4 pt-0 pb-4">
                        {award.has_winner ? (
                          <>
                            <Avatar>
                              <AvatarImage src={award.team_logo_url || "/placeholder-logo.png"} alt={award.team_name} />
                              <AvatarFallback>{award.team_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-lg text-gray-900">{award.player_name}</span>
                              <span className="text-gray-600 text-sm flex items-center gap-1">
                                <span className="font-medium">{award.team_name}</span>
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Avatar className="bg-gray-200">
                              <AvatarFallback className="text-gray-500">?</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-lg text-gray-500">To Be Determined</span>
                              <span className="text-gray-400 text-sm">Winner not yet declared</span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
              <Dialog open={editModal.open} onOpenChange={closeEdit}>
                <DialogContent className="max-w-md w-full p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
                  <DialogHeader>
                    <DialogTitle>Edit Award Winner</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
                      <Input
                        placeholder="Search player name..."
                        value={playerSearch}
                        onChange={e => {
                          setPlayerSearch(e.target.value);
                          setUserSelectedPlayer(false);
                        }}
                        className="flex-1 min-w-0"
                      />
                      <Popover open={teamPopoverOpen} onOpenChange={setTeamPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={teamPopoverOpen}
                            className="w-full md:w-56 justify-between"
                          >
                            {playerTeamFilter == null
                              ? "All Teams"
                              : allTeams.find(t => t.team_id === playerTeamFilter)?.name || allTeams.find(t => t.team_id === playerTeamFilter)?.team_name || "Select team..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0">
                          <Command>
                            <CommandInput placeholder="Search team..." />
                            <CommandList>
                              <CommandEmpty>No team found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  key="all"
                                  value="all"
                                  onSelect={() => {
                                    setPlayerTeamFilter(null);
                                    setTeamPopoverOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", playerTeamFilter == null ? "opacity-100" : "opacity-0")} />
                                  All Teams
                                </CommandItem>
                                {allTeams.map(t => (
                                  <CommandItem
                                    key={t.team_id}
                                    value={t.name || t.team_name}
                                    onSelect={() => {
                                      setPlayerTeamFilter(t.team_id);
                                      setTeamPopoverOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", playerTeamFilter === t.team_id ? "opacity-100" : "opacity-0")} />
                                    {t.name || t.team_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Select
                        open={playerSelectOpen}
                        onOpenChange={setPlayerSelectOpen}
                        value={editPlayerId?.toString() || ""}
                        onValueChange={v => {
                          if (v === "__add_new__") {
                            setShowAddPlayer(true)
                            setPlayerSelectOpen(false)
                            return
                          }
                          setEditPlayerId(Number(v))
                          setUserSelectedPlayer(true);
                          // When player changes, update editTeamId to match the player's team
                          const selected = allPlayers.find(p => p.player_id === Number(v))
                          if (selected) setEditTeamId(selected.team_id)
                        }}
                      >
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPlayers.map(p => (
                            <SelectItem key={p.player_id} value={p.player_id.toString()}>{p.name} ({p.team_name})</SelectItem>
                          ))}
                          <SelectSeparator />
                          <SelectItem value="__add_new__" onClick={e => {
                            e.preventDefault();
                            setShowAddPlayer(true)
                            setPlayerSelectOpen(false)
                          }}>
                            + Add new player
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {showAddPlayer && (
                      <form className="mt-3 p-3 bg-gray-50 rounded-lg border flex flex-col gap-2" onSubmit={handleAddPlayer}>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Name"
                            value={newPlayer.name}
                            onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                            className="flex-1"
                            required
                            autoFocus
                          />
                          <Select value={newPlayer.position} onValueChange={v => setNewPlayer({ ...newPlayer, position: v })}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QB">QB</SelectItem>
                              <SelectItem value="RB">RB</SelectItem>
                              <SelectItem value="FB">FB</SelectItem>
                              <SelectItem value="WR">WR</SelectItem>
                              <SelectItem value="TE">TE</SelectItem>
                              <SelectItem value="LT">LT</SelectItem>
                              <SelectItem value="LG">LG</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="RG">RG</SelectItem>
                              <SelectItem value="RT">RT</SelectItem>
                              <SelectItem value="LE">LE</SelectItem>
                              <SelectItem value="RE">RE</SelectItem>
                              <SelectItem value="DT">DT</SelectItem>
                              <SelectItem value="LOLB">LOLB</SelectItem>
                              <SelectItem value="MLB">MLB</SelectItem>
                              <SelectItem value="ROLB">ROLB</SelectItem>
                              <SelectItem value="CB">CB</SelectItem>
                              <SelectItem value="FS">FS</SelectItem>
                              <SelectItem value="SS">SS</SelectItem>
                              <SelectItem value="K">K</SelectItem>
                              <SelectItem value="P">P</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Select value={newPlayer.team_id?.toString() || ""} onValueChange={v => setNewPlayer({ ...newPlayer, team_id: Number(v) })}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent>
                              {allTeams.map(t => (
                                <SelectItem key={t.team_id} value={t.team_id.toString()}>{t.name || t.team_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="OVR"
                            value={newPlayer.ovr_rating}
                            onChange={e => setNewPlayer({ ...newPlayer, ovr_rating: Number(e.target.value) })}
                            className="w-20"
                            min="1"
                            max="99"
                            required
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700" onClick={() => setShowAddPlayer(false)} disabled={addingPlayer}>Cancel</button>
                          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white" disabled={addingPlayer}>{addingPlayer ? "Adding..." : "Add Player"}</button>
                        </div>
                        {(!newPlayer.name || !newPlayer.position || !newPlayer.team_id) && (
                          <div className="text-red-500 text-sm mt-2">All fields are required.</div>
                        )}
                      </form>
                    )}
                    <DialogFooter className="mt-4">
                      <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full md:w-auto md:ml-auto">
                        {savingEdit ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>
            <TabsContent value="weekly" className="p-6">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setAddHonorOpen(true)} variant="default">+ Add Honor</Button>
              </div>
              <Dialog open={addHonorOpen} onOpenChange={setAddHonorOpen}>
                <DialogContent className="max-w-lg w-full">
                  <DialogHeader>
                    <DialogTitle>Add Honor</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddHonor} className="space-y-4">
                    <div>
                      <label className="block mb-1 font-medium">Player</label>
                      <Select value={newHonor.player_id} onValueChange={v => setNewHonor(h => ({ ...h, player_id: v }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {userTeamPlayers.map(p => (
                            <SelectItem key={p.player_id} value={p.player_id.toString()}>{p.name} ({p.team_name})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block mb-1 font-medium">Honor Type</label>
                      <Select value={newHonor.honor_id} onValueChange={v => {
                        setNewHonor(h => ({ ...h, honor_id: v }));
                        checkHonorWeekRequirement(v);
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select honor type" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredHonorTypes.map(honor => {
                            const isWeeklyHonor = honor.name.includes("Player of the Week");
                            return (
                              <SelectItem key={honor.honor_id} value={honor.honor_id.toString()}>
                                {honor.name}
                                {honor.side && ` (${honor.side})`}
                                {honor.conference_name && ` - ${honor.conference_name}`}
                                {isWeeklyHonor && " (Weekly)"}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedHonorRequiresWeek && (
                      <div>
                        <label className="block mb-1 font-medium">Week *</label>
                        <Input
                          type="number"
                          placeholder="Week number (required for Player of the Week honors)"
                          value={newHonor.week}
                          onChange={e => setNewHonor(h => ({ ...h, week: e.target.value }))}
                          min="1"
                          max="15"
                          required
                        />
                      </div>
                    )}
                    {addHonorError && <div className="text-red-500 text-sm">{addHonorError}</div>}
                    <DialogFooter>
                      <Button type="submit" disabled={addingHonor}>{addingHonor ? 'Adding...' : 'Add Honor'}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {honorsLoading ? (
                <div className="text-gray-500 text-lg p-8">Loading honors...</div>
              ) : honorsError ? (
                <div className="text-red-500 text-lg p-8">{honorsError}</div>
              ) : seasonHonors.length === 0 ? (
                <div className="text-gray-500 text-lg p-8 bg-white/70 rounded-xl border border-gray-200 shadow-inner">
                  No honors for this season.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded-xl border border-gray-200 shadow-inner">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">Player</th>
                        <th className="px-4 py-2 text-left">Team</th>
                        <th className="px-4 py-2 text-left">Honor</th>
                        <th className="px-4 py-2 text-left">Side</th>
                        <th className="px-4 py-2 text-left">Conference</th>
                        <th className="px-4 py-2 text-left">Week</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonHonors.map(h => (
                        <tr key={h.honor_winner_id} className="border-t">
                          <td className="px-4 py-2">{h.player_name}</td>
                          <td className="px-4 py-2">{h.team_name}</td>
                          <td className="px-4 py-2">{h.honor_name}</td>
                          <td className="px-4 py-2">{h.honor_side || '-'}</td>
                          <td className="px-4 py-2">{h.honor_conference_id || '-'}</td>
                          <td className="px-4 py-2">{h.week || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
