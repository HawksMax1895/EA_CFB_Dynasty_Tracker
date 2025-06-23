"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Star, TrendingUp, MapPin } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import React, { useEffect, useState } from "react"
import { fetchRecruitingClass, addRecruitingClass } from "@/lib/api"

export default function RecruitingPage() {
  // For demo, using teamId=1 and seasonId=2025. Replace with actual selection logic as needed.
  const teamId = 1
  const seasonId = 2025
  const [recruits, setRecruits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', position: '', recruit_stars: 3, recruit_rank_nat: 0 })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchRecruitingClass(teamId, seasonId)
      .then((data) => {
        setRecruits(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [teamId, seasonId])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAddRecruit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      await addRecruitingClass({ team_id: teamId, season_id: seasonId, recruits: [form] })
      setForm({ name: '', position: '', recruit_stars: 3, recruit_rank_nat: 0 })
      const data = await fetchRecruitingClass(teamId, seasonId)
      setRecruits(data)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Committed":
        return "bg-green-100 text-green-800"
      case "Interested":
        return "bg-blue-100 text-blue-800"
      case "Considering":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) return <div className="p-8">Loading recruiting class...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  const committedRecruits = recruits.filter((r) => r.status === "Committed")
  const prospectRecruits = recruits.filter((r) => r.status !== "Committed")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Recruiting</h1>
          <p className="text-gray-600">Track your recruiting efforts and build championship classes</p>
        </div>

        {/* Add Recruit Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Recruit</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col md:flex-row gap-4 items-end" onSubmit={handleAddRecruit}>
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
              <input
                name="recruit_rank_nat"
                type="number"
                value={form.recruit_rank_nat}
                onChange={handleFormChange}
                placeholder="Nat. Rank"
                className="border rounded px-2 py-1 w-24"
                required
              />
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Adding..." : "Add Recruit"}
              </Button>
              {formError && <span className="text-red-500 ml-2">{formError}</span>}
            </form>
          </CardContent>
        </Card>

        {/* Class Overview (static for now, can be dynamic if backend provides) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">{seasonId} Recruiting Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">#-</div>
                <div className="text-sm text-muted-foreground">National Rank</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{recruits.length}</div>
                <div className="text-sm text-muted-foreground">Commits</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">-</div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">-</div>
                <div className="text-sm text-muted-foreground">Open Slots</div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Class Progress</span>
                <span>
                  {recruits.length}/-
                </span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recruit Tabs */}
        <Tabs defaultValue="committed" className="w-full">
          <TabsList>
            <TabsTrigger value="committed">Committed ({committedRecruits.length})</TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({prospectRecruits.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="committed">
            <div className="grid gap-6">
              {committedRecruits.map((recruit, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{recruit.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{recruit.position}</Badge>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm text-muted-foreground">{recruit.location ?? "-"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: recruit.recruit_stars || 0 }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-2xl font-bold">{recruit.rating ?? "-"}</span>
                          <span className="text-sm text-muted-foreground">Rating</span>
                        </div>
                        <Badge className={getStatusColor(recruit.status ?? "Committed")}>{recruit.status ?? "Committed"}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Commitment Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Commitment Date</span>
                            <span>{recruit.commitmentDate ? new Date(recruit.commitmentDate).toLocaleDateString() : "-"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Early Enrollee</span>
                            <span>{recruit.earlyEnrollee ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Recruiting Info</h4>
                        <div className="text-sm space-y-1">
                          <div>National Rank: #{recruit.recruit_rank_nat ?? "-"}</div>
                          <div>Position Rank: -</div>
                          <div>State Rank: -</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline">View Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="prospects">
            <div className="grid gap-6">
              {prospectRecruits.map((recruit, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{recruit.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{recruit.position}</Badge>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm text-muted-foreground">{recruit.location ?? "-"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: recruit.recruit_stars || 0 }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-2xl font-bold">{recruit.rating ?? "-"}</span>
                          <span className="text-sm text-muted-foreground">Rating</span>
                        </div>
                        <Badge className={getStatusColor(recruit.status ?? "Interested")}>{recruit.status ?? "Interested"}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Commitment Level</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Interest Level</span>
                            <span>{recruit.interestLevel ?? "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Recruiting Info</h4>
                        <div className="text-sm space-y-1">
                          <div>National Rank: #{recruit.recruit_rank_nat ?? "-"}</div>
                          <div>Position Rank: -</div>
                          <div>State Rank: -</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline">View Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
