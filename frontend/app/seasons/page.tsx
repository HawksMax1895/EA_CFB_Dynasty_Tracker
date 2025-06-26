"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Users, Target, Shield, Sword } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchSeasons, createSeason, fetchTeamsBySeason } from "@/lib/api"
import { useSeason } from "@/context/SeasonContext"
import { Team } from "@/types"
import Link from "next/link"

// Add a helper for ordinal suffix
function ordinal(n: number | null | undefined) {
  if (!n) return '';
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function SeasonsPage() {
  const { seasons, setSeasons } = useSeason();
  const [seasonDetails, setSeasonDetails] = useState<{ [key: number]: Team }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const fetchAllSeasonData = async () => {
        setLoading(true)
        try {
            const seasonsData = await fetchSeasons();
            setSeasons(seasonsData);

            const details: { [key: number]: Team } = {};
            for (const season of seasonsData) {
                const teams = await fetchTeamsBySeason(season.season_id);
                // Assuming the user-controlled team is consistent
                const userTeam = teams.find((t: any) => t.is_user_controlled); 
                if (userTeam) {
                    details[season.season_id] = userTeam;
                }
            }
            setSeasonDetails(details);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    fetchAllSeasonData();
  }, [setSeasons])

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
          {seasons.map((season: any) => {
            const details = seasonDetails[season.season_id];
            return (
              <Card key={season.season_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{season.year} Season</CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {details ? `${details.wins}-${details.losses}` : "-"}
                        </Badge>
                        <Badge variant="secondary">
                          {details?.conference_name || "-"}
                        </Badge>
                        <Badge variant="default">{details?.final_rank ? `#${details.final_rank} Ranked` : "Unranked"}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium">{details?.prestige || "-"}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Sword className="h-4 w-4 text-red-500" />
                        Offense
                      </h4>
                      <div className="text-sm space-y-1">
                        <div>Offensive PPG: {details?.off_ppg?.toFixed(1) ?? "-"}{details?.off_ppg_rank ? ` (${ordinal(details.off_ppg_rank)})` : ""}</div>
                        <div>Passing Yards: {details?.pass_yards ?? "-"}{details?.pass_yards_rank ? ` (${ordinal(details.pass_yards_rank)})` : ""}</div>
                        <div>Rushing Yards: {details?.rush_yards ?? "-"}{details?.rush_yards_rank ? ` (${ordinal(details.rush_yards_rank)})` : ""}</div>
                        <div>Passing TDs: {details?.pass_tds ?? "-"}{details?.pass_tds_rank ? ` (${ordinal(details.pass_tds_rank)})` : ""}</div>
                        <div>Rushing TDs: {details?.rush_tds ?? "-"}{details?.rush_tds_rank ? ` (${ordinal(details.rush_tds_rank)})` : ""}</div>
                        <div>Offensive Yards: {details?.offense_yards ?? "-"}{details?.offense_yards_rank ? ` (${ordinal(details.offense_yards_rank)})` : ""}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Defense
                      </h4>
                      <div className="text-sm space-y-1">
                        <div>Defensive PPG: {details?.def_ppg?.toFixed(1) ?? "-"}{details?.def_ppg_rank ? ` (${ordinal(details.def_ppg_rank)})` : ""}</div>
                        <div>Total Sacks: {details?.sacks ?? "-"}{details?.sacks_rank ? ` (${ordinal(details.sacks_rank)})` : ""}</div>
                        <div>Interceptions: {details?.interceptions ?? "-"}{details?.interceptions_rank ? ` (${ordinal(details.interceptions_rank)})` : ""}</div>
                        <div>Defensive Yards: {details?.defense_yards ?? "-"}{details?.defense_yards_rank ? ` (${ordinal(details.defense_yards_rank)})` : ""}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Achievements
                      </h4>
                      <div className="space-y-1">
                         {/* Placeholder for achievements */}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Recruiting
                      </h4>
                      <div className="text-sm space-y-1">
                        <div>Class Rank: {details?.recruiting_rank ? `#${details.recruiting_rank}` : "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Link href={`/games?season=${season.season_id}`} passHref legacyBehavior>
                      <Button asChild variant="outline" className="mr-2">
                        <span>View Details</span>
                      </Button>
                    </Link>
                    <Link href={`/players?season=${season.season_id}`} passHref legacyBehavior>
                      <Button asChild variant="outline">
                        <span>View Roster</span>
                      </Button>
                    </Link>
                    <Link href={`/seasons/${season.season_id}/playoff`} className="btn btn-primary ml-2">Playoff Bracket</Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
