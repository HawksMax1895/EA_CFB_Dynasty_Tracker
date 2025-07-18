"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, TrendingUp } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchDashboard } from "@/lib/api"

import { useSeason } from "@/context/SeasonContext"
import { WinsChart } from "@/components/WinsChart"
import type { DashboardData } from "@/types"
import Image from "next/image";

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
            {(() => {
              let coloredCompletedShown = false;
              return recent.map((item, idx) => {
                // Only color the first completed game (the most recent one)
                let resultColor = "";
                if (!coloredCompletedShown && item.status === "completed") {
                  if (item.description?.toLowerCase().includes("win")) {
                    resultColor = "text-[hsl(var(--green-600))] border-[hsl(var(--green-600))]";
                  } else if (item.description?.toLowerCase().includes("loss")) {
                    resultColor = "text-[hsl(var(--red-600))] border-[hsl(var(--red-600))]";
                  }
                  coloredCompletedShown = true;
                }
                return (
                  <div className="flex items-center justify-between" key={idx}>
                    <div className="flex items-center gap-3">
                      {/* Opponent Logo or Bye Week Icon */}
                      {item.status === "bye" ? (
                        <img
                          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNvZmZlZS1pY29uIGx1Y2lkZS1jb2ZmZWUiPjxwYXRoIGQ9Ik0xMCAydjIiLz48cGF0aCBkPSJNMTQgMnYyIi8+PHBhdGggZD0iTTE2IDhhMSAxIDAgMCAxIDEgMXY4YTQgNCAwIDAgMS00IDRIN2E0IDQgMCAwIDEtNC00VjlhMSAxIDAgMCAxIDEtMWgxNGE0IDQgMCAxIDEgMCA4aC0xIi8+PHBhdGggZD0iTTYgMnYyIi8+PC9zdmc+"
                          alt="Bye Week"
                          width={36}
                          height={36}
                          className="rounded-full border bg-white object-contain"
                          style={{ minWidth: 36, minHeight: 36 }}
                        />
                      ) : item.opponent_logo_url ? (
                        <Image
                          src={item.opponent_logo_url.startsWith("/") ? item.opponent_logo_url : `/` + item.opponent_logo_url}
                          alt="Opponent Logo"
                          width={36}
                          height={36}
                          className="rounded-full border bg-white object-contain"
                          style={{ minWidth: 36, minHeight: 36 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder-logo.png";
                          }}
                        />
                      ) : (
                        <Image
                          src="/placeholder-logo.png"
                          alt="No Logo"
                          width={36}
                          height={36}
                          className="rounded-full border bg-white object-contain"
                          style={{ minWidth: 36, minHeight: 36 }}
                        />
                      )}
                      <div>
                        <p className={`font-medium text-foreground ${resultColor}`}>{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={resultColor}>{item.time_ago}</Badge>
                  </div>
                );
              });
            })()}
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
