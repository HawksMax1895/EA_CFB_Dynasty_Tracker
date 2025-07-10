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
  Loader2,
  Plus,
  Search,
  Filter,
  ChevronsUpDown,
  Check
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { fetchSeasons, createSeason, fetchTeamsBySeason, deleteSeason, fetchTeams, setUserControlledTeam, API_BASE_URL, fetchAwards, createAward, updateAward, deleteAward, fetchHonorTypes, createHonorType, updateHonorType, deleteHonorType } from "@/lib/api";
import { useSeason } from "@/context/SeasonContext";
import { Team } from "@/types";
import Link from "next/link";
import { useMemo } from "react";
import { Tabs as SubTabs, TabsList as SubTabsList, TabsTrigger as SubTabsTrigger, TabsContent as SubTabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from "@/components/ui/command";

// Add a helper for ordinal
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

      const [teams, setTeams] = useState<Team[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    
    // Search and filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"all" | "teams" | "conferences">("all");
    const [selectedConference, setSelectedConference] = useState<string>("all");
    
    // Awards state
    const [awards, setAwards] = useState<Award[]>([]);
    const [loadingAwards, setLoadingAwards] = useState(true);
    const [awardError, setAwardError] = useState<string | null>(null);

    // Add state for honor types
    const [honorTypes, setHonorTypes] = useState<HonorType[]>([]);
    const [loadingHonorTypes, setLoadingHonorTypes] = useState(true);
    const [honorTypeError, setHonorTypeError] = useState<string | null>(null);

    const [editItem, setEditItem] = useState<any | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState<any>({ type: '', name: '', description: '', side: 'none', conference_id: 'none' });
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);
    const [filterTypePopoverOpen, setFilterTypePopoverOpen] = useState(false);
    const [selectedConferencePopoverOpen, setSelectedConferencePopoverOpen] = useState(false);
    const [addTypePopoverOpen, setAddTypePopoverOpen] = useState(false);
    const [addSidePopoverOpen, setAddSidePopoverOpen] = useState(false);
    const [addConferencePopoverOpen, setAddConferencePopoverOpen] = useState(false);
    const [editSidePopoverOpen, setEditSidePopoverOpen] = useState(false);
    const [editConferencePopoverOpen, setEditConferencePopoverOpen] = useState(false);

    useEffect(() => {
        setLoadingTeams(true);
        Promise.all([
            fetchTeams(),
            fetch(`${API_BASE_URL}/conferences`).then(res => res.json())
        ]).then(([teamsData, conferencesData]) => {
            setTeams(teamsData);
            setConferences(conferencesData);
            const userTeam = teamsData.find((t: Team) => t.is_user_controlled);
            setSelectedTeam(userTeam ? userTeam.team_id : null);
            setLoadingTeams(false);
        });
    }, []);

    useEffect(() => {
        const fetchAwardsData = async () => {
            setLoadingAwards(true);
            try {
                const awardsData = await fetchAwards();
                setAwards(awardsData);
            } catch (err: any) {
                setAwardError(err.message);
            } finally {
                setLoadingAwards(false);
            }
        };
        fetchAwardsData();
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
                    const userTeam = teams.find((t: Team) => t.is_user_controlled); 
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

    useEffect(() => {
        // Fetch honor types
        setLoadingHonorTypes(true);
        fetchHonorTypes()
            .then(setHonorTypes)
            .catch(e => setHonorTypeError(e.message))
            .finally(() => setLoadingHonorTypes(false));
    }, []);

    // Filtered data based on search and filters
    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesConference = selectedConference === "all" || 
                team.primary_conference_id?.toString() === selectedConference;
            return matchesSearch && matchesConference;
        });
    }, [teams, searchTerm, selectedConference]);

    const filteredConferences = useMemo(() => {
        return conferences.filter(conf => 
            conf.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [conferences, searchTerm]);

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
      const latest = seasons[0];
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

    const handleEdit = (item: Award) => {
      setEditItem(item);
      setEditForm({
        type: item.type,
        name: item.name,
        description: item.description || '',
        side: item.side || 'none',
        conference_id: item.conference_id ? item.conference_id.toString() : 'none',
      });
      setEditModalOpen(true);
    };

    const handleEditSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingEdit(true);
      setEditError(null);
      try {
        if (editForm.type === 'Award') {
          await updateAward(editItem.award_id, editForm);
        } else {
          await updateHonorType(editItem.honor_id, editForm);
        }
        // Refresh data
        const [awardsData, honorTypesData] = await Promise.all([
          fetchAwards(),
          fetchHonorTypes()
        ]);
        setAwards(awardsData);
        setHonorTypes(honorTypesData);
        setEditModalOpen(false);
      } catch (err: any) {
        setEditError(err.message || 'Failed to update.');
      } finally {
        setSavingEdit(false);
      }
    };

    const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      setAdding(true);
      setAddError(null);
      try {
        if (addForm.type === 'Award') {
          await createAward(addForm);
        } else {
          await createHonorType(addForm);
        }
        // Refresh data
        const [awardsData, honorTypesData] = await Promise.all([
          fetchAwards(),
          fetchHonorTypes()
        ]);
        setAwards(awardsData);
        setHonorTypes(honorTypesData);
        setAddModalOpen(false);
        setAddForm({ type: '', name: '', description: '', side: 'none', conference_id: 'none' });
      } catch (err: any) {
        setAddError(err.message || 'Failed to add.');
      } finally {
        setAdding(false);
      }
    };

    const handleDeleteAward = async (awardId: number) => {
        if (!window.confirm("Are you sure you want to delete this award? This cannot be undone.")) return;
        setLoadingAwards(true);
        setAwardError(null);
        try {
            await deleteAward(awardId);
            const awardsData = await fetchAwards();
            setAwards(awardsData);
        } catch (err: any) {
            setAwardError(err.message);
        } finally {
            setLoadingAwards(false);
        }
    };

    // Add this handler for deleting honor types
    const handleDeleteHonorType = async (honorId: number) => {
        if (!window.confirm("Are you sure you want to delete this honor type? This cannot be undone.")) return;
        setLoadingHonorTypes(true);
        setHonorTypeError(null);
        try {
            await deleteHonorType(honorId);
            const honorTypesData = await fetchHonorTypes();
            setHonorTypes(honorTypesData);
        } catch (err: any) {
            setHonorTypeError(err.message);
        } finally {
            setLoadingHonorTypes(false);
        }
    };

    return (
        <>
            {/* Standardized Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground text-lg">Manage your dynasty configuration and preferences</p>
                </div>
            </div>

            <Tabs defaultValue="teams-conferences" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="teams-conferences">Teams & Conferences</TabsTrigger>
                    <TabsTrigger value="awards">Awards</TabsTrigger>
                    <TabsTrigger value="seasons">Seasons</TabsTrigger>
                </TabsList>

                <TabsContent value="teams-conferences" className="space-y-6">
                    {/* User Team Selection */}
                    <Card className="border-0 shadow-md bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Target className="h-5 w-5 text-primary" />
                                User-Controlled Team
                            </CardTitle>
                            <p className="text-muted-foreground text-sm">Select which team you want to control in your dynasty</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="user-team">Your Team</Label>
                                {loadingTeams ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading teams...
                                    </div>
                                ) : (
                                    <Popover open={teamPopoverOpen} onOpenChange={setTeamPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                role="combobox" 
                                                className="w-full justify-between"
                                                disabled={saving}
                                            >
                                                {selectedTeam ? (
                                                    <div className="flex items-center gap-2">
                                                        {teams.find(t => t.team_id === selectedTeam)?.logo_url && (
                                                            <Image src={teams.find(t => t.team_id === selectedTeam)?.logo_url || ''} alt={teams.find(t => t.team_id === selectedTeam)?.name || ''} width={24} height={24} className="w-6 h-6 rounded" />
                                                        )}
                                                        {teams.find(t => t.team_id === selectedTeam)?.name}
                                                    </div>
                                                ) : (
                                                    "Select your team"
                                                )}
                                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Search teams..." />
                                                <CommandList className="max-h-80 overflow-y-auto">
                                                    <CommandEmpty>No teams found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {teams.map((team) => (
                                                            <CommandItem
                                                                key={team.team_id}
                                                                value={team.team_id.toString()}
                                                                onSelect={() => {
                                                                    setSelectedTeam(team.team_id);
                                                                    setTeamPopoverOpen(false);
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {team.logo_url && (
                                                                        <Image src={team.logo_url} alt={team.name} width={24} height={24} className="w-6 h-6 rounded" />
                                                                    )}
                                                                    {team.name}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                                {saving && (
                                    <div className="flex items-center gap-2 text-primary">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </div>
                                )}
                                {message && (
                                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                                        message.includes('successfully') 
                                            ? 'bg-success/10 text-success border border-success/20' 
                                            : 'bg-destructive/10 text-destructive border border-destructive/20'
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

                    {/* Teams and Conferences Management */}
                    <Card className="border-0 shadow-md bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Building2 className="h-5 w-5 text-purple-600" />
                                Manage Teams & Conferences
                            </CardTitle>
                            <p className="text-muted-foreground text-sm">Edit team information, conferences, and prestige ratings</p>
                        </CardHeader>
                        <CardContent>
                            {/* Search and Filter Controls */}
                            <div className="mb-6 space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                        <Input
                                            placeholder="Search teams and conferences..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Popover open={filterTypePopoverOpen} onOpenChange={setFilterTypePopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    role="combobox" 
                                                    className="w-40 justify-between"
                                                    disabled={saving}
                                                >
                                                    {filterType === "all" ? "All" : filterType === "teams" ? "Teams Only" : "Conferences Only"}
                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Filter by..." />
                                                    <CommandList className="max-h-80 overflow-y-auto">
                                                        <CommandEmpty>No filter found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value="all"
                                                                onSelect={() => {
                                                                    setFilterType("all");
                                                                    setFilterTypePopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check className="mr-2 h-4 w-4" />
                                                                All
                                                            </CommandItem>
                                                            <CommandItem
                                                                value="teams"
                                                                onSelect={() => {
                                                                    setFilterType("teams");
                                                                    setFilterTypePopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check className="mr-2 h-4 w-4" />
                                                                Teams Only
                                                            </CommandItem>
                                                            <CommandItem
                                                                value="conferences"
                                                                onSelect={() => {
                                                                    setFilterType("conferences");
                                                                    setFilterTypePopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check className="mr-2 h-4 w-4" />
                                                                Conferences Only
                                                            </CommandItem>
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {filterType !== "conferences" && (
                                            <Popover open={selectedConferencePopoverOpen} onOpenChange={setSelectedConferencePopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        role="combobox" 
                                                        className="w-48 justify-between"
                                                        disabled={saving}
                                                    >
                                                        {selectedConference === "all" ? "All Conferences" : filteredConferences.find(conf => conf.conference_id.toString() === selectedConference)?.name || "Select conference"}
                                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Filter by conference..." />
                                                        <CommandList className="max-h-80 overflow-y-auto">
                                                            <CommandEmpty>No conference found.</CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    value="all"
                                                                    onSelect={() => {
                                                                        setSelectedConference("all");
                                                                        setSelectedConferencePopoverOpen(false);
                                                                    }}
                                                                >
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    All Conferences
                                                                </CommandItem>
                                                                {filteredConferences.map((conf) => (
                                                                    <CommandItem
                                                                        key={conf.conference_id}
                                                                        value={conf.conference_id.toString()}
                                                                        onSelect={() => {
                                                                            setSelectedConference(conf.conference_id.toString());
                                                                            setSelectedConferencePopoverOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check className="mr-2 h-4 w-4" />
                                                                        {conf.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Stats */}
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    <span>Teams: {filteredTeams.length}</span>
                                    <span>Conferences: {filteredConferences.length}</span>
                                    {searchTerm && <span>Search: &quot;{searchTerm}&quot;</span>}
                                </div>
                            </div>

                            {loadingTeams ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        Loading teams and conferences...
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Teams Grid */}
                                    {(filterType === "all" || filterType === "teams") && filteredTeams.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <Building2 className="h-5 w-5 text-purple-600" />
                                                Teams ({filteredTeams.length})
                                            </h3>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {filteredTeams.map((team) => (
                                                    <CompactTeamCard key={team.team_id} team={team} conferences={conferences} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Conferences Grid */}
                                    {(filterType === "all" || filterType === "conferences") && filteredConferences.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <Users className="h-5 w-5 text-green-600" />
                                                Conferences ({filteredConferences.length})
                                            </h3>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {filteredConferences.map((conf) => (
                                                    <CompactConferenceCard key={conf.conference_id} conference={conf} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Results */}
                                    {((filterType === "all" && filteredTeams.length === 0 && filteredConferences.length === 0) ||
                                      (filterType === "teams" && filteredTeams.length === 0) ||
                                      (filterType === "conferences" && filteredConferences.length === 0)) && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                                            <p>No {filterType === "all" ? "teams or conferences" : filterType} found matching your search.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="awards" className="space-y-6">
                    <Card className="border-0 shadow-md bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Trophy className="h-5 w-5 text-yellow-600" />
                                Manage Awards & Honors
                            </CardTitle>
                            <p className="text-muted-foreground text-sm">Create, edit, and delete awards and honor types (e.g., All-American, Player of the Week)</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-end mb-2">
                                    <Button onClick={() => setAddModalOpen(true)} variant="default">+ Add Award/Honor</Button>
                                </div>
                                {/* Combined list of awards and honors */}
                                {[...awards.map(a => ({ ...a, type: 'Award' })), ...honorTypes.map(h => ({ ...h, type: 'Honor' }))]
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((item: any) => (
                                    <div key={item.award_id || item.honor_id} className="flex items-center gap-4 p-2 border rounded">
                                      <div className="flex-1">
                                        <div className="font-medium flex items-center gap-2">
                                          <span>{item.name}</span>
                                          <Badge variant={item.type === 'Award' ? 'accent' : 'default'}>{item.type}</Badge>
                                        </div>
                                        {item.type === 'Honor' && (
                                          <div className="text-sm text-muted-foreground">Side: {item.side || 'N/A'} | Conference: {item.conference_id || 'N/A'}</div>
                                        )}
                                        {item.type === 'Award' && (
                                          <div className="text-sm text-muted-foreground">{item.description}</div>
                                        )}
                                      </div>
                                      <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>Edit</Button>
                                      {item.type === 'Honor' && (
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteHonorType(item.honor_id)}>
                                          Delete
                                        </Button>
                                      )}
                                      {item.type === 'Award' && (
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteAward(item.award_id)}>
                                          Delete
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                {/* Add Award/Honor Modal */}
                                <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                                    <DialogContent className="max-w-lg w-full">
                                        <DialogHeader>
                                            <DialogTitle>Add Award or Honor</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleAdd} className="space-y-4">
                                            <div>
                                                <label className="block mb-1 font-medium">Type</label>
                                                <Popover open={addTypePopoverOpen} onOpenChange={setAddTypePopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            role="combobox" 
                                                            className="w-full justify-between"
                                                            disabled={adding}
                                                        >
                                                            {addForm.type === 'Award' ? 'Award' : 'Honor'}
                                                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-full p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Type..." />
                                                            <CommandList className="max-h-80 overflow-y-auto">
                                                                <CommandEmpty>No type found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        value="Award"
                                                                        onSelect={() => {
                                                                            setAddForm((f: any) => ({ ...f, type: 'Award' }));
                                                                            setAddTypePopoverOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check className="mr-2 h-4 w-4" />
                                                                        Award
                                                                    </CommandItem>
                                                                    <CommandItem
                                                                        value="Honor"
                                                                        onSelect={() => {
                                                                            setAddForm((f: any) => ({ ...f, type: 'Honor' }));
                                                                            setAddTypePopoverOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check className="mr-2 h-4 w-4" />
                                                                        Honor
                                                                    </CommandItem>
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div>
                                                <label className="block mb-1 font-medium">Name</label>
                                                <Input value={addForm.name} onChange={e => setAddForm((f: any) => ({ ...f, name: e.target.value }))} required />
                                            </div>
                                            {addForm.type === 'Award' && (
                                                <div>
                                                    <label className="block mb-1 font-medium">Description</label>
                                                    <Input value={addForm.description} onChange={e => setAddForm((f: any) => ({ ...f, description: e.target.value }))} />
                                                </div>
                                            )}
                                            {addForm.type === 'Honor' && (
                                                <>
                                                    <div>
                                                        <label className="block mb-1 font-medium">Side</label>
                                                        <Popover open={addSidePopoverOpen} onOpenChange={setAddSidePopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button 
                                                                    variant="outline" 
                                                                    role="combobox" 
                                                                    className="w-full justify-between"
                                                                    disabled={adding}
                                                                >
                                                                    {addForm.side === 'none' ? 'None' : addForm.side === 'offense' ? 'Offense' : 'Defense'}
                                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-full p-0">
                                                                <Command>
                                                                    <CommandInput placeholder="Side..." />
                                                                    <CommandList className="max-h-80 overflow-y-auto">
                                                                        <CommandEmpty>No side found.</CommandEmpty>
                                                                        <CommandGroup>
                                                                            <CommandItem
                                                                                value="none"
                                                                                onSelect={() => {
                                                                                    setAddForm((f: any) => ({ ...f, side: 'none' }));
                                                                                    setAddSidePopoverOpen(false);
                                                                                }}
                                                                            >
                                                                                <Check className="mr-2 h-4 w-4" />
                                                                                None
                                                                            </CommandItem>
                                                                            <CommandItem
                                                                                value="offense"
                                                                                onSelect={() => {
                                                                                    setAddForm((f: any) => ({ ...f, side: 'offense' }));
                                                                                    setAddSidePopoverOpen(false);
                                                                                }}
                                                                            >
                                                                                <Check className="mr-2 h-4 w-4" />
                                                                                Offense
                                                                            </CommandItem>
                                                                            <CommandItem
                                                                                value="defense"
                                                                                onSelect={() => {
                                                                                    setAddForm((f: any) => ({ ...f, side: 'defense' }));
                                                                                    setAddSidePopoverOpen(false);
                                                                                }}
                                                                            >
                                                                                <Check className="mr-2 h-4 w-4" />
                                                                                Defense
                                                                            </CommandItem>
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div>
                                                        <label className="block mb-1 font-medium">Conference</label>
                                                        <Popover open={addConferencePopoverOpen} onOpenChange={setAddConferencePopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button 
                                                                    variant="outline" 
                                                                    role="combobox" 
                                                                    className="w-full justify-between"
                                                                    disabled={adding}
                                                                >
                                                                    {addForm.conference_id === 'none' ? 'None' : conferences.find(conf => conf.conference_id.toString() === addForm.conference_id)?.name || 'Select conference'}
                                                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-full p-0">
                                                                <Command>
                                                                    <CommandInput placeholder="Conference..." />
                                                                    <CommandList className="max-h-80 overflow-y-auto">
                                                                        <CommandEmpty>No conference found.</CommandEmpty>
                                                                        <CommandGroup>
                                                                            <CommandItem
                                                                                value="none"
                                                                                onSelect={() => {
                                                                                    setAddForm((f: any) => ({ ...f, conference_id: 'none' }));
                                                                                    setAddConferencePopoverOpen(false);
                                                                                }}
                                                                            >
                                                                                <Check className="mr-2 h-4 w-4" />
                                                                                None
                                                                            </CommandItem>
                                                                            {conferences.map((conf: any) => (
                                                                                <CommandItem
                                                                                    key={conf.conference_id}
                                                                                    value={conf.conference_id.toString()}
                                                                                    onSelect={() => {
                                                                                        setAddForm((f: any) => ({ ...f, conference_id: conf.conference_id.toString() }));
                                                                                        setAddConferencePopoverOpen(false);
                                                                                    }}
                                                                                >
                                                                                    <Check className="mr-2 h-4 w-4" />
                                                                                    {conf.name}
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </>
                                            )}
                                            {addError && <div className="text-destructive text-sm">{addError}</div>}
                                            <DialogFooter>
                                                <Button type="submit" disabled={adding}>{adding ? 'Adding...' : 'Add'}</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="seasons" className="space-y-6">
                    {loadingSeasons ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                Loading seasons...
                            </div>
                        </div>
                    ) : seasonError ? (
                        <Card className="border-destructive/20 bg-destructive/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-destructive">
                                    <AlertCircle className="h-5 w-5" />
                                    Error: {seasonError}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {/* Season Actions */}
                            <Card className="border-0 shadow-md bg-card">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-2 text-foreground">Season Management</h2>
                                            <p className="text-muted-foreground">Create new seasons or manage existing ones</p>
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
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-lg w-full">
                    <DialogHeader>
                        <DialogTitle>Edit {editItem?.type}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSave} className="space-y-4">
                        <div>
                            <label className="block mb-1 font-medium">Name</label>
                            <Input value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} required />
                        </div>
                        {editItem?.type === 'Award' && (
                            <div>
                                <label className="block mb-1 font-medium">Description</label>
                                <Input value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} />
                            </div>
                        )}
                        {editItem?.type === 'Honor' && (
                            <>
                                <div>
                                    <label className="block mb-1 font-medium">Side</label>
                                    <Popover open={editSidePopoverOpen} onOpenChange={setEditSidePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                role="combobox" 
                                                className="w-full justify-between"
                                                disabled={savingEdit}
                                            >
                                                {editForm.side === 'none' ? 'None' : editForm.side === 'offense' ? 'Offense' : 'Defense'}
                                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Side..." />
                                                <CommandList className="max-h-80 overflow-y-auto">
                                                    <CommandEmpty>No side found.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value="none"
                                                            onSelect={() => {
                                                                setEditForm((f: any) => ({ ...f, side: 'none' }));
                                                                setEditSidePopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4" />
                                                            None
                                                        </CommandItem>
                                                        <CommandItem
                                                            value="offense"
                                                            onSelect={() => {
                                                                setEditForm((f: any) => ({ ...f, side: 'offense' }));
                                                                setEditSidePopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4" />
                                                            Offense
                                                        </CommandItem>
                                                        <CommandItem
                                                            value="defense"
                                                            onSelect={() => {
                                                                setEditForm((f: any) => ({ ...f, side: 'defense' }));
                                                                setEditSidePopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4" />
                                                            Defense
                                                        </CommandItem>
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">Conference</label>
                                    <Popover open={editConferencePopoverOpen} onOpenChange={setEditConferencePopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                role="combobox" 
                                                className="w-full justify-between"
                                                disabled={savingEdit}
                                            >
                                                {editForm.conference_id === 'none' ? 'None' : conferences.find(conf => conf.conference_id.toString() === editForm.conference_id)?.name || 'Select conference'}
                                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Conference..." />
                                                <CommandList className="max-h-80 overflow-y-auto">
                                                    <CommandEmpty>No conference found.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value="none"
                                                            onSelect={() => {
                                                                setEditForm((f: any) => ({ ...f, conference_id: 'none' }));
                                                                setEditConferencePopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4" />
                                                            None
                                                        </CommandItem>
                                                        {conferences.map((conf: any) => (
                                                            <CommandItem
                                                                key={conf.conference_id}
                                                                value={conf.conference_id.toString()}
                                                                onSelect={() => {
                                                                    setEditForm((f: any) => ({ ...f, conference_id: conf.conference_id.toString() }));
                                                                    setEditConferencePopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check className="mr-2 h-4 w-4" />
                                                                {conf.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </>
                        )}
                        {editError && <div className="text-destructive text-sm">{editError}</div>}
                        <DialogFooter>
                            <Button type="submit" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CompactTeamCard({ team, conferences }: { team: Team, conferences: Conference[] }) {
    const [editTeam, setEditTeam] = React.useState({ ...team });
    const [saving, setSaving] = React.useState(false);
    const [success, setSuccess] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isExpanded, setIsExpanded] = React.useState(false);

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
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError('Failed to update team.');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const conference = conferences.find(c => c.conference_id === editTeam.primary_conference_id);

    return (
        <Card className="border border-card bg-card hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    {editTeam.logo_url && (
                        <Image src={editTeam.logo_url} alt={editTeam.name} width={32} height={32} className="w-8 h-8 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{editTeam.name}</h3>
                        <p className="text-xs text-muted-foreground">ID: {editTeam.team_id}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {editTeam.is_user_controlled && (
                            <Badge variant="default" className="text-xs bg-primary/10 text-primary">
                                <Target className="h-3 w-3" />
                            </Badge>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-6 w-6 p-0"
                        >
                            {isExpanded ? "−" : "+"}
                        </Button>
                    </div>
                </div>

                {/* Quick Info */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                    <Badge variant="outline" className="text-xs">
                        {conference?.name || "No Conference"}
                    </Badge>
                    {editTeam.prestige && (
                        <Badge variant="secondary" className="text-xs">
                            {editTeam.prestige}
                        </Badge>
                    )}
                </div>

                {/* Expanded Form */}
                {isExpanded && (
                    <div className="space-y-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor={`name-${editTeam.team_id}`} className="text-xs">Name</Label>
                                <Input
                                    id={`name-${editTeam.team_id}`}
                                    name="name"
                                    value={editTeam.name || ''}
                                    onChange={handleChange}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`conference-${editTeam.team_id}`} className="text-xs">Conference</Label>
                                <select
                                    id={`conference-${editTeam.team_id}`}
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor={`logo-${editTeam.team_id}`} className="text-xs">Logo URL</Label>
                                <Input
                                    id={`logo-${editTeam.team_id}`}
                                    name="logo_url"
                                    value={editTeam.logo_url || ''}
                                    onChange={handleChange}
                                    className="h-8 text-sm"
                                    placeholder="Logo URL"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`prestige-${editTeam.team_id}`} className="text-xs">Prestige</Label>
                                <Input
                                    id={`prestige-${editTeam.team_id}`}
                                    name="prestige"
                                    value={editTeam.prestige || ''}
                                    onChange={handleChange}
                                    className="h-8 text-sm"
                                    placeholder="Prestige"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <Button 
                                onClick={handleSave} 
                                disabled={saving} 
                                size="sm"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Save
                                    </>
                                )}
                            </Button>
                            
                            {(success || error) && (
                                <div className={`flex items-center gap-1 text-xs ${
                                    success ? 'text-success bg-success/10 border border-success/20 rounded px-2 py-1' : 'text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1'
                                }`}>
                                    {success ? (
                                        <CheckCircle className="h-3 w-3" />
                                    ) : (
                                        <AlertCircle className="h-3 w-3" />
                                    )}
                                    {success || error}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function CompactConferenceCard({ conference }: { conference: Conference }) {
    const [editConf, setEditConf] = React.useState({ ...conference });
    const [saving, setSaving] = React.useState(false);
    const [success, setSuccess] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isExpanded, setIsExpanded] = React.useState(false);

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
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError('Failed to update conference.');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="border border-card bg-card hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{editConf.name}</h3>
                        <p className="text-xs text-muted-foreground">ID: {editConf.conference_id}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                            Tier {editConf.tier}
                        </Badge>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-6 w-6 p-0"
                        >
                            {isExpanded ? "−" : "+"}
                        </Button>
                    </div>
                </div>

                {/* Expanded Form */}
                {isExpanded && (
                    <div className="space-y-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor={`conf-name-${editConf.conference_id}`} className="text-xs">Name</Label>
                                <Input
                                    id={`conf-name-${editConf.conference_id}`}
                                    name="name"
                                    value={editConf.name || ''}
                                    onChange={handleChange}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`conf-tier-${editConf.conference_id}`} className="text-xs">Tier</Label>
                                <Input
                                    id={`conf-tier-${editConf.conference_id}`}
                                    name="tier"
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={editConf.tier || ''}
                                    onChange={handleChange}
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <Button 
                                onClick={handleSave} 
                                disabled={saving} 
                                size="sm"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Save
                                    </>
                                )}
                            </Button>
                            
                            {(success || error) && (
                                <div className={`flex items-center gap-1 text-xs ${
                                    success ? 'text-success bg-success/10 border border-success/20 rounded px-2 py-1' : 'text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1'
                                }`}>
                                    {success ? (
                                        <CheckCircle className="h-3 w-3" />
                                    ) : (
                                        <AlertCircle className="h-3 w-3" />
                                    )}
                                    {success || error}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SeasonCard({ season, details }: { season: Season, details?: Team }) {
    return (
        <Card className="border-0 shadow-md bg-card hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="bg-card p-6 border-b border-card">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-3xl font-bold mb-2 text-foreground">{season.year} Season</CardTitle>
                        <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="bg-muted text-foreground border-card text-lg px-4 py-2">
                                {details ? `${details.wins}-${details.losses}` : "-"}
                            </Badge>
                            <Badge variant="outline" className="border-card text-muted-foreground">
                                {details?.conference_name || "-"}
                            </Badge>
                            <Badge variant="default" className="bg-yellow-500/20 text-yellow-900 border-yellow-500/30">
                                {details?.final_rank ? `#${details.final_rank} Ranked` : "Unranked"}
                            </Badge>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="h-5 w-5 text-yellow-400" />
                            <span className="font-bold text-xl text-foreground">{details?.prestige || "-"}</span>
                        </div>
                        <p className="text-muted-foreground text-sm">Prestige Rating</p>
                    </div>
                </div>
            </div>
            
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-destructive">
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
                        <h4 className="font-semibold flex items-center gap-2 text-primary">
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
                        <h4 className="font-semibold flex items-center gap-2 text-yellow-700">
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
                        <h4 className="font-semibold flex items-center gap-2 text-success">
                            <Users className="h-5 w-5" />
                            Teamwork
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

                <div className="mt-6 pt-6 border-t border-card flex gap-3">
                    <Link href={`/games?season=${season.season_id}`} passHref legacyBehavior>
                        <Button asChild variant="outline" className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-500/10">
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

function TeamEditCard({ team, conferences }: { team: Team, conferences: Conference[] }) {
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
        <div className="border border-card rounded-lg p-4 bg-card hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
                {editTeam.logo_url && (
                    <Image src={editTeam.logo_url} alt={editTeam.name} width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">{editTeam.name}</h3>
                    <p className="text-sm text-muted-foreground">Team ID: {editTeam.team_id}</p>
                </div>
                {editTeam.is_user_controlled && (
                    <Badge variant="default" className="text-xs bg-primary/10 text-primary">
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
                <Button onClick={handleSave} disabled={saving}>
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

function ConferenceEditCard({ conference }: { conference: Conference }) {
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
        <div className="border border-card rounded-lg p-4 bg-card hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-lg">{editConf.name}</h3>
                    <p className="text-sm text-muted-foreground">Conference ID: {editConf.conference_id}</p>
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
                <Button onClick={handleSave} disabled={saving}>
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