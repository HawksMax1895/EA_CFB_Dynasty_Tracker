"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";

interface RecruitForm {
  name: string;
  position: string;
  recruit_stars: number;
  recruit_rank_nat: number;
  speed: string;
  dev_trait: string;
  height: string;
  weight: string;
  state: string;
}

interface AddRecruitModalProps {
  form: RecruitForm;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onFormSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

export function AddRecruitModal({ form, onFormChange, onFormSubmit, loading, error }: AddRecruitModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    onFormSubmit(e);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button 
        className="bg-blue-600 hover:bg-blue-700" 
        onClick={() => setIsOpen(true)}
      >
        Add High School Recruit
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New High School Recruit</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={onFormChange}
                placeholder="Player name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                value={form.position}
                onChange={onFormChange}
                placeholder="QB, RB, WR, etc."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recruit_stars">Stars</Label>
              <Select 
                value={form.recruit_stars.toString()} 
                onValueChange={(value) => {
                  const event = {
                    target: { name: 'recruit_stars', value: parseInt(value) }
                  } as React.ChangeEvent<HTMLInputElement>;
                  onFormChange(event);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(star => (
                    <SelectItem key={star} value={star.toString()}>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: star }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span>{star} Star{star > 1 ? 's' : ''}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recruit_rank_nat">National Rank</Label>
              <Input
                id="recruit_rank_nat"
                name="recruit_rank_nat"
                type="number"
                value={form.recruit_rank_nat}
                onChange={onFormChange}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="speed">Speed</Label>
              <Input
                id="speed"
                name="speed"
                type="number"
                value={form.speed}
                onChange={onFormChange}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev_trait">Dev Trait</Label>
              <Select 
                value={form.dev_trait} 
                onValueChange={(value) => {
                  const event = {
                    target: { name: 'dev_trait', value }
                  } as React.ChangeEvent<HTMLInputElement>;
                  onFormChange(event);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dev trait" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="Elite">Elite</SelectItem>
                  <SelectItem value="Star">Star</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                name="height"
                value={form.height}
                onChange={onFormChange}
                placeholder={"6'2\""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                value={form.weight}
                onChange={onFormChange}
                placeholder="200"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                value={form.state}
                onChange={onFormChange}
                placeholder="TX"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Recruit"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      </div>
    </div>
  );
} 