import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp } from "lucide-react";

interface RecruitCardProps {
  recruit: {
    name: string;
    position: string;
    recruit_stars?: number;
    recruit_rank_nat?: number;
    speed?: string;
    dev_trait?: string;
    height?: string;
    weight?: string;
    state?: string;
    rating?: string;
    commitmentDate?: string;
    earlyEnrollee?: boolean;
  };
  index: number;
}

export function RecruitCard({ recruit, index }: RecruitCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{recruit.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{recruit.position}</Badge>
              {recruit.dev_trait && <Badge variant="secondary">{recruit.dev_trait}</Badge>}
              <div className="flex items-center gap-1">
                {Array.from({ length: recruit.recruit_stars || 0 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              <span><strong>Nat. Rank:</strong> #{recruit.recruit_rank_nat ?? '-'}</span>
              {recruit.speed && <span><strong>Speed:</strong> {recruit.speed}</span>}
              <span><strong>State:</strong> {recruit.state || '-'}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
              <span><strong>Height:</strong> {recruit.height || '-'}</span>
              <span><strong>Weight:</strong> {recruit.weight || '-'} lbs</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-2xl font-bold">{recruit.rating ?? '-'}</span>
              <span className="text-sm text-muted-foreground">Rating</span>
            </div>
            <Badge className="bg-green-100 text-green-800">Committed</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Commitment Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Commitment Date</span>
                <span>{recruit.commitmentDate ? new Date(recruit.commitmentDate).toLocaleDateString() : "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Early Enrollee</span>
                <span>{recruit.earlyEnrollee ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Physical & Profile</h4>
            <div className="text-sm space-y-1">
              <div><strong>Position:</strong> {recruit.position}</div>
              <div><strong>Dev Trait:</strong> {recruit.dev_trait || '-'}</div>
              <div><strong>Speed:</strong> {recruit.speed || '-'}</div>
              <div><strong>Height:</strong> {recruit.height || '-'}</div>
              <div><strong>Weight:</strong> {recruit.weight || '-'} lbs</div>
              <div><strong>State:</strong> {recruit.state || '-'}</div>
              <div><strong>National Rank:</strong> #{recruit.recruit_rank_nat ?? '-'}</div>
              <div><strong>Stars:</strong> {recruit.recruit_stars ?? '-'}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline">View Profile</Button>
        </div>
      </CardContent>
    </Card>
  );
} 