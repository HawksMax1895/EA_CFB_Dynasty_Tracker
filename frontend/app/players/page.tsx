"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, TrendingUp, User, Target, Shield, ArrowRight, Zap, Trash2, ChevronsUpDown, Check } from "lucide-react"
import React, { useEffect, useState, useRef } from "react"
import { setPlayerRedshirt, fetchPlayersBySeason, API_BASE_URL, deletePlayer } from "@/lib/api"
import { useSeason } from "@/context/SeasonContext";
import { AddPlayerModal } from "@/components/AddPlayerModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

const POSITION_OPTIONS = [
  "QB", "RB", "FB", "WR", "TE", "RT", "RG", "C", "LG", "LT", "LEDG", "REDG", "DT", "SAM", "MIKE", "WILL", "CB", "FS", "SS", "K", "P"
];

const YEAR_OPTIONS = [
  { value: "FR", label: "Freshman" },
  { value: "SO", label: "Sophomore" },
  { value: "JR", label: "Junior" },
  { value: "SR", label: "Senior" },
];

const devTraits = [
  { value: "Normal", label: "Normal" },
  { value: "Impact", label: "Impact" },
  { value: "Star", label: "Star" },
  { value: "Elite", label: "Elite" },
];
type PositionStyle = {
  bg: string;
  icon: string;
  color: string;
  border: string;
};

export const getPositionStyle = (position: string): PositionStyle => {
  const shared: Record<string, PositionStyle> = {
    OL:  { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    EDGE: { bg: "from-red-500 to-red-600", icon: "🦾", color: "text-red-600", border: "border-red-200" },
    DL:  { bg: "from-rose-500 to-rose-600", icon: "⚔️", color: "text-rose-600", border: "border-rose-200" },
    LB:  { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-600", border: "border-yellow-200" },
    DB:  { bg: "from-cyan-500 to-cyan-600", icon: "🛡️", color: "text-cyan-600", border: "border-cyan-200" },
    K:   { bg: "from-gray-500 to-gray-600", icon: "🦵", color: "text-gray-600", border: "border-gray-200" },
  };

  const styles: Record<string, PositionStyle> = {
    // Offense
    QB: { bg: "from-blue-500 to-blue-600", icon: "🎯", color: "text-blue-600", border: "border-blue-200" },
    RB: { bg: "from-green-500 to-green-600", icon: "🏃", color: "text-green-600", border: "border-green-200" },
    FB: { bg: "from-emerald-500 to-emerald-600", icon: "🛡️", color: "text-emerald-600", border: "border-emerald-200" },
    WR: { bg: "from-purple-500 to-purple-600", icon: "⚡", color: "text-purple-600", border: "border-purple-200" },
    TE: { bg: "from-indigo-500 to-indigo-600", icon: "✋", color: "text-indigo-600", border: "border-indigo-200" },

    // Offensive Line
    ...["RT", "RG", "C", "LG", "LT"].reduce((acc, pos) => ({ ...acc, [pos]: shared.OL }), {}),

    // Defensive Line / Edge
    ...["LEDG", "REDG"].reduce((acc, pos) => ({ ...acc, [pos]: shared.EDGE }), {}),
    DT: shared.DL,

    // Linebackers
    ...["SAM", "MIKE", "WILL"].reduce((acc, pos) => ({ ...acc, [pos]: shared.LB }), {}),

    // Defensive Backs (more differentiation)
    CB:  { bg: "from-teal-500 to-teal-600", icon: "🦊", color: "text-teal-600", border: "border-teal-200" },
    FS:  { bg: "from-cyan-500 to-cyan-600", icon: "👁️", color: "text-cyan-600", border: "border-cyan-200" },
    SS:  { bg: "from-sky-500 to-sky-600", icon: "🛡️", color: "text-sky-600", border: "border-sky-200" },

    // Special Teams
    K: shared.K,
    P: shared.K,
  };

  return styles[position] || { bg: "from-gray-500 to-gray-600", icon: "👤", color: "text-gray-600", border: "border-gray-200" };
};


// Get rating color based on overall rating
const getRatingColor = (rating: number) => {
  if (rating >= 90) return "text-purple-600";
  if (rating >= 80) return "text-blue-600";
  if (rating >= 70) return "text-green-600";
  if (rating >= 60) return "text-yellow-600";
  return "text-gray-600";
};

// Add this helper for year badge
const getYearStyle = (year: string) => {
  switch (year) {
    case "FR": return { color: "bg-blue-600 text-white", label: "Freshman" };
    case "SO": return { color: "bg-indigo-600 text-white", label: "Sophomore" };
    case "JR": return { color: "bg-purple-600 text-white", label: "Junior" };
    case "SR": return { color: "bg-red-600 text-white", label: "Senior" };
    default: return { color: "bg-gray-500 text-white", label: year };
  }
};

const getDevStyle = (trait: string) => {
  switch (trait) {
    case "Impact":
      return "bg-yellow-500 text-black font-semibold";
    case "Star":
      return "bg-sky-500 text-white font-bold";
    case "Elite":
      return "bg-fuchsia-600 text-white font-extrabold tracking-wide shadow-md";
    default:
      return "bg-gray-600 text-white";
  }
};

const getDevIcon = (trait: string) => {
  switch (trait) {
    case "Impact": return "🔥";
    case "Star": return "⭐";
    case "Elite": return "🦅";
    default: return null;
  }
};

const SORT_OPTIONS = [
  { value: "ovr_desc", label: "OVR (High to Low)" },
  { value: "ovr_asc", label: "OVR (Low to High)" },
  { value: "year_asc", label: "Year (Freshman-Senior)" },
  { value: "year_desc", label: "Year (Senior-Freshman)" },
  { value: "dev_asc", label: "Dev Trait (Normal-Elite)" },
  { value: "dev_desc", label: "Dev Trait (Elite-Normal)" },
];

const YEAR_ORDER = { FR: 1, SO: 2, JR: 3, SR: 4 };
const DEV_ORDER = { Normal: 1, Impact: 2, Star: 3, Elite: 4 };

export default function PlayersPage() {
  const { selectedSeason, userTeam } = useSeason();
  const teamId = userTeam?.team_id;
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [redshirting, setRedshirting] = useState<number | null>(null)
  const [search, setSearch] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedDevTraits, setSelectedDevTraits] = useState<string[]>([]);
  const router = useRouter();
  const [editingOvr, setEditingOvr] = useState<{ [playerId: number]: boolean }>({});
  const [ovrInputs, setOvrInputs] = useState<{ [playerId: number]: number | undefined }>({});
  const inputRefs = useRef<{ [playerId: number]: HTMLInputElement | null }>({});
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<string>("ovr_desc");

  useEffect(() => {
    if (!selectedSeason || !teamId) return;
    setLoading(true)
    fetchPlayersBySeason(selectedSeason, teamId)
      .then((data) => {
        setPlayers(data)
        setLoading(false)
      })
  }, [teamId, selectedSeason])

  const handlePlayerAdded = async () => {
    if (teamId && selectedSeason) {
      const data = await fetchPlayersBySeason(selectedSeason, teamId)
      setPlayers(data)
    }
  }

  const handlePlayerUpdated = async () => {
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

  // Filter players by search and multi-select position, year, dev trait
  let filteredPlayers = players.filter(player => {
    const matchesName = player.name.toLowerCase().includes(search.toLowerCase());
    const matchesPosition =
      selectedPositions.length === 0 || selectedPositions.includes(player.position);
    const matchesYear =
      selectedYears.length === 0 || (player.current_year && selectedYears.includes(player.current_year));
    const matchesDevTrait =
      selectedDevTraits.length === 0 || (player.dev_trait && selectedDevTraits.includes(player.dev_trait));
    return matchesName && matchesPosition && matchesYear && matchesDevTrait;
  });

  // Sort logic
  filteredPlayers = [...filteredPlayers].sort((a, b) => {
    const aYear = (a.current_year && ["FR", "SO", "JR", "SR"].includes(a.current_year)) ? a.current_year as keyof typeof YEAR_ORDER : "FR";
    const bYear = (b.current_year && ["FR", "SO", "JR", "SR"].includes(b.current_year)) ? b.current_year as keyof typeof YEAR_ORDER : "FR";
    const aDev = (a.dev_trait && ["Normal", "Impact", "Star", "Elite"].includes(a.dev_trait)) ? a.dev_trait as keyof typeof DEV_ORDER : "Normal";
    const bDev = (b.dev_trait && ["Normal", "Impact", "Star", "Elite"].includes(b.dev_trait)) ? b.dev_trait as keyof typeof DEV_ORDER : "Normal";
    switch (sortOption) {
      case "ovr_asc":
        return (a.ovr_rating ?? 0) - (b.ovr_rating ?? 0);
      case "ovr_desc":
        return (b.ovr_rating ?? 0) - (a.ovr_rating ?? 0);
      case "year_asc":
        return YEAR_ORDER[aYear] - YEAR_ORDER[bYear];
      case "year_desc":
        return YEAR_ORDER[bYear] - YEAR_ORDER[aYear];
      case "dev_asc":
        return DEV_ORDER[aDev] - DEV_ORDER[bDev];
      case "dev_desc":
        return DEV_ORDER[bDev] - DEV_ORDER[aDev];
      default:
        return 0;
    }
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

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingPlayer(null);
    setEditModalOpen(false);
  };

  const handleDeletePlayer = async (playerId: number, playerName: string) => {
    if (!confirm(`Are you sure you want to delete ${playerName}? This action cannot be undone.`)) {
      return;
    }
    
    setDeletingPlayer(playerId);
    try {
      await deletePlayer(playerId);
      if (teamId && selectedSeason) {
        const data = await fetchPlayersBySeason(selectedSeason, teamId);
        setPlayers(data);
      }
    } catch (err) {
      alert('Failed to delete player');
    } finally {
      setDeletingPlayer(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading players...</p>
      </div>
    </div>
  )

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roster</h1>
            <p className="text-muted-foreground">
              Manage your team's roster for the {selectedSeason} season.
            </p>
          </div>
          <AddPlayerModal onPlayerAdded={handlePlayerAdded} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {/* Position Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Shield className="mr-2 h-4 w-4" />
                {selectedPositions.length === 0 ? "All Positions" : `${selectedPositions.length} Selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-80 p-0" align="end">
              <div className="p-4">
                <h4 className="font-medium mb-2">Filter by Position</h4>
                <div className="grid grid-cols-2 gap-2">
                  {POSITION_OPTIONS.map((position) => (
                    <div key={position} className="flex items-center space-x-2">
                      <Checkbox
                        id={position}
                        checked={selectedPositions.includes(position)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPositions([...selectedPositions, position]);
                          } else {
                            setSelectedPositions(selectedPositions.filter(p => p !== position));
                          }
                        }}
                      />
                      <label htmlFor={position} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {position}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Year Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <User className="mr-2 h-4 w-4" />
                {selectedYears.length === 0 ? "All Years" : `${selectedYears.length} Selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-60 p-0" align="end">
              <div className="p-4">
                <h4 className="font-medium mb-2">Filter by Year</h4>
                <div className="grid grid-cols-2 gap-2">
                  {YEAR_OPTIONS.map((year) => (
                    <div key={year.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={year.value}
                        checked={selectedYears.includes(year.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedYears([...selectedYears, year.value]);
                          } else {
                            setSelectedYears(selectedYears.filter(y => y !== year.value));
                          }
                        }}
                      />
                      <label htmlFor={year.value} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {year.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Dev Trait Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Zap className="mr-2 h-4 w-4" />
                {selectedDevTraits.length === 0 ? "All Dev Traits" : `${selectedDevTraits.length} Selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-60 p-0" align="end">
              <div className="p-4">
                <h4 className="font-medium mb-2">Filter by Dev Trait</h4>
                <div className="grid grid-cols-2 gap-2">
                  {devTraits.map((trait) => (
                    <div key={trait.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={trait.value}
                        checked={selectedDevTraits.includes(trait.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDevTraits([...selectedDevTraits, trait.value]);
                          } else {
                            setSelectedDevTraits(selectedDevTraits.filter(t => t !== trait.value));
                          }
                        }}
                      />
                      <label htmlFor={trait.value} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {trait.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Sort Dropdown (searchable popover) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full sm:w-56 justify-between">
                {SORT_OPTIONS.find(opt => opt.value === sortOption)?.label || "Sort by..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search sort..." />
                <CommandList>
                  <CommandEmpty>No sort found.</CommandEmpty>
                  <CommandGroup>
                    {SORT_OPTIONS.map(opt => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => setSortOption(opt.value)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", sortOption === opt.value ? "opacity-100" : "opacity-0")} />
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredPlayers.map((player) => {
            const posStyle = getPositionStyle(player.position);
            const ratingColor = getRatingColor(player.ovr_rating || 0);
            return (
              <Card className="rounded-xl border border-border bg-card/80 shadow-md flex flex-col justify-between h-full" key={player.player_id}>
                <div className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg {posStyle.color}">{posStyle.icon}</span>
                        <span className="font-bold text-lg truncate">{player.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={`${posStyle.color} ${posStyle.border}`}>{player.position}</Badge>
                        {/* Year badge with tooltip */}
                        {(() => {
                          const yearStyle = getYearStyle(player.current_year);
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className={yearStyle.color}>{player.current_year}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>{yearStyle.label}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                        {/* Dev trait badge with icon */}
                        {player.dev_trait && (
                          <Badge variant="secondary" className={getDevStyle(player.dev_trait)}>
                            {getDevIcon(player.dev_trait) && <span className="mr-1">{getDevIcon(player.dev_trait)}</span>}
                            {player.dev_trait}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-x-3 mb-1 mt-1">
                        {player.height && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5"><User className="h-3 w-3" />{player.height}</span>
                        )}
                        {player.weight && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5 min-w-[70px] whitespace-nowrap"><Target className="h-3 w-3" />{player.weight} lbs</span>
                        )}
                        {player.state && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5"><Shield className="h-3 w-3" />{player.state}</span>
                        )}
                        {player.recruit_stars && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5"><Star className="h-3 w-3 text-yellow-400" />{player.recruit_stars}★</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end min-w-[70px] ml-2">
                      <TrendingUp className="h-5 w-5 text-primary mb-1" />
                      <span className={`text-2xl font-bold ${ratingColor}`}>{player.ovr_rating !== undefined && player.ovr_rating !== null ? player.ovr_rating : '-'}</span>
                      <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">OVR</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border bg-muted/40 px-4 py-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/players/${player.player_id}`)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={redshirting === player.player_id || (player.has_ever_redshirted && !player.redshirted)}
                      onClick={() => {
                        if (!player.has_ever_redshirted || player.redshirted) handleRedshirt(player.player_id, player.redshirted);
                      }}
                      variant={
                        player.has_ever_redshirted && !player.redshirted
                          ? 'outline'
                          : player.redshirted
                            ? 'default'
                            : 'outline'
                      }
                    >
                      {redshirting === player.player_id
                        ? 'Updating...'
                        : player.has_ever_redshirted && !player.redshirted
                          ? 'Redshirt Used'
                          : player.redshirted
                            ? 'Redshirted'
                            : 'Redshirt'}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEditPlayer(player)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeletePlayer(player.player_id, player.name)}
                      disabled={deletingPlayer === player.player_id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deletingPlayer === player.player_id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      
      {editingPlayer && (
        <AddPlayerModal
          onPlayerAdded={handlePlayerAdded}
          editingPlayer={editingPlayer}
          onPlayerUpdated={() => {
            handlePlayerUpdated();
            handleCloseEditModal();
          }}
          open={editModalOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseEditModal();
          }}
        />
      )}
    </>
  )
}
