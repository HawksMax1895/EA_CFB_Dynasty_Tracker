"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, ArrowLeft, Star, TrendingUp, User, Target, Shield, Trophy, Activity, BarChart3, Save, X, Trash2 } from "lucide-react";
import { API_BASE_URL, updatePlayerSeasonStats, updatePlayerProfile, fetchPlayerAwards, fetchPlayerHonors, setPlayerLeaving, deletePlayer } from "@/lib/api";
import { PlayerRatingChart } from "@/components/PlayerRatingChart";
import { AddPlayerModal } from "@/components/AddPlayerModal";

// Stat column definitions
const QB_STATS = [
  { key: "games_played", label: "GP" },
  { key: "completions", label: "Comp" },
  { key: "attempts", label: "Att" },
  { key: "completion_pct", label: "Comp%" },
  { key: "pass_yards", label: "Pass Yds" },
  { key: "pass_tds", label: "Pass TD" },
  { key: "interceptions", label: "INT" },
  { key: "rush_attempts", label: "Rush Att" },
  { key: "rush_yards", label: "Rush Yds" },
  { key: "rush_tds", label: "Rush TD" }
];
const SKILL_STATS = [
  { key: "games_played", label: "GP" },
  { key: "rush_attempts", label: "Rush Att" },
  { key: "rush_yards", label: "Rush Yds" },
  { key: "rush_tds", label: "Rush TD" },
  { key: "receptions", label: "Rec" },
  { key: "rec_yards", label: "Rec Yds" },
  { key: "rec_tds", label: "Rec TD" }
];
const DEF_STATS = [
  { key: "games_played", label: "GP" },
  { key: "tackles", label: "Tackles" },
  { key: "tfl", label: "TFL" },
  { key: "sacks", label: "Sacks" },
  { key: "interceptions", label: "INT" },
  { key: "forced_fumbles", label: "FF" },
  { key: "def_tds", label: "TDs" }
];
const OLINE_STATS = [
  { key: "games_played", label: "GP" }
];

function getStatColumns(position: string) {
  if (["LT", "LG", "C", "RG", "RT"].includes(position)) return OLINE_STATS;
  if (position === "QB") return QB_STATS;
  if (["RB", "WR", "FB", "TE"].includes(position)) return SKILL_STATS;
  return DEF_STATS;
}

// Position-specific styling
const getPositionStyle = (position: string) => {
  const styles: Record<string, { bg: string; icon: string; color: string; border: string }> = {
    QB:    { bg: "from-blue-500 to-blue-600", icon: "🎯", color: "text-blue-400", border: "border-blue-700" },
    RB:    { bg: "from-green-500 to-green-600", icon: "🏃", color: "text-green-400", border: "border-green-700" },
    FB:    { bg: "from-emerald-500 to-emerald-600", icon: "🛡️", color: "text-emerald-400", border: "border-emerald-700" },
    WR:    { bg: "from-purple-500 to-purple-600", icon: "⚡", color: "text-purple-400", border: "border-purple-700" },
    TE:    { bg: "from-indigo-500 to-indigo-600", icon: "🎯", color: "text-indigo-400", border: "border-indigo-700" },
    RT:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-400", border: "border-orange-700" },
    RG:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-400", border: "border-orange-700" },
    C:     { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-400", border: "border-orange-700" },
    LG:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-400", border: "border-orange-700" },
    LT:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-400", border: "border-orange-700" },
    LEDG:  { bg: "from-red-500 to-red-600", icon: "🦾", color: "text-red-400", border: "border-red-700" },
    REDG:  { bg: "from-red-500 to-red-600", icon: "🦾", color: "text-red-400", border: "border-red-700" },
    DT:    { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-400", border: "border-red-700" },
    SAM:   { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-400", border: "border-yellow-700" },
    MIKE:  { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-400", border: "border-yellow-700" },
    WILL:  { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-400", border: "border-yellow-700" },
    CB:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-400", border: "border-yellow-700" },
    FS:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-400", border: "border-yellow-700" },
    SS:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-400", border: "border-yellow-700" },
    K:     { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-400", border: "border-gray-700" },
    P:     { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-400", border: "border-gray-700" },
  };
  return styles[position] || { bg: "from-gray-500 to-gray-600", icon: "👤", color: "text-gray-400", border: "border-gray-700" };
};

// Get rating color based on overall rating
const getRatingColor = (rating: number) => {
  if (rating >= 90) return "text-purple-400";
  if (rating >= 80) return "text-blue-400";
  if (rating >= 70) return "text-green-400";
  if (rating >= 60) return "text-yellow-400";
  return "text-gray-400";
};

// Add the same dev traits and height parsing logic as AddRecruitModal
const devTraits = [
  { value: "Normal", label: "Normal" },
  { value: "Impact", label: "Impact" },
  { value: "Star", label: "Star" },
  { value: "Elite", label: "Elite" },
];

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.player_id;
  const [player, setPlayer] = useState<Player | null>(null);
  const [career, setCareer] = useState<PlayerSeason[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSeason, setEditingSeason] = useState<number | null>(null);
  const [editingStats, setEditingStats] = useState<Partial<PlayerSeason>>({});
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileEdits, setProfileEdits] = useState<Partial<Player>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [playerAwards, setPlayerAwards] = useState<AwardWinner[]>([]);
  const [playerHonors, setPlayerHonors] = useState<HonorWinner[]>([]);
  const [awardsLoading, setAwardsLoading] = useState(false);
  const [honorsLoading, setHonorsLoading] = useState(false);
  const [leavingStatus, setLeavingStatus] = useState<string | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setAwardsLoading(true);
    setHonorsLoading(true);
    
    Promise.all([
      fetch(`${API_BASE_URL}/players/${playerId}`).then(r => r.json()),
      fetch(`${API_BASE_URL}/players/${playerId}/career`).then(r => r.json()),
      fetchPlayerAwards(parseInt(playerId as string)).then(setPlayerAwards).catch(() => setPlayerAwards([])),
      fetchPlayerHonors(parseInt(playerId as string)).then(setPlayerHonors).catch(() => setPlayerHonors([]))
    ])
      .then(([playerData, careerData]) => {
        setPlayer(playerData);
        setCareer(careerData);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      })
      .finally(() => {
        setAwardsLoading(false);
        setHonorsLoading(false);
      });
  }, [playerId]);

  const handleEditSeason = (season: PlayerSeason) => {
    setEditingSeason(season.season_id);
    setEditingStats({ ...season });
  };

  const handleCancelEdit = () => {
    setEditingSeason(null);
    setEditingStats({});
  };

  const handleSaveStats = async () => {
    if (!editingSeason || !playerId) return;
    
    setSaving(true);
    try {
      await updatePlayerSeasonStats(parseInt(playerId as string), editingSeason, editingStats);
      
      // Refresh the career data to show updated stats
      const careerData = await fetch(`${API_BASE_URL}/players/${playerId}/career`).then(r => r.json());
      setCareer(careerData);
      
      setEditingSeason(null);
      setEditingStats({});
    } catch (error) {
      setSaving(false);
    }
  };

  const handleStatChange = (field: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value) || 0;
    setEditingStats(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleEditProfile = () => {
    setEditingPlayer(player);
    setEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditingPlayer(null);
    setEditModalOpen(false);
  };
  const handlePlayerUpdated = async () => {
    if (!playerId) return;
    // Refresh player data
    const playerData = await fetch(`${API_BASE_URL}/players/${playerId}`).then(r => r.json());
    setPlayer(playerData);
    setEditingPlayer(null);
    setEditModalOpen(false);
  };

  const handleLeaveTeam = async () => {
    if (!playerId) return;
    setLeavingStatus(null);
    try {
      await setPlayerLeaving(Number(playerId));
      setLeavingStatus("Player will leave the team after this season.");
      // Refetch player data
      const playerData = await fetch(`${API_BASE_URL}/players/${playerId}`).then(r => r.json());
      setPlayer(playerData);
    } catch (err) {
      setLeavingStatus("Failed to mark player as leaving.");
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerId || !player) return;
    if (!confirm(`Are you sure you want to delete ${player.name}? This action cannot be undone.`)) {
      return;
    }
    setDeletingPlayer(true);
    try {
      await deletePlayer(Number(playerId));
      router.push('/players');
    } catch (err) {
      alert('Failed to delete player');
      setDeletingPlayer(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-300">Loading player profile...</p>
      </div>
    </div>
  );
  if (!player) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-400 text-6xl mb-4">👤</div>
        <p className="text-gray-400 text-lg">Player not found</p>
      </div>
    </div>
  );

  const positionStyle = getPositionStyle(player.position);
  const ratingColor = getRatingColor(player.ovr_rating || 0);

  return (
    <>
      {/* Standardized Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Roster
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-100">{player.name}</h1>
            <p className="text-muted-foreground text-lg">Player Profile & Career Stats</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Player Info Card */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-lg bg-card border-gray-800">
            <div className="p-6">
              {/* Top Row: Icon, Name, Badges (left) | OVR (right) */}
              <div className="flex items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{positionStyle.icon}</span>
                  <div className="min-w-0">
                    <span className="text-base font-bold text-gray-100 leading-tight block truncate">{player.name}</span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={`${positionStyle.color} border-current text-xs px-2 py-0.5`}>{player.position}</Badge>
                      {player.current_year && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5">{player.current_year}</Badge>
                      )}
                      {player.dev_trait && (
                        <Badge variant="outline" className="bg-yellow-900/50 text-yellow-300 border-yellow-700 text-xs px-2 py-0.5">{player.dev_trait}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[70px]">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    <span className={`text-2xl font-bold ${ratingColor}`}>{player.ovr_rating !== undefined && player.ovr_rating !== null ? player.ovr_rating : "-"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">OVR</span>
                </div>
              </div>
              {/* Player Details: 2x2 grid on left, Edit button on right */}
              <div className="flex w-full mt-4 gap-4 items-stretch">
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-x-4 gap-y-2 text-gray-300 text-sm">
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-4 w-4" />
                    <span>{player.height || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Target className="h-4 w-4" />
                    <span>{player.weight ? `${player.weight} lbs` : '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span>{player.recruit_stars ? `${player.recruit_stars}★` : '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Shield className="h-4 w-4" />
                    <span>{player.state || '-'}</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-end w-28 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 px-6"
                    onClick={handleEditProfile}
                    disabled={editingProfile}
                  >
                    Edit
                  </Button>
                  {player?.team_id && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-10 px-6"
                      onClick={handleLeaveTeam}
                      disabled={!!player.leaving}
                    >
                      {player.leaving ? "Leaving after season" : "Leave Team after Season"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-10 px-6"
                    onClick={handleDeletePlayer}
                    disabled={deletingPlayer}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletingPlayer ? "Deleting..." : "Delete Player"}
                  </Button>
                  {leavingStatus && (
                    <span className="text-xs text-red-400 text-center mt-1">{leavingStatus}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Awards & Honors */}
          <div className="mt-6 space-y-6">
            {/* Awards */}
            <Card className="border-0 shadow-lg bg-card border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-400" />
                  Awards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {awardsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
                  </div>
                ) : playerAwards.length > 0 ? (
                  <div className="space-y-2">
                    {playerAwards.map((award, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-900/20 rounded-lg border border-yellow-800/50">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-200">{award.award_name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs bg-gray-800 text-gray-300">
                          {award.season_year}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No awards yet</p>
                )}
              </CardContent>
            </Card>

            {/* Honors */}
            <Card className="border-0 shadow-lg bg-card border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-400" />
                  Honors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {honorsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
                  </div>
                ) : playerHonors.length > 0 ? (
                  <div className="space-y-2">
                    {playerHonors.map((honor, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-800/50">
                        <Star className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-200">{honor.honor_name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs bg-gray-800 text-gray-300">
                          {honor.season_year}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No honors yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Career Stats */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg bg-card border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Career Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {career && career.seasons && career.seasons.length > 0 ? (
                <div className="space-y-4">
                  {career.seasons.map((season: any, idx: number) => {
                    const isEditing = editingSeason === season.season_id;
                    const statColumns = getStatColumns(player.position);
                    
                    return (
                      <div key={season.season_id || idx} className="rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-100">{season.year ? `${season.year} Season` : 'Season'}</h3>
                          {!isEditing ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSeason(season)}
                            >
                              Edit Stats
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveStats}
                                disabled={saving}
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {statColumns.map((stat) => (
                            <div key={stat.key} className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={editingStats[stat.key] || ''}
                                  onChange={(e) => handleStatChange(stat.key, e.target.value)}
                                  className="text-center h-8 text-sm bg-gray-800 border-gray-600 text-gray-100"
                                />
                              ) : (
                                <div className="font-semibold text-gray-200">
                                  {season[stat.key] !== null && season[stat.key] !== undefined 
                                    ? season[stat.key] 
                                    : '-'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No career statistics available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating Chart */}
          <div className="mt-6">
            <PlayerRatingChart playerId={parseInt(playerId as string)} />
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AddPlayerModal
        onPlayerAdded={() => {}}
        editingPlayer={editingPlayer}
        onPlayerUpdated={handlePlayerUpdated}
        open={editModalOpen}
        onOpenChange={(open) => { if (!open) handleCloseEditModal(); }}
      />
    </>
  );
}