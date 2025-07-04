"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Target, 
  Shield, 
  Sword, 
  Settings, 
  Building2, 
  Calendar,
  Star,
  Award,
  Zap,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { fetchSeasons, createSeason, fetchTeamsBySeason, deleteSeason, fetchTeams, setUserControlledTeam, API_BASE_URL } from "@/lib/api";
import { useSeason } from "@/context/SeasonContext";
import { Team } from "@/types";
import Link from "next/link";
import { useMemo } from "react";

// Add a helper for ordinal suffix
function ordinal(n: number | null | undefined) {
  if (!n) return '';
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function SettingsPage() {
    const { seasons, setSeasons } = useSeason();
    const [seasonDetails, setSeasonDetails] = useState<{ [key: number]: Team }>({})
    const [loadingSeasons, setLoadingSeasons] = useState(true)
    const [seasonError, setSeasonError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)

    const [teams, setTeams] = useState<any[]>([]);
    const [conferences, setConferences] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setLoadingTeams(true);
        Promise.all([
            fetchTeams(),
            fetch(`${API_BASE_URL}/conferences`).then(res => res.json())
        ]).then(([teamsData, conferencesData]) => {
            setTeams(teamsData);
            setConferences(conferencesData);
            const userTeam = teamsData.find((t: any) => t.is_user_controlled);
            setSelectedTeam(userTeam ? userTeam.team_id : null);
            setLoadingTeams(false);
        });
    }, []);

    useEffect(() => {
        const fetchAllSeasonData = async () => {
            setLoadingSeasons(true)
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
                setSeasonError(err.message);
            } finally {
                setLoadingSeasons(false);
            }
        };
        fetchAllSeasonData();
    }, [setSeasons])

    const handleChange = async (value: string) => {
        const teamId = Number(value);
        setSelectedTeam(teamId);
        setSaving(true);
        setMessage(null);
        try {
            await setUserControlledTeam(teamId);
            setMessage("User-controlled team updated successfully!");
        } catch (err: any) {
            setMessage("Failed to update user-controlled team.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateSeason = async () => {
      setCreating(true)
      setSeasonError(null)
      try {
        await createSeason()
        const data = await fetchSeasons()
        setSeasons(data)
      } catch (err: any) {
        setSeasonError(err.message)
      } finally {
        setCreating(false)
      }
    }

    const handleDeleteLatestSeason = async () => {
      if (!seasons.length) return;
      const latest = seasons[seasons.length - 1];
      if (!window.confirm(`Are you sure you want to delete the latest season (${latest.year}) and all its data? This cannot be undone.`)) return;
      setCreating(true);
      setSeasonError(null);
      try {
        await deleteSeason(latest.season_id);
        const data = await fetchSeasons();
        setSeasons(data);
      } catch (err: any) {
        setSeasonError(err.message);
      } finally {
        setCreating(false);
      }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                            <Settings className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                Settings
                            </h1>
                            <p className="text-gray-600 mt-1">Manage your dynasty configuration and preferences</p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="teams" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-gray-200/50">
                        <TabsTrigger value="teams" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Teams
                        </TabsTrigger>
                        <TabsTrigger value="conferences" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Conferences
                        </TabsTrigger>
                        <TabsTrigger value="seasons" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Seasons
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="teams" className="space-y-6">
                        {/* User Team Selection */}
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Target className="h-5 w-5 text-blue-600" />
                                    User-Controlled Team
                                </CardTitle>
                                <p className="text-gray-600 text-sm">Select which team you want to control in your dynasty</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="user-team">Your Team</Label>
                                    {loadingTeams ? (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading teams...
                                        </div>
                                    ) : (
                                        <Select value={selectedTeam?.toString() || ""} onValueChange={handleChange} disabled={saving}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select your team" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teams.map((team) => (
                                                    <SelectItem key={team.team_id} value={team.team_id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            {team.logo_url && (
                                                                <img src={team.logo_url} alt={team.name} className="w-6 h-6 rounded" />
                                                            )}
                                                            {team.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {saving && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </div>
                                    )}
                                    {message && (
                                        <div className={`flex items-center gap-2 p-3 rounded-lg ${
                                            message.includes('successfully') 
                                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                                : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}>
                                            {message.includes('successfully') ? (
                                                <CheckCircle className="h-4 w-4" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4" />
                                            )}
                                            {message}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Team Management */}
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Building2 className="h-5 w-5 text-purple-600" />
                                    Manage All Teams
                                </CardTitle>
                                <p className="text-gray-600 text-sm">Edit team information, conferences, and prestige ratings</p>
                            </CardHeader>
                            <CardContent>
                                {loadingTeams ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            Loading teams...
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {teams.map((team) => (
                                            <TeamEditCard key={team.team_id} team={team} conferences={conferences} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="conferences" className="space-y-6">
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Users className="h-5 w-5 text-green-600" />
                                    Manage Conferences
                                </CardTitle>
                                <p className="text-gray-600 text-sm">Edit conference names and tier levels</p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {conferences.map((conf) => (
                                        <ConferenceEditCard key={conf.conference_id} conference={conf} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="seasons" className="space-y-6">
                        {loadingSeasons ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    Loading seasons...
                                </div>
                            </div>
                        ) : seasonError ? (
                            <Card className="border-red-200 bg-red-50">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 text-red-700">
                                        <AlertCircle className="h-5 w-5" />
                                        Error: {seasonError}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {/* Season Actions */}
                                <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-2xl font-bold mb-2">Season Management</h2>
                                                <p className="text-blue-100">Create new seasons or manage existing ones</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button 
                                                    onClick={handleCreateSeason} 
                                                    disabled={creating} 
                                                    variant="secondary"
                                                    className="bg-white/20 hover:bg-white/30 border-white/30"
                                                >
                                                    {creating ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Zap className="h-4 w-4 mr-2" />
                                                            Add New Season
                                                        </>
                                                    )}
                                                </Button>
                                                <Button 
                                                    onClick={handleDeleteLatestSeason} 
                                                    disabled={creating || !seasons.length} 
                                                    variant="destructive"
                                                    className="bg-red-500/20 hover:bg-red-500/30 border-red-500/30"
                                                >
                                                    Delete Latest Season
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Season History */}
                                <div className="grid gap-6">
                                    {seasons.map((season: any) => {
                                        const details = seasonDetails[season.season_id];
                                        return (
                                            <SeasonCard key={season.season_id} season={season} details={details} />
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function TeamEditCard({ team, conferences }: { team: any, conferences: any[] }) {
    const [editTeam, setEditTeam] = React.useState({ ...team });
    const [saving, setSaving] = React.useState(false);
    const [success, setSuccess] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditTeam({ ...editTeam, [name]: name === 'primary_conference_id' ? Number(value) : value });
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(null);
        setError(null);
        try {
            await fetch(`${API_BASE_URL}/teams/` + editTeam.team_id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editTeam.name,
                    logo_url: editTeam.logo_url,
                    prestige: editTeam.prestige,
                    primary_conference_id: editTeam.primary_conference_id
                }),
            });
            setSuccess('Team updated successfully!');
        } catch (err: any) {
            setError('Failed to update team.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white/50 backdrop-blur-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
                {editTeam.logo_url && (
                    <img src={editTeam.logo_url} alt={editTeam.name} className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">{editTeam.name}</h3>
                    <p className="text-sm text-gray-600">Team ID: {editTeam.team_id}</p>
                </div>
                {editTeam.is_user_controlled && (
                    <Badge variant="default" className="bg-blue-100 text-blue-700">
                        <Target className="h-3 w-3 mr-1" />
                        Your Team
                    </Badge>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`name-${editTeam.team_id}`}>Team Name</Label>
                    <Input
                        id={`name-${editTeam.team_id}`}
                        name="name"
                        value={editTeam.name || ''}
                        onChange={handleChange}
                        placeholder="Enter team name"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor={`conference-${editTeam.team_id}`}>Conference</Label>
                    <select
                        id={`conference-${editTeam.team_id}`}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        name="primary_conference_id"
                        value={editTeam.primary_conference_id || ''}
                        onChange={handleChange}
                    >
                        <option value="">Select conference</option>
                        {conferences.map((conf) => (
                            <option key={conf.conference_id} value={conf.conference_id}>{conf.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor={`logo-${editTeam.team_id}`}>Logo URL</Label>
                    <Input
                        id={`logo-${editTeam.team_id}`}
                        name="logo_url"
                        value={editTeam.logo_url || ''}
                        onChange={handleChange}
                        placeholder="https://example.com/logo.png"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor={`prestige-${editTeam.team_id}`}>Prestige</Label>
                    <Input
                        id={`prestige-${editTeam.team_id}`}
                        name="prestige"
                        value={editTeam.prestige || ''}
                        onChange={handleChange}
                        placeholder="Enter prestige rating"
                    />
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
                
                {success && (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}

function ConferenceEditCard({ conference }: { conference: any }) {
    const [editConf, setEditConf] = React.useState({ ...conference });
    const [saving, setSaving] = React.useState(false);
    const [success, setSuccess] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditConf({ ...editConf, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(null);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/conferences/` + editConf.conference_id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editConf),
            });
            if (!res.ok) throw new Error('Failed to update conference');
            setSuccess('Conference updated successfully!');
        } catch (err: any) {
            setError('Failed to update conference.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white/50 backdrop-blur-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-lg">{editConf.name}</h3>
                    <p className="text-sm text-gray-600">Conference ID: {editConf.conference_id}</p>
                </div>
                <Badge variant="outline" className="text-sm">
                    Tier {editConf.tier}
                </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`conf-name-${editConf.conference_id}`}>Conference Name</Label>
                    <Input
                        id={`conf-name-${editConf.conference_id}`}
                        name="name"
                        value={editConf.name || ''}
                        onChange={handleChange}
                        placeholder="Enter conference name"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor={`conf-tier-${editConf.conference_id}`}>Tier Level</Label>
                    <Input
                        id={`conf-tier-${editConf.conference_id}`}
                        name="tier"
                        type="number"
                        min={1}
                        max={5}
                        value={editConf.tier || ''}
                        onChange={handleChange}
                        placeholder="1-5"
                    />
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
                
                {success && (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}

function SeasonCard({ season, details }: { season: any, details?: Team }) {
    return (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-3xl font-bold mb-2">{season.year} Season</CardTitle>
                        <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-lg px-4 py-2">
                                {details ? `${details.wins}-${details.losses}` : "-"}
                            </Badge>
                            <Badge variant="outline" className="border-white/50 text-white">
                                {details?.conference_name || "-"}
                            </Badge>
                            <Badge variant="default" className="bg-yellow-500/20 text-yellow-100 border-yellow-500/30">
                                {details?.final_rank ? `#${details.final_rank} Ranked` : "Unranked"}
                            </Badge>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="h-5 w-5 text-yellow-300" />
                            <span className="font-bold text-xl">{details?.prestige || "-"}</span>
                        </div>
                        <p className="text-blue-100 text-sm">Prestige Rating</p>
                    </div>
                </div>
            </div>
            
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-red-600">
                            <Sword className="h-5 w-5" />
                            Offense
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Offensive PPG:</span>
                                <span className="font-medium">{details?.off_ppg?.toFixed(1) ?? "-"}</span>
                                {details?.off_ppg_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.off_ppg_rank}</Badge>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span>Passing Yards:</span>
                                <span className="font-medium">{details?.pass_yards ?? "-"}</span>
                                {details?.pass_yards_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.pass_yards_rank}</Badge>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span>Rushing Yards:</span>
                                <span className="font-medium">{details?.rush_yards ?? "-"}</span>
                                {details?.rush_yards_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.rush_yards_rank}</Badge>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span>Offensive Yards:</span>
                                <span className="font-medium">{details?.offense_yards ?? "-"}</span>
                                {details?.offense_yards_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.offense_yards_rank}</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-blue-600">
                            <Shield className="h-5 w-5" />
                            Defense
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Defensive PPG:</span>
                                <span className="font-medium">{details?.def_ppg?.toFixed(1) ?? "-"}</span>
                                {details?.def_ppg_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.def_ppg_rank}</Badge>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span>Total Sacks:</span>
                                <span className="font-medium">{details?.sacks ?? "-"}</span>
                                {details?.sacks_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.sacks_rank}</Badge>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span>Interceptions:</span>
                                <span className="font-medium">{details?.interceptions ?? "-"}</span>
                                {details?.interceptions_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.interceptions_rank}</Badge>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span>Defensive Yards:</span>
                                <span className="font-medium">{details?.defense_yards ?? "-"}</span>
                                {details?.defense_yards_rank && (
                                    <Badge variant="outline" className="text-xs">#{details.defense_yards_rank}</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-yellow-600">
                            <Trophy className="h-5 w-5" />
                            Achievements
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Conference Record:</span>
                                <span className="font-medium">
                                    {details?.conference_wins ?? 0}-{details?.conference_losses ?? 0}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Points For:</span>
                                <span className="font-medium">{details?.points_for ?? "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Points Against:</span>
                                <span className="font-medium">{details?.points_against ?? "-"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-green-600">
                            <Target className="h-5 w-5" />
                            Recruiting
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Class Rank:</span>
                                <span className="font-medium">
                                    {details?.recruiting_rank ? `#${details.recruiting_rank}` : "-"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Team Rating:</span>
                                <span className="font-medium">{details?.team_rating ?? "-"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                    <Link href={`/games?season=${season.season_id}`} passHref legacyBehavior>
                        <Button asChild variant="outline" className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700">
                            <span className="flex items-center gap-2">
                                <ArrowUpRight className="h-4 w-4" />
                                View Games
                            </span>
                        </Button>
                    </Link>
                    <Link href={`/players?season=${season.season_id}`} passHref legacyBehavior>
                        <Button asChild variant="outline" className="flex-1">
                            <span className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                View Roster
                            </span>
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
} 