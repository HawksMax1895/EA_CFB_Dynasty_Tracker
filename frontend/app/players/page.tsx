"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, TrendingUp, Award } from "lucide-react"
import React, { useEffect, useState } from "react"
import { setPlayerRedshirt, fetchPlayersBySeason } from "@/lib/api"
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

  if (loading) return <div className="p-8">Loading players...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

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
          <div>
            <SeasonSelector />
          </div>
        </div>

        {/* Add Player Modal */}
        <div className="mb-6">
          <AddPlayerModal onPlayerAdded={handlePlayerAdded} />
        </div>

        {/* Filters (not functional yet) */}
        <Card className="mb-6">
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
          {filteredPlayers.map((player, index) => (
            <Card key={player.player_id || index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{player.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{player.position}</Badge>
                      <Badge variant="secondary">
                        {player.current_year}{player.redshirted ? ' (RS)' : ''}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: player.recruit_stars || 0 }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    {/* New: Player Details */}
                    <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-700">
                      {player.dev_trait && (
                        <span><strong>Dev Trait:</strong> {player.dev_trait}</span>
                      )}
                      {player.height && (
                        <span><strong>Height:</strong> {player.height}</span>
                      )}
                      {player.weight && (
                        <span><strong>Weight:</strong> {player.weight} lbs</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-2xl font-bold">{player.ovr_rating ?? "-"}</span>
                      <span className="text-sm text-muted-foreground">OVR</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button variant="outline" className="mr-2" onClick={() => router.push(`/players/${player.player_id}`)}>
                    View Profile
                  </Button>
                  <Button
                    variant={player.redshirted ? "secondary" : "outline"}
                    disabled={redshirting === player.player_id || player.has_ever_redshirted}
                    onClick={() => handleRedshirt(player.player_id, player.redshirted)}
                  >
                    {redshirting === player.player_id
                      ? "Updating..."
                      : player.has_ever_redshirted
                      ? "Redshirt Used"
                      : player.redshirted
                      ? "Remove Redshirt"
                      : "Redshirt"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
