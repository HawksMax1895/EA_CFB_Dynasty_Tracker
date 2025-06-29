"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, GraduationCap, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchRecruitingClass, addRecruitingClass, fetchTransferPortal, addTransferPortal } from "@/lib/api";
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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchRecruitingClass(teamId, seasonId),
      fetchTransferPortal(teamId, seasonId)
    ])
      .then(([recruitData, transferData]) => {
        setRecruits(recruitData);
        setTransfers(transferData);
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
      setRecruitForm({ name: '', position: '', recruit_stars: 3, recruit_rank_nat: 0, speed: '', dev_trait: '', height: '', weight: '', state: '' });
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

            {/* High School Recruits */}
            <div className="grid gap-6">
              {recruits.map((recruit, index) => (
                <RecruitCard key={index} recruit={recruit} index={index} />
              ))}
            </div>
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
                    <div className="text-3xl font-bold text-blue-600">-</div>
                    <div className="text-sm text-muted-foreground">Portal Rank</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{transfers.length}</div>
                    <div className="text-sm text-muted-foreground">Transfers</div>
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
                    <span>Portal Progress</span>
                    <span>
                      {transfers.length}/-
                    </span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Transfers */}
            <div className="grid gap-6">
              {transfers.map((transfer, index) => (
                <TransferCard key={index} transfer={transfer} index={index} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
