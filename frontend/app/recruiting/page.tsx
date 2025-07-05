"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, GraduationCap, Building2, Pencil, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchRecruitingClass, addRecruitingClass, fetchTransferPortal, addTransferPortal, updateTeamSeason, fetchTeamsBySeason, updateRecruit, deleteRecruit, updateTransfer, deleteTransfer, fetchTeams } from "@/lib/api";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecruitCard } from "@/components/RecruitCard";
import { TransferCard } from "@/components/TransferCard";
import { AddRecruitModal } from "@/components/AddRecruitModal";
import { AddTransferModal } from "@/components/AddTransferModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useSeason } from "@/context/SeasonContext";

export default function RecruitingPage() {
  const { selectedSeason, userTeam, seasons } = useSeason();
  const teamId = userTeam?.team_id;
  const seasonId = selectedSeason;
  const seasonYear = seasons.find(s => s.season_id === selectedSeason)?.year || seasonId;
  const [recruits, setRecruits] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recruitForm, setRecruitForm] = useState({
    name: '',
    position: '',
    recruit_stars: 3,
    recruit_rank_nat: 0,
    recruit_rank_pos: 0,
    speed: '',
    dev_trait: '',
    height: '',
    weight: '',
    state: ''
  });
  const [transferForm, setTransferForm] = useState({
    name: '',
    position: '',
    previous_school: '',
    ovr_rating: '',
    recruit_stars: 3,
    recruit_rank_pos: 0,
    dev_trait: '',
    height: '',
    weight: '',
    state: '',
    current_status: 'SO'
  });
  const [recruitFormLoading, setRecruitFormLoading] = useState(false);
  const [transferFormLoading, setTransferFormLoading] = useState(false);
  const [recruitFormError, setRecruitFormError] = useState<string | null>(null);
  const [transferFormError, setTransferFormError] = useState<string | null>(null);
  const [recruitingRank, setRecruitingRank] = useState<number | null>(null);
  const [recruitingRankLoading, setRecruitingRankLoading] = useState(false);
  const [editingRecruitingRank, setEditingRecruitingRank] = useState(false);
  const [editingRecruit, setEditingRecruit] = useState<any>(null);
  const [editingTransfer, setEditingTransfer] = useState<any>(null);
  const [transferSchoolOpen, setTransferSchoolOpen] = useState(false);
  const [transferSchools, setTransferSchools] = useState<Array<{ id: number; name: string; abbreviation?: string }>>([]);
  const [transferSchoolsLoading, setTransferSchoolsLoading] = useState(false);

  useEffect(() => {
    if (!seasonId || !teamId) return;
    setLoading(true);
    Promise.all([
      fetchRecruitingClass(Number(teamId || 0), seasonId),
      fetchTransferPortal(Number(teamId || 0), seasonId),
      fetchTeamsBySeason(seasonId)
    ])
      .then(([recruitData, transferData, teamsData]) => {
        setRecruits(recruitData);
        setTransfers(transferData);
        const userTeam = teamsData.find((t: any) => t.team_id === teamId);
        setRecruitingRank(userTeam?.recruiting_rank ?? null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [teamId, seasonId]);

  const handleRecruitFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setRecruitForm({ ...recruitForm, [e.target.name]: e.target.value });
  };

  const handleTransferFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTransferForm({ ...transferForm, [e.target.name]: e.target.value });
  };

  const handleAddRecruit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId || teamId === undefined) return;
    setRecruitFormLoading(true);
    setRecruitFormError(null);
    try {
      await addRecruitingClass({ team_id: Number(teamId), season_id: seasonId, recruits: [recruitForm] });
      setRecruitForm({ name: '', position: '', recruit_stars: 3, recruit_rank_nat: 0, recruit_rank_pos: 0, speed: '', dev_trait: '', height: '', weight: '', state: '' });
      const data = await fetchRecruitingClass(Number(teamId || 0), seasonId);
      setRecruits(data);
    } catch (err: any) {
      setRecruitFormError(err.message);
    } finally {
      setRecruitFormLoading(false);
    }
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId || teamId === undefined) return;
    setTransferFormLoading(true);
    setTransferFormError(null);
    try {
      await addTransferPortal({ team_id: Number(teamId), season_id: seasonId, transfers: [transferForm] });
      setTransferForm({ 
        name: '', 
        position: '', 
        previous_school: '', 
        ovr_rating: '', 
        recruit_stars: 3, 
        recruit_rank_pos: 0, 
        dev_trait: '', 
        height: '', 
        weight: '', 
        state: '', 
        current_status: 'SO' 
      });
      const data = await fetchTransferPortal(Number(teamId || 0), seasonId);
      setTransfers(data);
    } catch (err: any) {
      setTransferFormError(err.message);
    } finally {
      setTransferFormLoading(false);
    }
  };

  const handleRecruitingRankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecruitingRank(e.target.value === '' ? null : parseInt(e.target.value));
  };

  const handleRecruitingRankClick = () => {
    setEditingRecruitingRank(true);
  };

  const handleRecruitingRankInputBlur = async () => {
    setEditingRecruitingRank(false);
    if (recruitingRank == null || !seasonId) return;
    setRecruitingRankLoading(true);
    try {
      await updateTeamSeason(seasonId, teamId, { recruiting_rank: recruitingRank });
    } finally {
      setRecruitingRankLoading(false);
    }
  };

  const handleRecruitingRankInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditingRecruitingRank(false);
    }
  };

  const handleEditRecruit = (recruit: any) => {
    setEditingRecruit({
      recruit_id: recruit.recruit_id,
      name: recruit.name,
      position: recruit.position,
      recruit_stars: recruit.recruit_stars || 3,
      recruit_rank_nat: recruit.recruit_rank_nat || 0,
      recruit_rank_pos: recruit.recruit_rank_pos || 0,
      speed: recruit.speed || '',
      dev_trait: recruit.dev_trait || '',
      height: recruit.height || '',
      weight: recruit.weight || '',
      state: recruit.state || ''
    });
  };

  const handleEditTransfer = (transfer: any) => {
    setEditingTransfer({
      transfer_id: transfer.transfer_id,
      name: transfer.name,
      position: transfer.position,
      previous_school: transfer.previous_school || '',
      ovr_rating: transfer.ovr_rating || '',
      recruit_stars: transfer.recruit_stars || 3,
      recruit_rank_pos: transfer.recruit_rank_pos || 0,
      dev_trait: transfer.dev_trait || '',
      height: transfer.height || '',
      weight: transfer.weight || '',
      state: transfer.state || '',
      current_status: transfer.current_status || 'SO'
    });
    // Load schools when editing transfer
    if (transferSchools.length === 0) {
      loadTransferSchools();
    }
  };

  const handleDeleteRecruit = async (recruitId: number) => {
    if (!seasonId) return;
    if (confirm('Are you sure you want to delete this recruit?')) {
      try {
        await deleteRecruit(recruitId);
        const data = await fetchRecruitingClass(Number(teamId || 0), seasonId);
        setRecruits(data);
      } catch (err: any) {
        console.error('Failed to delete recruit:', err);
      }
    }
  };

  const handleDeleteTransfer = async (transferId: number) => {
    if (!seasonId) return;
    if (confirm('Are you sure you want to delete this transfer?')) {
      try {
        await deleteTransfer(transferId);
        const data = await fetchTransferPortal(Number(teamId || 0), seasonId);
        setTransfers(data);
      } catch (err: any) {
        console.error('Failed to delete transfer:', err);
      }
    }
  };

  const loadTransferSchools = async () => {
    console.log("Loading transfer schools...");
    setTransferSchoolsLoading(true);
    try {
      const teamsData = await fetchTeams();
      console.log("Loaded teams data:", teamsData);
      setTransferSchools(teamsData);
    } catch (error) {
      console.error("Failed to load schools:", error);
    } finally {
      setTransferSchoolsLoading(false);
    }
  };

  const handleTransferSchoolSelect = (schoolName: string) => {
    if (schoolName === "clear") {
      setEditingTransfer({...editingTransfer, previous_school: ''});
    } else {
      setEditingTransfer({...editingTransfer, previous_school: schoolName});
    }
    setTransferSchoolOpen(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading recruiting data...</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-destructive text-6xl mb-4">⚠️</div>
        <p className="text-destructive text-lg">Error: {error}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Standardized Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Recruiting</h1>
          <p className="text-muted-foreground text-lg">Build your program through high school recruiting and the transfer portal</p>
        </div>
      </div>

      <Tabs defaultValue="highschool" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="highschool">High School Recruiting ({recruits.length})</TabsTrigger>
          <TabsTrigger value="transfer">Transfer Portal ({transfers.length})</TabsTrigger>
        </TabsList>

        {/* High School Recruiting Tab */}
        <TabsContent value="highschool">
          {/* Add Recruit Modal */}
          <div className="mb-8">
            <AddRecruitModal
              form={recruitForm}
              onFormChange={handleRecruitFormChange}
              onFormSubmit={handleAddRecruit}
              loading={recruitFormLoading}
              error={recruitFormError}
            />
          </div>

          {/* High School Class Overview */}
          <Card className="mb-8 border border-card shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl">{seasonYear} High School Recruiting Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  {editingRecruitingRank ? (
                    <input
                      type="number"
                      min={1}
                      max={130}
                      value={recruitingRank ?? ''}
                      onChange={handleRecruitingRankChange}
                      onBlur={handleRecruitingRankInputBlur}
                      onKeyDown={handleRecruitingRankInputKeyDown}
                      autoFocus
                      className="text-3xl font-bold text-primary text-center border-b-2 border-primary bg-transparent w-16 focus:outline-none"
                      style={{ lineHeight: '2.5rem' }}
                    />
                  ) : (
                    <div
                      className="text-3xl font-bold text-primary cursor-pointer inline-flex items-center gap-1 group"
                      onClick={handleRecruitingRankClick}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') handleRecruitingRankClick(); }}
                      title="Click to edit recruiting rank"
                      role="button"
                      aria-label="Edit recruiting rank"
                    >
                      #{recruitingRank != null ? recruitingRank : '-'}
                      <Pencil className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">Recruiting Rank</div>
                  {recruitingRankLoading && <span className="text-xs text-muted-foreground mt-1">Saving...</span>}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">{recruits.length + transfers.length}</div>
                  <div className="text-sm text-muted-foreground">Total Commits</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">-</div>
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{35 - (recruits.length + transfers.length)}</div>
                  <div className="text-sm text-muted-foreground">Open Slots</div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Recruiting Progress</span>
                  <span>
                    {recruits.length + transfers.length}/35
                  </span>
                </div>
                <Progress value={((recruits.length + transfers.length) / 35) * 100} className="h-2" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>💡 Recruits and transfers will automatically join the roster when you progress to the next season.</p>
              </div>
            </CardContent>
          </Card>

          {/* High School Recruits Table */}
          {recruits.length > 0 ? (
            <Card className="border border-card shadow-md bg-card">
              <CardHeader>
                <CardTitle>Committed Recruits</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Position</TableHead>
                      <TableHead className="text-muted-foreground">Stars</TableHead>
                      <TableHead className="text-muted-foreground">National Rank</TableHead>
                      <TableHead className="text-muted-foreground">State</TableHead>
                      <TableHead className="text-muted-foreground">Height</TableHead>
                      <TableHead className="text-muted-foreground">Weight</TableHead>
                      <TableHead className="text-muted-foreground">Dev Trait</TableHead>
                      <TableHead className="text-muted-foreground">Speed</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recruits.map((recruit, index) => (
                      <TableRow key={recruit.recruit_id || index}>
                        <TableCell className="font-medium text-foreground">{recruit.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{recruit.position}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: recruit.recruit_stars || 0 }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>#{recruit.recruit_rank_nat ?? '-'}</TableCell>
                        <TableCell>{recruit.state || '-'}</TableCell>
                        <TableCell>{recruit.height || '-'}</TableCell>
                        <TableCell>{recruit.weight || '-'} lbs</TableCell>
                        <TableCell>
                          {recruit.dev_trait && <Badge variant="secondary">{recruit.dev_trait}</Badge>}
                        </TableCell>
                        <TableCell>{recruit.speed || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRecruit(recruit)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecruit(recruit.recruit_id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-card shadow-md bg-card">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  No recruits committed yet. Add some recruits to build your class!
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transfer Portal Tab */}
        <TabsContent value="transfer">
          {/* Add Transfer Modal */}
          <div className="mb-8">
            <AddTransferModal
              form={transferForm}
              onFormChange={handleTransferFormChange}
              onFormSubmit={handleAddTransfer}
              loading={transferFormLoading}
              error={transferFormError}
            />
          </div>

          {/* Transfer Portal Overview */}
          <Card className="mb-8 border border-card shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl">{seasonYear} Transfer Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  {editingRecruitingRank ? (
                    <input
                      type="number"
                      min={1}
                      max={130}
                      value={recruitingRank ?? ''}
                      onChange={handleRecruitingRankChange}
                      onBlur={handleRecruitingRankInputBlur}
                      onKeyDown={handleRecruitingRankInputKeyDown}
                      autoFocus
                      className="text-3xl font-bold text-primary text-center border-b-2 border-primary bg-transparent w-16 focus:outline-none"
                      style={{ lineHeight: '2.5rem' }}
                    />
                  ) : (
                    <div
                      className="text-3xl font-bold text-primary cursor-pointer inline-flex items-center gap-1 group"
                      onClick={handleRecruitingRankClick}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') handleRecruitingRankClick(); }}
                      title="Click to edit recruiting rank"
                      role="button"
                      aria-label="Edit recruiting rank"
                    >
                      #{recruitingRank != null ? recruitingRank : '-'}
                      <Pencil className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">Recruiting Rank</div>
                  {recruitingRankLoading && <span className="text-xs text-muted-foreground mt-1">Saving...</span>}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">{transfers.length}</div>
                  <div className="text-sm text-muted-foreground">Transfers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {transfers.length > 0 
                      ? Math.round(transfers.reduce((sum, t) => sum + (parseInt(t.ovr_rating) || 0), 0) / transfers.length)
                      : '-'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Avg OVR</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{35 - (recruits.length + transfers.length)}</div>
                  <div className="text-sm text-muted-foreground">Open Slots</div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Recruiting Progress</span>
                  <span>
                    {recruits.length + transfers.length}/35
                  </span>
                </div>
                <Progress value={((recruits.length + transfers.length) / 35) * 100} className="h-2" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>💡 Recruits and transfers will automatically join the roster when you progress to the next season.</p>
              </div>
            </CardContent>
          </Card>

          {/* Transfers Table */}
          {transfers.length > 0 ? (
            <Card className="border border-card shadow-md bg-card">
              <CardHeader>
                <CardTitle>Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Position</TableHead>
                      <TableHead className="text-muted-foreground">Stars</TableHead>
                      <TableHead className="text-muted-foreground">Previous School</TableHead>
                      <TableHead className="text-muted-foreground">OVR</TableHead>
                      <TableHead className="text-muted-foreground">Positional Rank</TableHead>
                      <TableHead className="text-muted-foreground">State</TableHead>
                      <TableHead className="text-muted-foreground">Height</TableHead>
                      <TableHead className="text-muted-foreground">Weight</TableHead>
                      <TableHead className="text-muted-foreground">Dev Trait</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer, index) => (
                      <TableRow key={transfer.transfer_id || index}>
                        <TableCell className="font-medium text-foreground">{transfer.name}</TableCell>
                        <TableCell>{transfer.position}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: transfer.recruit_stars || 0 }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{transfer.previous_school || '-'}</TableCell>
                        <TableCell>{transfer.ovr_rating || '-'}</TableCell>
                        <TableCell>{transfer.recruit_rank_pos || '-'}</TableCell>
                        <TableCell>{transfer.state || '-'}</TableCell>
                        <TableCell>{transfer.height || '-'}</TableCell>
                        <TableCell>{transfer.weight || '-'} lbs</TableCell>
                        <TableCell>{transfer.dev_trait || '-'}</TableCell>
                        <TableCell>{transfer.current_status || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTransfer(transfer)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransfer(transfer.transfer_id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-card shadow-md bg-card">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  No transfers added yet. Add some transfers to build your class!
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Recruit Modal */}
      {editingRecruit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Edit Recruit</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditingRecruit(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Name</Label>
                  <Input
                    value={editingRecruit.name}
                    onChange={(e) => setEditingRecruit({...editingRecruit, name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Position</Label>
                  <Input
                    value={editingRecruit.position}
                    onChange={(e) => setEditingRecruit({...editingRecruit, position: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="font-medium">Stars</Label>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setEditingRecruit({...editingRecruit, recruit_stars: i + 1})}
                    >
                      <Star
                        className={`h-5 w-5 ${i < (editingRecruit.recruit_stars || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">National Rank</Label>
                  <Input
                    type="number"
                    value={editingRecruit.recruit_rank_nat || ''}
                    onChange={(e) => setEditingRecruit({...editingRecruit, recruit_rank_nat: parseInt(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Positional Rank</Label>
                  <Input
                    type="number"
                    value={editingRecruit.recruit_rank_pos || ''}
                    onChange={(e) => setEditingRecruit({...editingRecruit, recruit_rank_pos: parseInt(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Speed <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input
                    type="number"
                    value={editingRecruit.speed || ''}
                    onChange={(e) => setEditingRecruit({...editingRecruit, speed: e.target.value})}
                    placeholder="Optional"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Dev Trait</Label>
                  <Select 
                    value={editingRecruit.dev_trait || "None"} 
                    onValueChange={(value) => setEditingRecruit({...editingRecruit, dev_trait: value === "None" ? "" : value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select dev trait" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Elite">Elite</SelectItem>
                      <SelectItem value="Star">Star</SelectItem>
                      <SelectItem value="Impact">Impact</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-medium">Height (ft/in)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      min={4}
                      max={7}
                      value={editingRecruit.height ? editingRecruit.height.match(/(\d+)'/)?.[1] || '' : ''}
                      onChange={(e) => {
                        const inches = editingRecruit.height ? editingRecruit.height.match(/'(\d+)/)?.[1] || '' : '';
                        const newHeight = `${e.target.value}'${inches}"`;
                        setEditingRecruit({...editingRecruit, height: newHeight});
                      }}
                      placeholder="6"
                      className="w-16"
                    />
                    <span className="self-center text-lg font-medium">'</span>
                    <Input
                      type="number"
                      min={0}
                      max={11}
                      value={editingRecruit.height ? editingRecruit.height.match(/'(\d+)/)?.[1] || '' : ''}
                      onChange={(e) => {
                        const feet = editingRecruit.height ? editingRecruit.height.match(/(\d+)'/)?.[1] || '' : '';
                        const newHeight = `${feet}'${e.target.value}"`;
                        setEditingRecruit({...editingRecruit, height: newHeight});
                      }}
                      placeholder="2"
                      className="w-16"
                    />
                    <span className="self-center text-lg font-medium">"</span>
                  </div>
                </div>
                <div>
                  <Label className="font-medium">Weight</Label>
                  <Input
                    type="number"
                    value={editingRecruit.weight || ''}
                    onChange={(e) => setEditingRecruit({...editingRecruit, weight: e.target.value})}
                    placeholder="200"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">State</Label>
                  <Input
                    value={editingRecruit.state || ''}
                    onChange={(e) => setEditingRecruit({...editingRecruit, state: e.target.value})}
                    placeholder="TX"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={async () => {
                    if (!seasonId) return;
                    await updateRecruit(editingRecruit.recruit_id, editingRecruit);
                    const data = await fetchRecruitingClass(Number(teamId || 0), seasonId);
                    setRecruits(data);
                    setEditingRecruit(null);
                  }}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingRecruit(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transfer Modal */}
      {editingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Edit Transfer</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditingTransfer(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Name</Label>
                  <Input
                    value={editingTransfer.name}
                    onChange={(e) => setEditingTransfer({...editingTransfer, name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Position</Label>
                  <Input
                    value={editingTransfer.position}
                    onChange={(e) => setEditingTransfer({...editingTransfer, position: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="font-medium">Previous School</Label>
                <Popover open={transferSchoolOpen} onOpenChange={(open) => {
                  console.log("Dropdown open state:", open, "Current schools count:", transferSchools.length);
                  setTransferSchoolOpen(open);
                  if (open && transferSchools.length === 0) {
                    console.log("Loading schools because dropdown opened and no schools loaded");
                    loadTransferSchools();
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={transferSchoolOpen}
                      className="w-full justify-between mt-1"
                      disabled={transferSchoolsLoading}
                    >
                      {editingTransfer.previous_school || (transferSchoolsLoading ? "Loading schools..." : "Select school...")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search school..." />
                      <CommandList>
                        <CommandEmpty>No school found.</CommandEmpty>
                        <CommandGroup>
                          {editingTransfer.previous_school && (
                            <CommandItem
                              value="clear"
                              onSelect={() => handleTransferSchoolSelect("clear")}
                            >
                              <div className="flex items-center text-red-600">
                                <span>Clear selection</span>
                              </div>
                            </CommandItem>
                          )}
                          {console.log("Rendering schools dropdown with", transferSchools.length, "schools:", transferSchools)}
                          {transferSchools.map((school) => (
                            <CommandItem
                              key={school.id}
                              value={school.name}
                              onSelect={() => handleTransferSchoolSelect(school.name)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editingTransfer.previous_school === school.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{school.name}</span>
                                {school.abbreviation && (
                                  <span className="text-xs text-muted-foreground">{school.abbreviation}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                          {transferSchools.length === 0 && !transferSchoolsLoading && (
                            <div className="p-2 text-sm text-muted-foreground">
                              No schools available
                            </div>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-medium">OVR</Label>
                  <Input
                    type="number"
                    min={50}
                    max={99}
                    value={editingTransfer.ovr_rating || ''}
                    onChange={(e) => setEditingTransfer({...editingTransfer, ovr_rating: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Stars</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setEditingTransfer({...editingTransfer, recruit_stars: i + 1})}
                      >
                        <Star
                          className={`h-5 w-5 ${i < (editingTransfer.recruit_stars || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="font-medium">Positional Rank</Label>
                  <Input
                    type="number"
                    value={editingTransfer.recruit_rank_pos || ''}
                    onChange={(e) => setEditingTransfer({...editingTransfer, recruit_rank_pos: parseInt(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Dev Trait</Label>
                  <Select 
                    value={editingTransfer.dev_trait || "None"} 
                    onValueChange={(value) => setEditingTransfer({...editingTransfer, dev_trait: value === "None" ? "" : value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select dev trait" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Elite">Elite</SelectItem>
                      <SelectItem value="Star">Star</SelectItem>
                      <SelectItem value="Impact">Impact</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-medium">Current Status</Label>
                  <Select 
                    value={editingTransfer.current_status} 
                    onValueChange={(value) => setEditingTransfer({...editingTransfer, current_status: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FR">FR (Freshman)</SelectItem>
                      <SelectItem value="SO">SO (Sophomore)</SelectItem>
                      <SelectItem value="JR">JR (Junior)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-medium">Height (ft/in)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      min={4}
                      max={7}
                      value={editingTransfer.height ? editingTransfer.height.match(/(\d+)'/)?.[1] || '' : ''}
                      onChange={(e) => {
                        const inches = editingTransfer.height ? editingTransfer.height.match(/'(\d+)/)?.[1] || '' : '';
                        const newHeight = `${e.target.value}'${inches}"`;
                        setEditingTransfer({...editingTransfer, height: newHeight});
                      }}
                      placeholder="6"
                      className="w-16"
                    />
                    <span className="self-center text-lg font-medium">'</span>
                    <Input
                      type="number"
                      min={0}
                      max={11}
                      value={editingTransfer.height ? editingTransfer.height.match(/'(\d+)/)?.[1] || '' : ''}
                      onChange={(e) => {
                        const feet = editingTransfer.height ? editingTransfer.height.match(/(\d+)'/)?.[1] || '' : '';
                        const newHeight = `${feet}'${e.target.value}"`;
                        setEditingTransfer({...editingTransfer, height: newHeight});
                      }}
                      placeholder="2"
                      className="w-16"
                    />
                    <span className="self-center text-lg font-medium">"</span>
                  </div>
                </div>
                <div>
                  <Label className="font-medium">Weight</Label>
                  <Input
                    type="number"
                    value={editingTransfer.weight || ''}
                    onChange={(e) => setEditingTransfer({...editingTransfer, weight: e.target.value})}
                    placeholder="200"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">State</Label>
                  <Input
                    value={editingTransfer.state || ''}
                    onChange={(e) => setEditingTransfer({...editingTransfer, state: e.target.value})}
                    placeholder="TX"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={async () => {
                    if (!seasonId) return;
                    await updateTransfer(editingTransfer.transfer_id, editingTransfer);
                    const data = await fetchTransferPortal(Number(teamId || 0), seasonId);
                    setTransfers(data);
                    setEditingTransfer(null);
                  }}
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingTransfer(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
