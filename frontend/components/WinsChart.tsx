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

  if (loading) return <Card><CardContent className="p-md">Loading chart...</CardContent></Card>;
  if (error) return <Card><CardContent className="p-md text-destructive">Error: {error}</CardContent></Card>;
  if (!data || data.chart_data.length === 0) return <Card><CardContent className="p-md">No data available</CardContent></Card>;

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
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px hsl(var(--foreground) / 0.1)'
                }}
                formatter={(value: number, name: string) => [
                  value, 
                  name === 'wins' ? 'Wins' : name === 'losses' ? 'Losses' : 'Total Games'
                ]}
                labelFormatter={(label) => `Season ${label}`}
              />
              <Bar 
                dataKey="wins" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="losses" 
                fill="hsl(var(--destructive))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4 gap-[var(--gap-4)]">
            <div className="flex items-center gap-2 gap-[var(--gap-2)]">
              <div className="w-3 h-3 bg-success rounded-full w-[var(--size-3)] h-[var(--size-3)]"></div>
              <span>Wins</span>
            </div>
            <div className="flex items-center gap-2 gap-[var(--gap-2)]">
              <div className="w-3 h-3 bg-destructive rounded-full w-[var(--size-3)] h-[var(--size-3)]"></div>
              <span>Losses</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 