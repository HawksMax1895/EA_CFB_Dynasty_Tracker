"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransferForm {
  name: string;
  position: string;
  previous_school: string;
  ovr_rating: string;
  dev_trait: string;
  height: string;
  weight: string;
  state: string;
  current_status: string;
}

interface AddTransferModalProps {
  form: TransferForm;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onFormSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

export function AddTransferModal({ form, onFormChange, onFormSubmit, loading, error }: AddTransferModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    onFormSubmit(e);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button 
        className="bg-purple-600 hover:bg-purple-700" 
        onClick={() => setIsOpen(true)}
      >
        Add Transfer
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Transfer</h2>
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
              <Label htmlFor="transfer_name">Name</Label>
              <Input
                id="transfer_name"
                name="name"
                value={form.name}
                onChange={onFormChange}
                placeholder="Player name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_position">Position</Label>
              <Input
                id="transfer_position"
                name="position"
                value={form.position}
                onChange={onFormChange}
                placeholder="QB, RB, WR, etc."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="previous_school">Previous School</Label>
            <Input
              id="previous_school"
              name="previous_school"
              value={form.previous_school}
              onChange={onFormChange}
              placeholder="University name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ovr_rating">Overall Rating</Label>
              <Input
                id="ovr_rating"
                name="ovr_rating"
                type="number"
                min={50}
                max={99}
                value={form.ovr_rating}
                onChange={onFormChange}
                placeholder="85"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_dev_trait">Dev Trait</Label>
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
              <Label htmlFor="transfer_height">Height</Label>
              <Input
                id="transfer_height"
                name="height"
                value={form.height}
                onChange={onFormChange}
                placeholder="6'2\""
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_weight">Weight</Label>
              <Input
                id="transfer_weight"
                name="weight"
                type="number"
                value={form.weight}
                onChange={onFormChange}
                placeholder="200"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_state">State</Label>
              <Input
                id="transfer_state"
                name="state"
                value={form.state}
                onChange={onFormChange}
                placeholder="TX"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_status">Current Status</Label>
            <Select 
              value={form.current_status} 
              onValueChange={(value) => {
                const event = {
                  target: { name: 'current_status', value }
                } as React.ChangeEvent<HTMLInputElement>;
                onFormChange(event);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FR">FR (Freshman)</SelectItem>
                <SelectItem value="SO">SO (Sophomore)</SelectItem>
                <SelectItem value="JR">JR (Junior)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Transfer"}
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