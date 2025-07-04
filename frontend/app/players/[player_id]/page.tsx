"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, ArrowLeft, Star, TrendingUp, User, Target, Shield, Trophy, Zap, Activity, BarChart3, Save, X } from "lucide-react";
import { API_BASE_URL, updatePlayerSeasonStats, updatePlayerProfile } from "@/lib/api";

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
  const styles = {
    QB: { bg: "from-blue-500 to-blue-600", icon: "🎯", color: "text-blue-600", border: "border-blue-200" },
    RB: { bg: "from-green-500 to-green-600", icon: "🏃", color: "text-green-600", border: "border-green-200" },
    WR: { bg: "from-purple-500 to-purple-600", icon: "⚡", color: "text-purple-600", border: "border-purple-200" },
    TE: { bg: "from-indigo-500 to-indigo-600", icon: "🎯", color: "text-indigo-600", border: "border-indigo-200" },
    FB: { bg: "from-emerald-500 to-emerald-600", icon: "🛡️", color: "text-emerald-600", border: "border-emerald-200" },
    LT: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LG: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    C: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    RG: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    RT: { bg: "from-orange-500 to-orange-600", icon: "🛡️", color: "text-orange-600", border: "border-orange-200" },
    LE: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    RE: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    DT: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    LOLB: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    MLB: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    ROLB: { bg: "from-red-500 to-red-600", icon: "⚔️", color: "text-red-600", border: "border-red-200" },
    CB: { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    FS: { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    SS: { bg: "from-yellow-500 to-yellow-600", icon: "🛡️", color: "text-yellow-600", border: "border-yellow-200" },
    K: { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600", border: "border-gray-200" },
    P: { bg: "from-gray-500 to-gray-600", icon: "⚽", color: "text-gray-600", border: "border-gray-200" }
  };
  return styles[position as keyof typeof styles] || { bg: "from-gray-500 to-gray-600", icon: "👤", color: "text-gray-600", border: "border-gray-200" };
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
  const [player, setPlayer] = useState<any>(null);
  const [career, setCareer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSeason, setEditingSeason] = useState<number | null>(null);
  const [editingStats, setEditingStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileEdits, setProfileEdits] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/players/${playerId}`).then(r => r.json()),
      fetch(`${API_BASE_URL}/players/${playerId}/career`).then(r => r.json())
    ])
      .then(([playerData, careerData]) => {
        setPlayer(playerData);
        setCareer(careerData);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load player profile");
        setLoading(false);
      });
  }, [playerId]);

  const handleEditSeason = (season: any) => {
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
    } catch (err) {
      console.error('Failed to update stats:', err);
      setError("Failed to update player stats");
    } finally {
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
    setProfileEdits((prev: any) => ({ ...prev, [field]: value }));
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
    setProfileEdits((prev: any) => ({ ...prev, height: heightString }));
  };

  // Parse height for display
  const currentHeight = profileEdits.height || '';
  const match = currentHeight.match(/(\d+)'(\d+)?/);
  const feet = match ? match[1] : '';
  const inches = match ? match[2] : '';

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updatePlayerProfile(player.player_id, profileEdits);
      // Refresh player data
      const playerData = await fetch(`${API_BASE_URL}/players/${playerId}`).then(r => r.json());
      setPlayer(playerData);
      setEditingProfile(false);
      setProfileEdits({});
    } catch (err) {
      setError("Failed to update player profile");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading player profile...</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    </div>
  );
  if (!player || !career) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-500 text-6xl mb-4">👤</div>
        <p className="text-gray-500 text-lg">Player not found.</p>
      </div>
    </div>
  );

  const statColumns = getStatColumns(player.position);
  const positionStyle = getPositionStyle(player.position);
  const ratingColor = getRatingColor(player.ovr_rating || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="outline"
          className="mb-6 group hover:bg-blue-50 hover:border-blue-300 transition-colors"
          onClick={() => router.push('/players')}
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Roster
        </Button>

        {/* Player Header Card */}
        <Card className="mb-8 shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${positionStyle.bg}`}></div>
          <CardHeader className="pb-4 pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              {/* Avatar & Icon */}
              <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br text-white text-2xl shadow-md border-2 border-white/70 ${positionStyle.bg}">
                {positionStyle.icon}
              </div>
              {/* Main Info & OVR */}
              <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mr-2 mb-0">{player.name}</CardTitle>
                    <Badge variant="outline" className={`${positionStyle.color} border-current text-base px-2 py-0.5`}>{player.position}</Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-base px-2 py-0.5">{player.class}</Badge>
                    {player.dev_trait && !editingProfile && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-base px-2 py-0.5">{player.dev_trait}</Badge>
                    )}
                    {editingProfile && (
                      <Select value={profileEdits.dev_trait} onValueChange={v => handleProfileChange('dev_trait', v)}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Dev Trait" />
                        </SelectTrigger>
                        <SelectContent>
                          {devTraits.map(trait => (
                            <SelectItem key={trait.value} value={trait.value}>{trait.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {/* Bio Row */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-sm text-gray-600">
                    {!editingProfile && player.height && (
                      <span className="flex items-center gap-1"><User className="h-4 w-4 text-blue-500" /><span>Height: {player.height}</span></span>
                    )}
                    {editingProfile && (
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4 text-blue-500" />
                        <span>Height:</span>
                        <Input className="w-16 h-6 text-sm" value={feet} onChange={e => handleHeightChange('feet', e.target.value)} placeholder="Feet" type="number" min="4" max="7" />
                        <span className="ml-1 mr-2">ft</span>
                        <Input className="w-16 h-6 text-sm" value={inches} onChange={e => handleHeightChange('inches', e.target.value)} placeholder="Inches" type="number" min="0" max="11" />
                        <span className="ml-1">in</span>
                      </span>
                    )}
                    {!editingProfile && player.weight && (
                      <span className="flex items-center gap-1"><Target className="h-4 w-4 text-green-500" /><span>Weight: {player.weight} lbs</span></span>
                    )}
                    {editingProfile && (
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-green-500" />
                        <span>Weight: </span>
                        <Input className="w-16 h-6 text-sm" value={profileEdits.weight} onChange={e => handleProfileChange('weight', e.target.value)} placeholder="Weight" type="number" />
                        <span>lbs</span>
                      </span>
                    )}
                    {player.state && (
                      <span className="flex items-center gap-1"><Shield className="h-4 w-4 text-purple-500" /><span>State: {player.state}</span></span>
                    )}
                    {player.recruit_stars && (
                      <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" /><span>Recruit: {player.recruit_stars}★</span></span>
                    )}
                  </div>
                </div>
                {/* OVR Rating */}
                <div className="flex flex-col items-start md:items-center justify-center min-w-[90px] md:pl-4 mt-2 md:mt-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className={`text-3xl md:text-4xl font-bold ${ratingColor}`}>{player.ovr_rating ?? '-'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">OVR</span>
                </div>
              </div>
              {/* Edit/Save/Cancel Buttons */}
              <div className="flex flex-col gap-2 ml-4">
                {!editingProfile && (
                  <Button size="sm" variant="outline" onClick={handleEditProfile}>Edit</Button>
                )}
                {editingProfile && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save'}</Button>
                    <Button size="sm" variant="outline" onClick={handleCancelProfile}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <hr className="border-t border-gray-200 mx-6" />
          <CardContent className="pt-4 pb-2">
            <div>
              <h3 className="font-semibold mb-2 text-base flex items-center gap-2 text-gray-800">
                <Award className="h-4 w-4 text-yellow-500" />
                Awards & Honors
              </h3>
              <div>
                {player.awards ? (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-sm px-2 py-1">{player.awards}</Badge>
                ) : (
                  <p className="text-gray-500 italic text-sm">No awards yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Career Stats Card */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3 text-gray-900">
              <BarChart3 className="h-6 w-6 text-blue-500" />
              Season-by-Season Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Season</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Team</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">OVR</th>
                      {statColumns.map(col => (
                        <th key={col.key} className="px-4 py-3 text-left font-semibold text-gray-700">{col.label}</th>
                      ))}
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {career.seasons.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.season_year || s.season_id}</td>
                        <td className="px-4 py-3 text-gray-700">{s.team_name || s.team_id}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {s.class}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {editingSeason === s.season_id ? (
                            <Input
                              type="number"
                              value={editingStats.ovr_rating || ''}
                              onChange={(e) => handleStatChange('ovr_rating', e.target.value)}
                              className="w-16 h-8 text-sm"
                            />
                          ) : (
                            <span className={`font-bold ${getRatingColor(s.ovr_rating || 0)}`}>
                              {s.ovr_rating}
                            </span>
                          )}
                        </td>
                        {statColumns.map(col => (
                          <td key={col.key} className="px-4 py-3 text-gray-700">
                            {editingSeason === s.season_id ? (
                              <Input
                                type="number"
                                value={editingStats[col.key] || ''}
                                onChange={(e) => handleStatChange(col.key, e.target.value)}
                                className="w-16 h-8 text-sm"
                              />
                            ) : (
                              s[col.key] ?? '-'
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          {editingSeason === s.season_id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={handleSaveStats}
                                disabled={saving}
                                className="h-6 px-2"
                              >
                                {saving ? 'Saving...' : <Save className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="h-6 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSeason(s)}
                              className="h-6 px-2"
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Career Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-50 to-blue-100 font-bold border-t-2 border-blue-200">
                      <td className="px-4 py-3 text-blue-900" colSpan={4}>Career Totals</td>
                      {statColumns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-blue-900">
                          {career.career_totals[col.key] ?? '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-blue-900"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}