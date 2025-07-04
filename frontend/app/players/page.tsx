"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, TrendingUp, Award, User, Target, Zap, Shield, Trophy, ArrowRight } from "lucide-react"
import React, { useEffect, useState, useRef } from "react"
import { setPlayerRedshirt, fetchPlayersBySeason, API_BASE_URL, updatePlayerProfile } from "@/lib/api"
import { SeasonSelector } from "@/components/SeasonSelector";
import { useSeason } from "@/context/SeasonContext";
import { AddPlayerModal } from "@/components/AddPlayerModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const POSITION_OPTIONS = [
  "QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"
];

const devTraits = [
  { value: "Normal", label: "Normal" },
  { value: "Impact", label: "Impact" },
  { value: "Star", label: "Star" },
  { value: "Elite", label: "Elite" },
];

// Position-specific styling
const getPositionStyle = (position: string) => {
  const styles = {
    QB: { bg: "from-blue-500 to-blue-600", icon: "🎯", color: "text-blue-600" },
    RB: { bg: "from-green-500 to-green-600", icon: "🏃", color: "text-green-600" },
    WR: { bg: "from-purple-500 to-purple-600", icon: "⚡", color: "text-purple-600" },
    TE: { bg: "from-indigo-500 to-indigo-600", icon: "🎯", color: "text-indigo-600" },
    FB: { bg: "from-emerald-500 to-emerald-600", icon: "🛡️", color: "text-emerald-600" },
    LT: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600" },
    LG: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600" },
    C: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600" },
    RG: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600" },
    RT: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600" },
    LE: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600" },
    RE: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600" },
    DT: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600" },
    LOLB: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600" },
    MLB: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600" },
    ROLB: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600" },
    CB: { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600" },
    FS: { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600" },
    SS: { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600" },
    K: { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600" },
    P: { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600" }
  };
  return styles[position as keyof typeof styles] || { bg: "from-gray-500 to-gray-600", icon: "👤", color: "text-gray-600" };
};

// Get rating color based on overall rating
const getRatingColor = (rating: number) => {
  if (rating >= 90) return "text-purple-600";
  if (rating >= 80) return "text-blue-600";
  if (rating >= 70) return "text-green-600";
  if (rating >= 60) return "text-yellow-600";
  return "text-gray-600";
};

export default function PlayersPage() {
  const { selectedSeason, userTeam } = useSeason();
  const teamId = userTeam?.team_id;
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redshirting, setRedshirting] = useState<number | null>(null)
  const [search, setSearch] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const router = useRouter();
  const [editingOvr, setEditingOvr] = useState<{ [playerId: number]: boolean }>({});
  const [ovrInputs, setOvrInputs] = useState<{ [playerId: number]: number | undefined }>({});
  const inputRefs = useRef<{ [playerId: number]: HTMLInputElement | null }>({});
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!selectedSeason || !teamId) return;
    setLoading(true)
    fetchPlayersBySeason(selectedSeason, teamId)
      .then((data) => {
        setPlayers(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [teamId, selectedSeason])

  const handlePlayerAdded = async () => {
    if (teamId && selectedSeason) {
      const data = await fetchPlayersBySeason(selectedSeason, teamId)
      setPlayers(data)
    }
  }

  const handleRedshirt = async (playerId: number, current: boolean) => {
    setRedshirting(playerId)
    try {
      if (!selectedSeason) {
        alert("No season selected")
        return
      }
      await setPlayerRedshirt(playerId, !current, selectedSeason)
      // Refetch players after redshirt change
      if (teamId && selectedSeason) {
        const data = await fetchPlayersBySeason(selectedSeason, teamId)
        setPlayers(data)
      }
    } catch (err) {
      alert("Failed to update redshirt status")
    } finally {
      setRedshirting(null)
    }
  }

  // Filter players by search and multi-select position
  const filteredPlayers = players.filter(player => {
    const matchesName = player.name.toLowerCase().includes(search.toLowerCase());
    const matchesPosition =
      selectedPositions.length === 0 || selectedPositions.includes(player.position);
    return matchesName && matchesPosition;
  });

  // PATCH OVR
  const handleOvrEdit = (playerId: number, ovr: number | undefined) => {
    setEditingOvr((prev) => ({ ...prev, [playerId]: true }));
    setOvrInputs((prev) => ({ ...prev, [playerId]: ovr }));
    setTimeout(() => {
      inputRefs.current[playerId]?.focus();
    }, 0);
  };

  const handleOvrChange = (playerId: number, value: string) => {
    const num = value === "" ? undefined : parseInt(value, 10);
    setOvrInputs((prev) => ({ ...prev, [playerId]: num }));
  };

  const saveOvr = async (playerId: number, seasonId: number, teamId: number) => {
    const newOvr = ovrInputs[playerId];
    if (typeof newOvr === "number" && !isNaN(newOvr)) {
      await fetch(`${API_BASE_URL}/players/${playerId}/seasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season_id: seasonId, team_id: teamId, ovr_rating: newOvr }),
      });
      // Refetch players
      if (teamId && seasonId) {
        const data = await fetchPlayersBySeason(seasonId, teamId);
        setPlayers(data);
      }
    }
    setEditingOvr((prev) => ({ ...prev, [playerId]: false }));
  };

  const handleEditPlayer = (player: any) => {
    setEditingPlayer(player.player_id);
    setEditFields({
      height: player.height || '',
      weight: player.weight || '',
      dev_trait: player.dev_trait || '',
    });
  };

  const handleEditFieldChange = (field: string, value: string) => {
    setEditFields((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditHeightChange = (type: 'feet' | 'inches', value: string) => {
    const currentHeight = editFields.height || '';
    const match = currentHeight.match(/(\d+)'(\d+)?/);
    let feet = match ? match[1] : '';
    let inches = match ? match[2] : '';
    if (type === 'feet') feet = value.replace(/\D/g, '');
    if (type === 'inches') inches = value.replace(/\D/g, '');
    let heightString = '';
    if (feet) heightString += `${feet}'`;
    if (inches) heightString += `${inches}`;
    if (feet && inches !== '') heightString += '"';
    setEditFields((prev: any) => ({ ...prev, height: heightString }));
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setEditFields({});
  };

  const handleSaveEdit = async (playerId: number) => {
    setSavingEdit(true);
    try {
      await updatePlayerProfile(playerId, editFields);
      if (teamId && selectedSeason) {
        const data = await fetchPlayersBySeason(selectedSeason, teamId);
        setPlayers(data);
      }
      setEditingPlayer(null);
      setEditFields({});
    } catch (err) {
      alert('Failed to update player');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading players...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Current Roster</h1>
            <p className="text-gray-600">View current season players and their performance</p>
            <p className="text-sm text-muted-foreground mt-1">
              💡 Recruits and transfers from the previous season will automatically join the roster when you progress to the next season.
            </p>
          </div>
          {/* <div>
            <SeasonSelector />
          </div> */}
        </div>

        {/* Add Player Modal */}
        <div className="mb-6">
          <AddPlayerModal onPlayerAdded={handlePlayerAdded} />
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players..."
                    className="pl-10"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-48 justify-between">
                    {selectedPositions.length === 0 || selectedPositions.length === POSITION_OPTIONS.length
                      ? "All Positions"
                      : selectedPositions.length <= 3
                        ? selectedPositions.join(", ")
                        : `${selectedPositions.length} positions selected`}
                    <Check className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Filter by Position</span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => setSelectedPositions(POSITION_OPTIONS)}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="px-2 py-1 text-xs"
                      onClick={() => setSelectedPositions([])}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="border-b my-2" />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {POSITION_OPTIONS.map((pos) => (
                      <div key={pos} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent transition-colors">
                        <Checkbox
                          id={`pos-${pos}`}
                          checked={selectedPositions.includes(pos)}
                          onCheckedChange={(checked) => {
                            setSelectedPositions((prev) =>
                              checked
                                ? [...prev, pos]
                                : prev.filter((p) => p !== pos)
                            );
                          }}
                        />
                        <label htmlFor={`pos-${pos}`} className="text-sm cursor-pointer select-none w-10">{pos}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Player Cards */}
        <div className="grid gap-6">
          {filteredPlayers.map((player, index) => {
            const positionStyle = getPositionStyle(player.position);
            const ratingColor = getRatingColor(player.ovr_rating || 0);
            
            return (
              <Card key={player.player_id || index} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${positionStyle.bg}`}></div>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{positionStyle.icon}</span>
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">{player.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`${positionStyle.color} border-current`}>
                              {player.position}
                            </Badge>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                              {player.current_year}{player.redshirted ? ' (RS)' : ''}
                            </Badge>
                            {player.dev_trait && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {player.dev_trait}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Player Details */}
                      {editingPlayer === player.player_id ? (
                        <div className="flex flex-wrap gap-4 items-center justify-center bg-gray-50 rounded-md p-4 my-2">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Height:</span>
                            <Input className="w-16 h-6 text-sm" value={(editFields.height.match(/(\d+)'/)?.[1] || '')} onChange={e => handleEditHeightChange('feet', e.target.value)} placeholder="Feet" type="number" min="4" max="7" />
                            <span className="ml-1 mr-2">ft</span>
                            <Input className="w-16 h-6 text-sm" value={(editFields.height.match(/(\d+)'(\d+)?/)?.[2] || '')} onChange={e => handleEditHeightChange('inches', e.target.value)} placeholder="Inches" type="number" min="0" max="11" />
                            <span className="ml-1">in</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>Weight:</span>
                            <Input className="w-20 h-6 text-sm" value={editFields.weight} onChange={e => handleEditFieldChange('weight', e.target.value)} placeholder="Weight" type="number" />
                            <span>lbs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span>Dev:</span>
                            <Select value={editFields.dev_trait} onValueChange={v => handleEditFieldChange('dev_trait', v)}>
                              <SelectTrigger className="w-24 h-7">
                                <SelectValue placeholder="Dev Trait" />
                              </SelectTrigger>
                              <SelectContent>
                                {devTraits.map(trait => (
                                  <SelectItem key={trait.value} value={trait.value}>{trait.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(player.player_id)} disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm text-gray-600">
                          {player.height && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{player.height}</span>
                            </div>
                          )}
                          {player.weight && (
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span>{player.weight} lbs</span>
                            </div>
                          )}
                          {player.recruit_stars && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>{player.recruit_stars}★</span>
                            </div>
                          )}
                          {player.state && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              <span>{player.state}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                          {editingOvr[player.player_id] ? (
                            <input
                              ref={el => (inputRefs.current[player.player_id] = el)}
                              type="number"
                              min={0}
                              max={99}
                              className="text-3xl font-bold text-blue-700 bg-white border border-blue-300 rounded px-2 w-16 text-right focus:outline-none focus:ring"
                              value={ovrInputs[player.player_id] ?? player.ovr_rating ?? ""}
                              onChange={e => handleOvrChange(player.player_id, e.target.value)}
                              onBlur={() => saveOvr(player.player_id, selectedSeason, teamId)}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  saveOvr(player.player_id, selectedSeason, teamId);
                                }
                              }}
                            />
                          ) : (
                            <span
                              className={`text-3xl font-bold ${ratingColor} cursor-pointer hover:underline`}
                              title="Click to edit OVR"
                              onClick={() => handleOvrEdit(player.player_id, player.ovr_rating)}
                            >
                              {player.ovr_rating !== undefined && player.ovr_rating !== null ? player.ovr_rating : "-"}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">OVR</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 group hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      onClick={() => router.push(`/players/${player.player_id}`)}
                    >
                      <User className="h-4 w-4 mr-2 group-hover:text-blue-600" />
                      View Profile
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                      variant={player.redshirted ? "secondary" : "outline"}
                      disabled={redshirting === player.player_id || player.has_ever_redshirted}
                      onClick={() => handleRedshirt(player.player_id, player.redshirted)}
                      className="hover:bg-orange-50 hover:border-orange-300 h-10"
                      size="sm"
                    >
                      {redshirting === player.player_id
                        ? "Updating..."
                        : player.has_ever_redshirted
                        ? "Redshirt Used"
                        : player.redshirted
                        ? "Remove Redshirt"
                        : "Redshirt"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-10" onClick={() => handleEditPlayer(player)}>
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  )
}
