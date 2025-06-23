"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, TrendingUp, Award } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchPlayers, setPlayerRedshirt, addPlayer, progressPlayerClass } from "@/lib/api"

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redshirting, setRedshirting] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', position: '', recruit_stars: 3, current_year: 'FR' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [progressing, setProgressing] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchPlayers()
      .then((data) => {
        setPlayers(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      await addPlayer(form)
      setForm({ name: '', position: '', recruit_stars: 3, current_year: 'FR' })
      const data = await fetchPlayers()
      setPlayers(data)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleProgressClass = async () => {
    setProgressing(true)
    setProgressError(null)
    try {
      await progressPlayerClass()
      const data = await fetchPlayers()
      setPlayers(data)
    } catch (err: any) {
      setProgressError(err.message)
    } finally {
      setProgressing(false)
    }
  }

  const handleRedshirt = async (playerId: number, current: boolean) => {
    setRedshirting(playerId)
    try {
      await setPlayerRedshirt(playerId, !current)
      // Refetch players after redshirt change
      const data = await fetchPlayers()
      setPlayers(data)
    } catch (err) {
      alert("Failed to update redshirt status")
    } finally {
      setRedshirting(null)
    }
  }

  if (loading) return <div className="p-8">Loading players...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Current Roster</h1>
          <p className="text-gray-600">View current season players and their performance</p>
        </div>

        {/* Add Player Form and Progress Class Button */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Player</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col md:flex-row gap-4 items-end" onSubmit={handleAddPlayer}>
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Name"
                className="border rounded px-2 py-1"
                required
              />
              <input
                name="position"
                value={form.position}
                onChange={handleFormChange}
                placeholder="Position"
                className="border rounded px-2 py-1"
                required
              />
              <input
                name="recruit_stars"
                type="number"
                min={1}
                max={5}
                value={form.recruit_stars}
                onChange={handleFormChange}
                placeholder="Stars"
                className="border rounded px-2 py-1 w-20"
                required
              />
              <select
                name="current_year"
                value={form.current_year}
                onChange={handleFormChange}
                className="border rounded px-2 py-1"
                required
              >
                <option value="FR">FR</option>
                <option value="SO">SO</option>
                <option value="JR">JR</option>
                <option value="SR">SR</option>
              </select>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Adding..." : "Add Player"}
              </Button>
              {formError && <span className="text-red-500 ml-2">{formError}</span>}
            </form>
            <div className="mt-4 flex gap-4 items-center">
              <Button onClick={handleProgressClass} disabled={progressing} variant="secondary">
                {progressing ? "Progressing..." : "Progress Class"}
              </Button>
              {progressError && <span className="text-red-500 ml-2">{progressError}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Filters (not functional yet) */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search players..." className="pl-10" />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="qb">Quarterback</SelectItem>
                  <SelectItem value="rb">Running Back</SelectItem>
                  <SelectItem value="wr">Wide Receiver</SelectItem>
                  <SelectItem value="te">Tight End</SelectItem>
                  <SelectItem value="ol">Offensive Line</SelectItem>
                  <SelectItem value="dl">Defensive Line</SelectItem>
                  <SelectItem value="lb">Linebacker</SelectItem>
                  <SelectItem value="db">Defensive Back</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Player Cards */}
        <div className="grid gap-6">
          {players.map((player, index) => (
            <Card key={player.player_id || index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{player.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{player.position}</Badge>
                      <Badge variant="secondary">{player.current_year}</Badge>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: player.recruit_stars || 0 }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      {player.redshirted && <Badge className="bg-red-100 text-red-800 ml-2">Redshirt</Badge>}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Season Stats</h4>
                    <div className="text-sm space-y-1">
                      {/* You can fetch and display stats if available in your backend */}
                      <div>Passing Yards: {player.pass_yards ?? "-"}</div>
                      <div>Passing TDs: {player.pass_tds ?? "-"}</div>
                      <div>Rushing Yards: {player.rush_yards ?? "-"}</div>
                      <div>Rushing TDs: {player.rush_tds ?? "-"}</div>
                      <div>Receiving Yards: {player.rec_yards ?? "-"}</div>
                      <div>Receiving TDs: {player.rec_tds ?? "-"}</div>
                      <div>Tackles: {player.tackles ?? "-"}</div>
                      <div>Sacks: {player.sacks ?? "-"}</div>
                      <div>Interceptions: {player.interceptions ?? "-"}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Awards & Honors
                    </h4>
                    <div className="space-y-1">
                      {/* You can fetch and display awards if available in your backend */}
                      <Badge variant="outline" className="mr-2 mb-1">
                        {player.awards ?? "-"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button variant="outline" className="mr-2">
                    View Profile
                  </Button>
                  <Button variant="outline">Career Stats</Button>
                  <Button
                    variant={player.redshirted ? "secondary" : "outline"}
                    disabled={redshirting === player.player_id}
                    onClick={() => handleRedshirt(player.player_id, player.redshirted)}
                  >
                    {redshirting === player.player_id
                      ? "Updating..."
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
