"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from "react";
import { fetchPlayerRatingDevelopment } from "@/lib/api";

interface ChartData {
  season_year: number;
  ovr_rating: number;
  current_year: string;
  redshirted: boolean;
  team_name: string;
}

interface PlayerRatingData {
  player_name: string;
  chart_data: ChartData[];
}

interface PlayerRatingChartProps {
  playerId: number;
}

export function PlayerRatingChart({ playerId }: PlayerRatingChartProps) {
  const [data, setData] = useState<PlayerRatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayerRatingDevelopment(playerId)
      .then((chartData) => {
        setData(chartData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [playerId]);

  // Calculate dynamic Y-axis domain for better scaling
  const getYAxisDomain = (chartData: ChartData[]) => {
    if (chartData.length === 0) return [0, 100];
    
    const ratings = chartData.map(d => d.ovr_rating).filter(r => r !== null && r !== undefined);
    if (ratings.length === 0) return [0, 100];
    
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const range = maxRating - minRating;
    
    // If ratings are very close together, ensure at least a 10-point range
    const minRange = 10;
    const actualRange = Math.max(range, minRange);
    
    const padding = Math.max(2, Math.floor(actualRange * 0.1)); // 10% padding
    const min = Math.max(0, minRating - padding);
    const max = Math.min(100, maxRating + padding);
    
    return [min, max];
  };

  if (loading) return <Card><CardContent className="p-6">Loading rating development...</CardContent></Card>;
  if (error) return <Card><CardContent className="p-6 text-red-500">Error: {error}</CardContent></Card>;
  if (!data || data.chart_data.length === 0) return <Card><CardContent className="p-6">No rating data available</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Rating Development</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chart_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="season_year" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={getYAxisDomain(data.chart_data)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: string) => [
                  value, 
                  name === 'ovr_rating' ? 'Overall Rating' : name
                ]}
                labelFormatter={(label) => `Season ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="ovr_rating" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Overall Rating</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {data.chart_data.map((season, index) => (
              <div key={season.season_year} className="flex items-center gap-2 mb-1">
                <span className="font-medium">Season {season.season_year}:</span>
                <span className={`font-bold ${season.ovr_rating >= 90 ? 'text-purple-600' : season.ovr_rating >= 80 ? 'text-blue-600' : season.ovr_rating >= 70 ? 'text-green-600' : season.ovr_rating >= 60 ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {season.ovr_rating}
                </span>
                <span className="text-gray-400">({season.current_year})</span>
                {season.redshirted && <span className="text-orange-500 text-xs">RS</span>}
                <span className="text-gray-400">- {season.team_name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 