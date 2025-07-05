"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, TrendingUp } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchDashboard } from "@/lib/api"

import { useSeason } from "@/context/SeasonContext"
import { WinsChart } from "@/components/WinsChart"
import type { DashboardData } from "@/types"

export default function Dashboard() {
  const { selectedSeason } = useSeason();
  const [data, setData] = useState<DashboardData | null>(null)
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-destructive text-6xl mb-4">⚠️</div>
        <p className="text-destructive text-lg">Error: {error}</p>
      </div>
    </div>
  )

  // Fallbacks for missing data
  const team = data?.team || {}
  const recent = data?.recent_activity || []

  return (
    <>
      {/* Standardized Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">College Football Dynasty</h1>
          <p className="text-muted-foreground text-lg">Track your dynasty progress, players, and achievements</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Current Season</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{team.current_season_record ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Conf: {team.current_season_conference_record ?? "-"}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">All-Time Record</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{team.record ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Conf: {team.conference_record ?? "-"}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Team Prestige</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{team.national_ranking ? `#${team.national_ranking}` : '#NR'}</div>
            <p className="text-xs text-muted-foreground">{team.conference_position ? `${team.conference_position}${team.conference_position === 1 ? 'st' : team.conference_position === 2 ? 'nd' : team.conference_position === 3 ? 'rd' : 'th'} in Conference` : '-'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Commits</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{team.recruiting_commits ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Recruiting Rank {team.recruiting_rank ?? "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule (was Recent Activity) */}
      <Card className="border-0 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recent.length === 0 && <div className="text-muted-foreground">No recent activity.</div>}
            {recent.map((item, idx: number) => (
              <div className="flex items-center justify-between" key={idx}>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant="secondary">{item.time_ago}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wins Chart */}
      <div className="mt-8">
        <WinsChart />
      </div>
    </>
  )
}
