"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, MapPin, Trophy, Clock } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchGames, addGame, updateGameResult } from "@/lib/api"

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

  useEffect(() => {
    setLoading(true)
    fetchGames()
      .then((data) => {
        setGames(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const getResultBadge = (game: any) => {
    if (game.home_score == null || game.away_score == null) return <Badge variant="outline">Upcoming</Badge>
    if (game.home_score > game.away_score) return <Badge className="bg-green-100 text-green-800">W</Badge>
    if (game.home_score < game.away_score) return <Badge className="bg-red-100 text-red-800">L</Badge>
    return <Badge variant="outline">-</Badge>
  }

  const handleAddFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value })
  }
  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      await addGame(addForm)
      setAddForm({ week: '', opponent_name: '', date: '', time: '', location: '', game_type: 'Regular' })
      const data = await fetchGames()
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
      const data = await fetchGames()
      setGames(data)
      setResultForms((prev) => ({ ...prev, [gameId]: { home_score: '', away_score: '' } }))
    } catch (err: any) {
      setResultError(err.message)
    } finally {
      setResultLoading(null)
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
            {/* Add Game Form */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Add New Game</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col md:flex-row gap-4 items-end" onSubmit={handleAddGame}>
                  <input
                    name="week"
                    value={addForm.week}
                    onChange={handleAddFormChange}
                    placeholder="Week"
                    className="border rounded px-2 py-1 w-20"
                    required
                  />
                  <input
                    name="opponent_name"
                    value={addForm.opponent_name}
                    onChange={handleAddFormChange}
                    placeholder="Opponent"
                    className="border rounded px-2 py-1"
                    required
                  />
                  <input
                    name="date"
                    value={addForm.date}
                    onChange={handleAddFormChange}
                    placeholder="Date"
                    className="border rounded px-2 py-1"
                  />
                  <input
                    name="time"
                    value={addForm.time}
                    onChange={handleAddFormChange}
                    placeholder="Time"
                    className="border rounded px-2 py-1"
                  />
                  <input
                    name="location"
                    value={addForm.location}
                    onChange={handleAddFormChange}
                    placeholder="Location"
                    className="border rounded px-2 py-1"
                  />
                  <select
                    name="game_type"
                    value={addForm.game_type}
                    onChange={handleAddFormChange}
                    className="border rounded px-2 py-1"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Conference">Conference</option>
                    <option value="Playoff">Playoff</option>
                  </select>
                  <button type="submit" disabled={addLoading} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {addLoading ? "Adding..." : "Add Game"}
                  </button>
                  {addError && <span className="text-red-500 ml-2">{addError}</span>}
                </form>
              </CardContent>
            </Card>
            {/* Game List with Update Result forms */}
            {games.map((game, index) => (
              <Card key={game.game_id || index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        Week {game.week}: vs {game.opponent_name ?? game.away_team_id}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{game.date ?? "-"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">{game.time ?? "-"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{game.location ?? "-"}</span>
                        </div>
                        <Badge variant={game.game_type === "Conference" ? "default" : "secondary"}>
                          {game.game_type ?? "Regular"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      {getResultBadge(game)}
                      {game.home_score != null && game.away_score != null && (
                        <div className="text-2xl font-bold mt-2">
                          {game.home_score} - {game.away_score}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Update Result Form */}
                  <form className="flex flex-col md:flex-row gap-2 items-end" onSubmit={(e) => handleUpdateResult(game.game_id, e)}>
                    <input
                      name="home_score"
                      type="number"
                      value={resultForms[game.game_id]?.home_score || ''}
                      onChange={(e) => handleResultFormChange(game.game_id, e)}
                      placeholder="Home Score"
                      className="border rounded px-2 py-1 w-24"
                      required
                    />
                    <input
                      name="away_score"
                      type="number"
                      value={resultForms[game.game_id]?.away_score || ''}
                      onChange={(e) => handleResultFormChange(game.game_id, e)}
                      placeholder="Away Score"
                      className="border rounded px-2 py-1 w-24"
                      required
                    />
                    <button type="submit" disabled={resultLoading === game.game_id} className="bg-green-600 text-white px-4 py-2 rounded">
                      {resultLoading === game.game_id ? "Updating..." : "Update Result"}
                    </button>
                    {resultError && resultLoading === game.game_id && <span className="text-red-500 ml-2">{resultError}</span>}
                  </form>
                </CardContent>
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
