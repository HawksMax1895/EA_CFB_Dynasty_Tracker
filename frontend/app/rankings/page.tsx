"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingUp, Medal, Target } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchRecruitingRankings, updateRecruitingRankings } from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function RankingsPage() {
  const apPoll = [
    { rank: 1, team: "Georgia", record: "13-1", points: 1547, previousRank: 3 },
    { rank: 2, team: "Michigan", record: "12-2", points: 1489, previousRank: 1 },
    { rank: 3, team: "Texas", record: "12-2", points: 1432, previousRank: 4 },
    { rank: 4, team: "Washington", record: "11-3", points: 1378, previousRank: 6 },
    { rank: 5, team: "Alabama", record: "11-2", points: 1324, previousRank: 2 },
    { rank: 6, team: "Oregon", record: "11-2", points: 1267, previousRank: 8 },
    { rank: 7, team: "Florida State", record: "13-1", points: 1198, previousRank: 5 },
    { rank: 8, team: "LSU", record: "10-3", points: 1134, previousRank: 12 },
    { rank: 9, team: "Penn State", record: "10-3", points: 1087, previousRank: 7 },
    { rank: 10, team: "Ohio State", record: "11-2", points: 1023, previousRank: 9 },
  ]

  const secStandings = [
    { rank: 1, team: "Georgia", confRecord: "8-0", overallRecord: "13-1", division: "East" },
    { rank: 2, team: "Alabama", confRecord: "6-2", overallRecord: "11-2", division: "West" },
    { rank: 3, team: "LSU", confRecord: "6-2", overallRecord: "10-3", division: "West" },
    { rank: 4, team: "Tennessee", confRecord: "5-3", overallRecord: "9-4", division: "East" },
    { rank: 5, team: "Florida", confRecord: "5-3", overallRecord: "8-5", division: "East" },
    { rank: 6, team: "Auburn", confRecord: "4-4", overallRecord: "7-6", division: "West" },
    { rank: 7, team: "Kentucky", confRecord: "4-4", overallRecord: "7-6", division: "East" },
    { rank: 8, team: "Mississippi State", confRecord: "3-5", overallRecord: "6-7", division: "West" },
  ]

  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [recruitingRankings, setRecruitingRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Fetch the latest season on mount
  useEffect(() => {
    fetch('/api/seasons')
      .then(res => res.json())
      .then(seasons => {
        if (seasons.length > 0) {
          // Use the latest season (highest year)
          const latest = seasons.reduce((a: any, b: any) => (a.year > b.year ? a : b));
          setSeasonId(latest.season_id);
        } else {
          setError('No seasons found');
          setLoading(false);
        }
      })
      .catch(err => {
        setError('Failed to fetch seasons');
        setLoading(false);
      });
  }, []);

  // Fetch recruiting rankings when seasonId is set
  useEffect(() => {
    if (seasonId == null) return;
    setLoading(true)
    fetchRecruitingRankings(seasonId)
      .then((data) => {
        setRecruitingRankings(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [seasonId])

  const teamRatings = [
    { rank: 1, team: "Georgia", offense: 95, defense: 97, overall: 96 },
    { rank: 2, team: "Alabama", offense: 94, defense: 93, overall: 94 },
    { rank: 3, team: "Michigan", offense: 91, defense: 96, overall: 93 },
    { rank: 4, team: "Texas", offense: 93, defense: 90, overall: 92 },
    { rank: 5, team: "Washington", offense: 96, defense: 87, overall: 91 },
    { rank: 6, team: "Oregon", offense: 92, defense: 89, overall: 90 },
    { rank: 7, team: "Florida State", offense: 88, defense: 92, overall: 90 },
    { rank: 8, team: "LSU", offense: 89, defense: 90, overall: 89 },
  ]

  const getRankChange = (current: number, previous: number) => {
    const change = previous - current
    if (change > 0) {
      return <Badge className="bg-green-100 text-green-800">↑{change}</Badge>
    } else if (change < 0) {
      return <Badge className="bg-red-100 text-red-800">↓{Math.abs(change)}</Badge>
    } else {
      return <Badge variant="outline">-</Badge>
    }
  }

  if (loading) return <div className="p-8">Loading recruiting rankings...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Rankings</h1>
          <p className="text-gray-600">End of season rankings and standings</p>
        </div>

        <Tabs defaultValue="ap-poll" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ap-poll">AP Poll</TabsTrigger>
            <TabsTrigger value="conference">Conference</TabsTrigger>
            <TabsTrigger value="recruiting">Recruiting</TabsTrigger>
            <TabsTrigger value="team-ratings">Team Ratings</TabsTrigger>
          </TabsList>

          <TabsContent value="ap-poll" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Final AP Poll (Week 16)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apPoll.map((team, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-blue-600 w-8">{team.rank}</div>
                        <div>
                          <div className="font-semibold text-lg">{team.team}</div>
                          <div className="text-sm text-muted-foreground">{team.record}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{team.points} pts</div>
                          <div className="text-sm text-muted-foreground">Prev: #{team.previousRank}</div>
                        </div>
                        {getRankChange(team.rank, team.previousRank)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conference" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-blue-500" />
                  SEC Final Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {secStandings.map((team, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-blue-600 w-8">{team.rank}</div>
                        <div>
                          <div className="font-semibold text-lg">{team.team}</div>
                          <div className="text-sm text-muted-foreground">{team.division} Division</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">SEC: {team.confRecord}</div>
                          <div className="text-sm text-muted-foreground">Overall: {team.overallRecord}</div>
                        </div>
                        {team.rank === 1 && <Badge className="bg-yellow-100 text-yellow-800">Champion</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recruiting" className="space-y-4">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Update Recruiting Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col md:flex-row gap-4 items-end" onSubmit={async (e) => {
                  e.preventDefault();
                  if (seasonId == null) return;
                  setUpdateLoading(true);
                  setUpdateError(null);
                  try {
                    await updateRecruitingRankings({ season_id: seasonId, rankings: [] });
                    const data = await fetchRecruitingRankings(seasonId);
                    setRecruitingRankings(data);
                  } catch (err: any) {
                    setUpdateError(err.message);
                  } finally {
                    setUpdateLoading(false);
                  }
                }}>
                  <Button type="submit" disabled={updateLoading || seasonId == null}>
                    {updateLoading ? "Updating..." : "Update Rankings"}
                  </Button>
                  {updateError && <span className="text-red-500 ml-2">{updateError}</span>}
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  {seasonId} Recruiting Class Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recruitingRankings.map((team: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-green-600 w-8">{team.recruiting_rank ?? index + 1}</div>
                        <div>
                          <div className="font-semibold text-lg">{team.team_name ?? `Team ${team.team_id}`}</div>
                          <div className="text-sm text-muted-foreground">
                            Season: {team.season_year ?? '-'} (ID: {team.season_id ?? '-'})
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Team ID: {team.team_id}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team-ratings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  Team Overall Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamRatings.map((team, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-purple-600 w-8">{team.rank}</div>
                        <div>
                          <div className="font-semibold text-lg">{team.team}</div>
                          <div className="text-sm text-muted-foreground">Overall Rating: {team.overall}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">OFF: {team.offense}</Badge>
                        <Badge variant="outline">DEF: {team.defense}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
