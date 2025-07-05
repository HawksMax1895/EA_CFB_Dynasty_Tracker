"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from "react";
import { fetchWinsChart } from "@/lib/api";

interface ChartData {
  year: number;
  wins: number;
  losses: number;
  total_games: number;
}

interface WinsChartData {
  team_name: string;
  chart_data: ChartData[];
}

export function WinsChart() {
  const [data, setData] = useState<WinsChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWinsChart()
      .then((chartData) => {
        setData(chartData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <Card><CardContent className="p-6">Loading chart...</CardContent></Card>;
  if (error) return <Card><CardContent className="p-6 text-red-500">Error: {error}</CardContent></Card>;
  if (!data || data.chart_data.length === 0) return <Card><CardContent className="p-6">No data available</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wins by Season</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chart_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'dataMax + 2']}
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
                  name === 'wins' ? 'Wins' : name === 'losses' ? 'Losses' : 'Total Games'
                ]}
                labelFormatter={(label) => `Season ${label}`}
              />
              <Bar 
                dataKey="wins" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="losses" 
                fill="#ef4444" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Wins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Losses</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 