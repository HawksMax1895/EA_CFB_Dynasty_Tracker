"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

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

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.player_id;
  const [player, setPlayer] = useState<any>(null);
  const [career, setCareer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="p-8">Loading player profile...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!player || !career) return <div className="p-8">Player not found.</div>;

  const statColumns = getStatColumns(player.position);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <button
          className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium"
          onClick={() => router.push('/players')}
        >
          ← Back to Roster
        </button>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-4">
              {player.name}
              <Badge variant="outline">{player.position}</Badge>
              <Badge variant="secondary">{player.class}</Badge>
              {player.dev_trait && <Badge variant="secondary">{player.dev_trait}</Badge>}
            </CardTitle>
            <div className="flex flex-wrap gap-4 mt-2 text-gray-700 text-lg">
              {player.height && <span><strong>Height:</strong> {player.height}</span>}
              {player.weight && <span><strong>Weight:</strong> {player.weight} lbs</span>}
              {player.state && <span><strong>State:</strong> {player.state}</span>}
              {player.recruit_stars && (
                <span className="flex items-center gap-1"><strong>Recruit:</strong> {Array.from({ length: player.recruit_stars }).map((_, i) => <span key={i}>⭐</span>)} </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-lg flex items-center gap-2"><Award className="h-4 w-4" />Awards & Honors</h3>
                <div className="space-y-1">
                  <Badge variant="outline">{player.awards ?? '-'}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Season-by-Season Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1">Season</th>
                    <th className="px-2 py-1">Team</th>
                    <th className="px-2 py-1">Class</th>
                    <th className="px-2 py-1">OVR</th>
                    {statColumns.map(col => (
                      <th key={col.key} className="px-2 py-1">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {career.seasons.map((s: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{s.season_id}</td>
                      <td className="px-2 py-1">{s.team_name || s.team_id}</td>
                      <td className="px-2 py-1">{s.class}</td>
                      <td className="px-2 py-1">{s.ovr_rating}</td>
                      {statColumns.map(col => (
                        <td key={col.key} className="px-2 py-1">{s[col.key] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                  {/* Career Totals Row */}
                  <tr className="border-t bg-blue-100 font-bold">
                    <td className="px-2 py-1" colSpan={4}>Career Totals</td>
                    {statColumns.map(col => (
                      <td key={col.key} className="px-2 py-1">{career.career_totals[col.key] ?? '-'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 