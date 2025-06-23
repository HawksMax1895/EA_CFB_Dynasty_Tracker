"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Award, Star, Medal } from "lucide-react"
import React, { useEffect, useState } from "react"
import { fetchAwards, fetchHonors, addAward, addHonor } from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function AwardsPage() {
  const [awards, setAwards] = useState<any[]>([])
  const [honors, setHonors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // For demo, use seasonId=2025 and teamId=1 for honors
  const seasonId = 2025
  const teamId = 1

  // Add Award form state
  const [awardForm, setAwardForm] = useState({ name: '', description: '' })
  const [awardLoading, setAwardLoading] = useState(false)
  const [awardError, setAwardError] = useState<string | null>(null)

  // Add Honor form state
  const [honorForm, setHonorForm] = useState({ player_id: '', honor_type: '' })
  const [honorLoading, setHonorLoading] = useState(false)
  const [honorError, setHonorError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAwards(),
      fetchHonors(seasonId, teamId)
    ])
      .then(([awardsData, honorsData]) => {
        setAwards(awardsData)
        setHonors(honorsData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [seasonId, teamId])

  const handleAwardFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAwardForm({ ...awardForm, [e.target.name]: e.target.value })
  }
  const handleHonorFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHonorForm({ ...honorForm, [e.target.name]: e.target.value })
  }

  const handleAddAward = async (e: React.FormEvent) => {
    e.preventDefault()
    setAwardLoading(true)
    setAwardError(null)
    try {
      await addAward(awardForm)
      setAwardForm({ name: '', description: '' })
      const data = await fetchAwards()
      setAwards(data)
    } catch (err: any) {
      setAwardError(err.message)
    } finally {
      setAwardLoading(false)
    }
  }
  const handleAddHonor = async (e: React.FormEvent) => {
    e.preventDefault()
    setHonorLoading(true)
    setHonorError(null)
    try {
      await addHonor({ ...honorForm, season_id: seasonId, team_id: teamId })
      setHonorForm({ player_id: '', honor_type: '' })
      const data = await fetchHonors(seasonId, teamId)
      setHonors(data)
    } catch (err: any) {
      setHonorError(err.message)
    } finally {
      setHonorLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading awards...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Awards & Honors</h1>
          <p className="text-gray-600">Track player awards and team achievements</p>
        </div>

        <Tabs defaultValue="national" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="national">National Awards</TabsTrigger>
            <TabsTrigger value="honors">Honors</TabsTrigger>
          </TabsList>

          <TabsContent value="national" className="space-y-4">
            {/* Add Award Form */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Add New Award</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col md:flex-row gap-4 items-end" onSubmit={handleAddAward}>
                  <input
                    name="name"
                    value={awardForm.name}
                    onChange={handleAwardFormChange}
                    placeholder="Award Name"
                    className="border rounded px-2 py-1"
                    required
                  />
                  <input
                    name="description"
                    value={awardForm.description}
                    onChange={handleAwardFormChange}
                    placeholder="Description"
                    className="border rounded px-2 py-1"
                    required
                  />
                  <Button type="submit" disabled={awardLoading}>
                    {awardLoading ? "Adding..." : "Add Award"}
                  </Button>
                  {awardError && <span className="text-red-500 ml-2">{awardError}</span>}
                </form>
              </CardContent>
            </Card>
            {awards.map((award, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        {award.name}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">{award.description}</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">National</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* You can display winner info if available in your backend */}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="honors" className="space-y-4">
            {/* Add Honor Form */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Add Team Honor</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col md:flex-row gap-4 items-end" onSubmit={handleAddHonor}>
                  <input
                    name="player_id"
                    value={honorForm.player_id}
                    onChange={handleHonorFormChange}
                    placeholder="Player ID"
                    className="border rounded px-2 py-1"
                    required
                  />
                  <input
                    name="honor_type"
                    value={honorForm.honor_type}
                    onChange={handleHonorFormChange}
                    placeholder="Honor Type (e.g. All-Conference)"
                    className="border rounded px-2 py-1"
                    required
                  />
                  <Button type="submit" disabled={honorLoading}>
                    {honorLoading ? "Adding..." : "Add Honor"}
                  </Button>
                  {honorError && <span className="text-red-500 ml-2">{honorError}</span>}
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-blue-500" />
                  Team Honors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {honors.map((honor, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">Player ID: {honor.player_id}</div>
                      <div className="text-sm text-muted-foreground">{honor.honor_type}</div>
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
