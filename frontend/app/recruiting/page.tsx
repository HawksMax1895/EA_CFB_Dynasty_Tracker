"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, GraduationCap, Building2, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchRecruitingClass, addRecruitingClass, fetchTransferPortal, addTransferPortal, updateTeamSeason, fetchTeamsBySeason } from "@/lib/api";
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

export default function RecruitingPage() {
  const teamId = 1;
  const seasonId = 2025;
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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchRecruitingClass(teamId, seasonId),
      fetchTransferPortal(teamId, seasonId),
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
    setRecruitFormLoading(true);
    setRecruitFormError(null);
    try {
      await addRecruitingClass({ team_id: teamId, season_id: seasonId, recruits: [recruitForm] });
      setRecruitForm({ name: '', position: '', recruit_stars: 3, recruit_rank_nat: 0, recruit_rank_pos: 0, speed: '', dev_trait: '', height: '', weight: '', state: '' });
      const data = await fetchRecruitingClass(teamId, seasonId);
      setRecruits(data);
    } catch (err: any) {
      setRecruitFormError(err.message);
    } finally {
      setRecruitFormLoading(false);
    }
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferFormLoading(true);
    setTransferFormError(null);
    try {
      await addTransferPortal({ team_id: teamId, season_id: seasonId, transfers: [transferForm] });
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
      const data = await fetchTransferPortal(teamId, seasonId);
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
    if (recruitingRank == null) return;
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

  if (loading) return <div className="p-8">Loading recruiting data...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Recruiting</h1>
          <p className="text-gray-600">Build your program through high school recruiting and the transfer portal</p>
        </div>

        <Tabs defaultValue="highschool" className="w-full">
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
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">{seasonId} High School Recruiting Class</CardTitle>
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
                        className="text-3xl font-bold text-blue-600 text-center border-b-2 border-blue-400 bg-transparent w-16 focus:outline-none"
                        style={{ lineHeight: '2.5rem' }}
                      />
                    ) : (
                      <div
                        className="text-3xl font-bold text-blue-600 cursor-pointer inline-flex items-center gap-1 group"
                        onClick={handleRecruitingRankClick}
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') handleRecruitingRankClick(); }}
                        title="Click to edit recruiting rank"
                        role="button"
                        aria-label="Edit recruiting rank"
                      >
                        #{recruitingRank != null ? recruitingRank : '-'}
                        <Pencil className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">Recruiting Rank</div>
                    {recruitingRankLoading && <span className="text-xs text-muted-foreground mt-1">Saving...</span>}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{recruits.length + transfers.length}</div>
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
              <Card>
                <CardHeader>
                  <CardTitle>Committed Recruits</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Stars</TableHead>
                        <TableHead>National Rank</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Height</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Dev Trait</TableHead>
                        <TableHead>Speed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recruits.map((recruit, index) => (
                        <TableRow key={recruit.recruit_id || index}>
                          <TableCell className="font-medium">{recruit.name}</TableCell>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
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
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">{seasonId} Transfer Portal</CardTitle>
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
                        className="text-3xl font-bold text-blue-600 text-center border-b-2 border-blue-400 bg-transparent w-16 focus:outline-none"
                        style={{ lineHeight: '2.5rem' }}
                      />
                    ) : (
                      <div
                        className="text-3xl font-bold text-blue-600 cursor-pointer inline-flex items-center gap-1 group"
                        onClick={handleRecruitingRankClick}
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') handleRecruitingRankClick(); }}
                        title="Click to edit recruiting rank"
                        role="button"
                        aria-label="Edit recruiting rank"
                      >
                        #{recruitingRank != null ? recruitingRank : '-'}
                        <Pencil className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">Recruiting Rank</div>
                    {recruitingRankLoading && <span className="text-xs text-muted-foreground mt-1">Saving...</span>}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{transfers.length}</div>
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
              <Card>
                <CardHeader>
                  <CardTitle>Transfers</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Stars</TableHead>
                        <TableHead>Previous School</TableHead>
                        <TableHead>OVR</TableHead>
                        <TableHead>Positional Rank</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Height</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Dev Trait</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer, index) => (
                        <TableRow key={transfer.transfer_id || index}>
                          <TableCell className="font-medium">{transfer.name}</TableCell>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    No transfers added yet. Add some transfers to build your class!
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
