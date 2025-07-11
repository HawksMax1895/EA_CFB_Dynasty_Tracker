"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, TrendingUp, User, Target, Shield, ArrowRight, Zap, Trash2 } from "lucide-react"
import React, { useEffect, useState, useRef } from "react"
import { setPlayerRedshirt, fetchPlayersBySeason, API_BASE_URL, deletePlayer } from "@/lib/api"
import { useSeason } from "@/context/SeasonContext";
import { AddPlayerModal } from "@/components/AddPlayerModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const POSITION_OPTIONS = [
  "QB", "RB", "FB", "WR", "TE", "RT", "RG", "C", "LG", "LT", "LEDG", "REDG", "DT", "SAM", "MIKE", "WILL", "CB", "FS", "SS", "K", "P"
];

const devTraits = [
  { value: "Normal", label: "Normal" },
  { value: "Impact", label: "Impact" },
  { value: "Star", label: "Star" },
  { value: "Elite", label: "Elite" },
];

// Position-specific styling (copied from player profile page)
const getPositionStyle = (position: string) => {
  const styles: Record<string, { bg: string; icon: string; color: string; border: string }> = {
    QB:    { bg: "from-blue-500 to-blue-600", icon: "🎯", color: "text-blue-600", border: "border-blue-200" },
    RB:    { bg: "from-green-500 to-green-600", icon: "🏃", color: "text-green-600", border: "border-green-200" },
    FB:    { bg: "from-emerald-500 to-emerald-600", icon: "🛡️", color: "text-emerald-600", border: "border-emerald-200" },
    WR:    { bg: "from-purple-500 to-purple-600", icon: "⚡", color: "text-purple-600", border: "border-purple-200" },
    TE:    { bg: "from-indigo-500 to-indigo-600", icon: "🎯", color: "text-indigo-600", border: "border-indigo-200" },
    RT:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    RG:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    C:     { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LG:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LT:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LEDG:  { bg: "from-red-500 to-red-600", icon: "🦾", color: "text-red-600", border: "border-red-200" },
    REDG:  { bg: "from-red-500 to-red-600", icon: "🦾", color: "text-red-600", border: "border-red-200" },
    DT:    { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    SAM:   { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-600", border: "border-yellow-200" },
    MIKE:  { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-600", border: "border-yellow-200" },
    WILL:  { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-600", border: "border-yellow-200" },
    CB:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    FS:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    SS:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    K:     { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600", border: "border-gray-200" },
    P:     { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600", border: "border-gray-200" },
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

export default function PlayersPage() {
  const { selectedSeason, userTeam } = useSeason();
  const teamId = userTeam?.team_id;
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [redshirting, setRedshirting] = useState<number | null>(null)
  const [search, setSearch] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const router = useRouter();
  const [editingOvr, setEditingOvr] = useState<{ [playerId: number]: boolean }>({});
  const [ovrInputs, setOvrInputs] = useState<{ [playerId: number]: number | undefined }>({});
  const inputRefs = useRef<{ [playerId: number]: HTMLInputElement | null }>({});
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState<number | null>(null);

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
                        <Badge variant="outline">{player.current_year || 'N/A'}</Badge>
                        {player.dev_trait && (
                          <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 border-yellow-300">{player.dev_trait}</Badge>
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
