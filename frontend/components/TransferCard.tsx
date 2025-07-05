import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, GraduationCap, Building2, Star } from "lucide-react";

interface TransferCardProps {
  transfer: {
    name: string;
    position: string;
    previous_school?: string;
    ovr_rating?: string;
    recruit_stars?: number;
    dev_trait?: string;
    height?: string;
    weight?: string;
    state?: string;
    current_status?: string;
    transferDate?: string;
  };
}

export function TransferCard({ transfer }: TransferCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{transfer.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{transfer.position}</Badge>
              {transfer.dev_trait && <Badge variant="secondary">{transfer.dev_trait}</Badge>}
              <Badge className="bg-primary/20 text-primary">
                <GraduationCap className="h-3 w-3 mr-1" />
                Transfer
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              <span><strong>Previous School:</strong> {transfer.previous_school || '-'}</span>
              {transfer.height && <span><strong>Height:</strong> {transfer.height}</span>}
              {transfer.weight && <span><strong>Weight:</strong> {transfer.weight} lbs</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
              {transfer.state && <span><strong>State:</strong> {transfer.state}</span>}
              <span><strong>Current Status:</strong> {transfer.current_status}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-2xl font-bold">{transfer.ovr_rating ?? '-'}</span>
              <span className="text-sm text-muted-foreground">OVR</span>
            </div>
            {transfer.recruit_stars && (
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: transfer.recruit_stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            )}
            <Badge className="bg-primary/20 text-primary">
              <Building2 className="h-3 w-3 mr-1" />
              Committed
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Transfer Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Previous School</span>
                <span>{transfer.previous_school || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Status</span>
                <span>{transfer.current_status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Transfer Date</span>
                <span>{transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString() : "-"}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Physical & Profile</h4>
            <div className="text-sm space-y-1">
              <div><strong>Position:</strong> {transfer.position}</div>
              <div><strong>Dev Trait:</strong> {transfer.dev_trait || '-'}</div>
              <div><strong>Overall Rating:</strong> {transfer.ovr_rating || '-'}</div>
              <div><strong>Height:</strong> {transfer.height || '-'}</div>
              <div><strong>Weight:</strong> {transfer.weight || '-'} lbs</div>
              <div><strong>State:</strong> {transfer.state || '-'}</div>
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