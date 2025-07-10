"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, ArrowLeft, Star, TrendingUp, User, Target, Shield, Trophy, Activity, BarChart3, Save, X } from "lucide-react";
import { API_BASE_URL, updatePlayerSeasonStats, updatePlayerProfile, fetchPlayerAwards, fetchPlayerHonors, setPlayerLeaving } from "@/lib/api";
import { PlayerRatingChart } from "@/components/PlayerRatingChart";

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
    QB:    { bg: "from-blue-500 to-blue-600", icon: "🎯", color: "text-blue-600", border: "border-blue-200" },
    RB:    { bg: "from-green-500 to-green-600", icon: "🏃", color: "text-green-600", border: "border-green-200" },
    FB:    { bg: "from-emerald-500 to-emerald-600", icon: "🛡️", color: "text-emerald-600", border: "border-emerald-200" },
    WR:    { bg: "from-purple-500 to-purple-600", icon: "⚡", color: "text-purple-600", border: "border-purple-200" },
    TE:    { bg: "from-indigo-500 to-indigo-600", icon: "🎯", color: "text-indigo-600", border: "border-indigo-200" },
    RT:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    RG:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    C:     { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LG:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LT:    { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LEDG:  { bg: "from-red-500 to-red-600", icon: "🦾", color: "text-red-600", border: "border-red-200" },
    REDG:  { bg: "from-red-500 to-red-600", icon: "🦾", color: "text-red-600", border: "border-red-200" },
    DT:    { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    SAM:   { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-600", border: "border-yellow-200" },
    MIKE:  { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-600", border: "border-yellow-200" },
    WILL:  { bg: "from-yellow-500 to-yellow-600", icon: "🦸", color: "text-yellow-600", border: "border-yellow-200" },
    CB:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    FS:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    SS:    { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    K:     { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600", border: "border-gray-200" },
    P:     { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600", border: "border-gray-200" },
  };
  return styles[position] || { bg: "from-gray-500 to-gray-600", icon: "👤", color: "text-gray-600", border: "border-gray-200" };
};

// Get rating color based on overall rating
const getRatingColor = (rating: number) => {
  if (rating >= 90) return "text-purple-600";
  if (rating >= 80) return "text-blue-600";
  if (rating >= 70) return "text-green-600";
  if (rating >= 60) return "text-yellow-600";
  return "text-gray-600";
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
    setEditingProfile(true);
    setProfileEdits({
      height: player.height || '',
      weight: player.weight || '',
      dev_trait: player.dev_trait || '',
    });
  };

  const handleCancelProfile = () => {
    setEditingProfile(false);
    setProfileEdits({});
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileEdits((prev: Partial<Player>) => ({ ...prev, [field]: value }));
  };

  const handleHeightChange = (type: 'feet' | 'inches', value: string) => {
    // Parse and update height as 6'2" format
    const currentHeight = profileEdits.height || '';
    const match = currentHeight.match(/(\d+)'(\d+)?/);
    let feet = match ? match[1] : '';
    let inches = match ? match[2] : '';
    if (type === 'feet') feet = value.replace(/\D/g, '');
    if (type === 'inches') inches = value.replace(/\D/g, '');
    let heightString = '';
    if (feet) heightString += `${feet}'`;
    if (inches) heightString += `${inches}`;
    if (feet && inches !== '') heightString += '"';
    setProfileEdits((prev: Partial<Player>) => ({ ...prev, height: heightString }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updatePlayerProfile(player.player_id, profileEdits);
      // Refresh player data
      const playerData = await fetch(`${API_BASE_URL}/players/${playerId}`).then(r => r.json());
      setPlayer(playerData);
      setEditingProfile(false);
      setProfileEdits({});
    } catch (error) {
      setSavingProfile(false);
    }
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading player profile...</p>
      </div>
    </div>
  );
  if (!player) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-500 text-6xl mb-4">👤</div>
        <p className="text-gray-500 text-lg">Player not found</p>
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
            <h1 className="text-4xl font-bold text-gray-900">{player.name}</h1>
            <p className="text-muted-foreground text-lg">Player Profile & Career Stats</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Player Info Card */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <div className="p-6">
              {/* Top Row: Icon, Name, Badges (left) | OVR (right) */}
              <div className="flex items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{positionStyle.icon}</span>
                  <div className="min-w-0">
                    <span className="text-base font-bold text-gray-900 leading-tight block truncate">{player.name}</span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={`${positionStyle.color} border-current text-xs px-2 py-0.5`}>{player.position}</Badge>
                      {player.current_year && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5">{player.current_year}</Badge>
                      )}
                      {player.dev_trait && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs px-2 py-0.5">{player.dev_trait}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[70px]">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className={`text-2xl font-bold ${ratingColor}`}>{player.ovr_rating !== undefined && player.ovr_rating !== null ? player.ovr_rating : "-"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">OVR</span>
                </div>
              </div>
              {/* Player Details: 2x2 grid on left, Edit button on right */}
              <div className="flex w-full mt-4 gap-4 items-stretch">
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-x-4 gap-y-2 text-gray-600 text-sm">
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-4 w-4" />
                    <span>{player.height || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Target className="h-4 w-4" />
                    <span>{player.weight ? `${player.weight} lbs` : '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Star className="h-4 w-4 text-yellow-500" />
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
                  {leavingStatus && (
                    <span className="text-xs text-destructive text-center mt-1">{leavingStatus}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Awards & Honors */}
          <div className="mt-6 space-y-6">
            {/* Awards */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Awards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {awardsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : playerAwards.length > 0 ? (
                  <div className="space-y-2">
                    {playerAwards.map((award, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{award.award_name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
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
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-500" />
                  Honors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {honorsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : playerHonors.length > 0 ? (
                  <div className="space-y-2">
                    {playerHonors.map((honor, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                        <Star className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">{honor.honor_name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
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
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
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
                      <div key={season.season_id || idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{season.season_year} Season</h3>
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
                                  className="text-center h-8 text-sm"
                                />
                              ) : (
                                <div className="font-semibold">
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
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Player Profile</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelProfile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Height</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min="4"
                    max="7"
                    value={(profileEdits.height?.match(/(\d+)'/)?.[1] || '')}
                    onChange={(e) => handleHeightChange('feet', e.target.value)}
                    placeholder="Feet"
                    className="w-20"
                  />
                  <span>ft</span>
                  <Input
                    type="number"
                    min="0"
                    max="11"
                    value={(profileEdits.height?.match(/(\d+)'(\d+)?/)?.[2] || '')}
                    onChange={(e) => handleHeightChange('inches', e.target.value)}
                    placeholder="Inches"
                    className="w-20"
                  />
                  <span>in</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Weight (lbs)</label>
                <Input
                  type="number"
                  value={profileEdits.weight || ''}
                  onChange={(e) => handleProfileChange('weight', e.target.value)}
                  placeholder="Weight"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Development Trait</label>
                <Select
                  value={profileEdits.dev_trait || ''}
                  onValueChange={(value) => handleProfileChange('dev_trait', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trait" />
                  </SelectTrigger>
                  <SelectContent>
                    {devTraits.map(trait => (
                      <SelectItem key={trait.value} value={trait.value}>
                        {trait.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelProfile}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}