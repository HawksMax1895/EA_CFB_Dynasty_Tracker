"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Users, Target } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchSeasons, createSeason } from "@/lib/api"

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchSeasons()
      .then((data) => {
        setSeasons(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleCreateSeason = async () => {
    setCreating(true)
    setError(null)
    try {
      await createSeason()
      const data = await fetchSeasons()
      setSeasons(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="p-8">Loading seasons...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Season History</h1>
            <p className="text-gray-600">Track your dynasty progress across seasons</p>
          </div>
          <Button onClick={handleCreateSeason} disabled={creating} variant="default">
            {creating ? "Creating..." : "Add New Season"}
          </Button>
        </div>

        <div className="grid gap-6">
          {seasons.map((season: any) => (
            <Card key={season.season_id || season.year} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{season.year} Season</CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {season.record || "-"}
                      </Badge>
                      <Badge variant="secondary">
                        {season.conference || "-"}
                      </Badge>
                      <Badge variant="default">{season.ranking ? `#${season.ranking} Ranked` : "Unranked"}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">{season.prestige || "-"}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{season.bowlGame || "-"}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Achievements
                    </h4>
                    <div className="space-y-1">
                      {(season.achievements || []).map((achievement: string, index: number) => (
                        <Badge key={index} variant="outline" className="mr-2">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Stats
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>Points For: {season.points_for ?? "-"}</div>
                      <div>Points Against: {season.points_against ?? "-"}</div>
                      <div>Total Yards: {season.total_yards ?? "-"}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Recruiting
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>Class Rank: {season.class_rank ? `#${season.class_rank}` : "-"}</div>
                      <div>5-Star Recruits: {season.five_star_recruits ?? "-"}</div>
                      <div>4-Star Recruits: {season.four_star_recruits ?? "-"}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="mr-2">
                    View Details
                  </Button>
                  <Button variant="outline">View Roster</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
