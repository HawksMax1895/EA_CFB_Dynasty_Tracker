"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Award, Star, Medal, Pencil } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchAwards, fetchHonors, addAward, addHonor, fetchAwardWinnersBySeason, fetchAllPlayersBySeason, fetchTeamsBySeason, updateAwardWinner, addPlayer } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { useSeason } from "@/context/SeasonContext";
import { SeasonSelector } from "@/components/SeasonSelector"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function AwardsPage() {
  const [awardWinners, setAwardWinners] = useState<any[]>([])
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

  useEffect(() => {
    if (!selectedSeason) return;
    setLoading(true)
    fetchAwardWinnersBySeason(selectedSeason)
      .then((data) => {
        setAwardWinners(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
    // Preload all players and teams for editing
    fetchAllPlayersBySeason(selectedSeason).then(setAllPlayers)
    fetchTeamsBySeason(selectedSeason).then(setAllTeams)
  }, [selectedSeason])

  const openEdit = (winner: any) => {
    setEditPlayerId(winner.player_id)
    setEditTeamId(winner.team_id)
    setEditModal({ open: true, awardWinner: winner })
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
      await updateAwardWinner(editModal.awardWinner.award_winner_id, { player_id: editPlayerId, team_id: teamId })
      // Refresh list
      const data = await fetchAwardWinnersBySeason(selectedSeason!)
      setAwardWinners(data)
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

  if (loading) return <div className="p-8">Loading award winners...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Award Winners</h1>
            <p className="text-gray-600">See the national award winners for each season</p>
          </div>
          <SeasonSelector />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {awardWinners.length === 0 ? (
            <div className="text-gray-500">No award winners for this season.</div>
          ) : (
            awardWinners.map((winner, idx) => (
              <Card key={idx} className="hover:shadow-xl border-2 border-yellow-100/60 bg-white/80 backdrop-blur-sm transition-all duration-300 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Trophy className="h-6 w-6 text-yellow-500 drop-shadow" />
                      <span className="font-bold text-gray-900">{winner.award}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 shadow">National</Badge>
                      <button onClick={() => openEdit(winner)} className="ml-2 p-1 rounded hover:bg-yellow-50 transition" title="Edit Award Winner">
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-4 pt-0 pb-4">
                  <Avatar>
                    <AvatarImage src={winner.team_logo_url || "/placeholder-logo.png"} alt={winner.team} />
                    <AvatarFallback>{winner.team?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-gray-900">{winner.player}</span>
                    <span className="text-gray-600 text-sm flex items-center gap-1">
                      <span className="font-medium">{winner.team}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <Dialog open={editModal.open} onOpenChange={closeEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Award Winner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Player</label>
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
                    // When player changes, update editTeamId to match the player's team
                    const selected = allPlayers.find(p => p.player_id === Number(v))
                    if (selected) setEditTeamId(selected.team_id)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlayers.map(p => (
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
                {/* Show team label for selected player */}
                {editPlayerId && (
                  <div className="mt-2 text-sm text-gray-600">
                    Team: <span className="font-medium">{allPlayers.find(p => p.player_id === editPlayerId)?.team_name || "-"}</span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
