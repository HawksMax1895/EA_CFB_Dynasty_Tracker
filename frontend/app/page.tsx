"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, TrendingUp } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchDashboard } from "@/lib/api"
import { SeasonSelector } from "@/components/SeasonSelector"
import { useSeason } from "@/context/SeasonContext"

export default function Dashboard() {
  const { selectedSeason } = useSeason();
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedSeason) return;
    setLoading(true)
    fetchDashboard(selectedSeason)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [selectedSeason])

  if (loading) return <div className="p-8">Loading dashboard...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  // Fallbacks for missing data
  const season = data?.season || {}
  const team = data?.team || {}
  const stats = data?.stats || {}
  const recent = data?.recent_activity || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">College Football Dynasty</h1>
            <p className="text-gray-600">Track your dynasty progress, players, and achievements</p>
          </div>
          <SeasonSelector />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Season</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{team.current_season_record ?? "-"}</div>
              <p className="text-xs text-muted-foreground">Conf: {team.current_season_conference_record ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All-Time Record</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{team.record ?? "-"}</div>
              <p className="text-xs text-muted-foreground">Conf: {team.conference_record ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Prestige</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{team.national_ranking ? `#${team.national_ranking}` : '-'}</div>
              <p className="text-xs text-muted-foreground">{team.conference_position ? `${team.conference_position}${team.conference_position === 1 ? 'st' : team.conference_position === 2 ? 'nd' : team.conference_position === 3 ? 'rd' : 'th'} in Conference` : '-'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commits</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{team.recruiting_commits ?? "-"}</div>
              <p className="text-xs text-muted-foreground">Recruiting Rank {team.recruiting_rank ?? "-"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent.length === 0 && <div className="text-muted-foreground">No recent activity.</div>}
              {recent.map((item: any, idx: number) => (
                <div className="flex items-center justify-between" key={idx}>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Badge variant="secondary">{item.time_ago}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
