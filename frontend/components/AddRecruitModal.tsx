"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecruitForm {
  name: string;
  position: string;
  recruit_stars: number;
  recruit_rank_nat: number;
  recruit_rank_pos: number;
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

const positions = [
  "QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"
];

const states = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" }
];

export function AddRecruitModal({ form, onFormChange, onFormSubmit, loading, error }: AddRecruitModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);

  // Parse height into feet and inches for easier input
  const parseHeight = (height: string) => {
    const match = height.match(/(\d+)'(\d+)?/);
    if (match) {
      return {
        feet: match[1] || '',
        inches: match[2] || ''
      };
    }
    return { feet: '', inches: '' };
  };
  const { feet, inches } = parseHeight(form.height);

  const handleHeightChange = (type: 'feet' | 'inches', value: string) => {
    let newFeet = type === 'feet' ? value : feet;
    let newInches = type === 'inches' ? value : inches;
    // Only allow numbers
    newFeet = newFeet.replace(/\D/g, '');
    newInches = newInches.replace(/\D/g, '');
    let heightString = '';
    if (newFeet) heightString += `${newFeet}'`;
    if (newInches) heightString += `${newInches}`;
    if (newFeet && newInches !== '') heightString += '"';
    const event = {
      target: { name: 'height', value: heightString }
    } as React.ChangeEvent<HTMLInputElement>;
    onFormChange(event);
  };

  const handleSubmit = (e: React.FormEvent) => {
    onFormSubmit(e);
    setIsOpen(false);
  };

  const handlePositionSelect = (position: string) => {
    const event = {
      target: { name: 'position', value: position }
    } as React.ChangeEvent<HTMLInputElement>;
    onFormChange(event);
    setPositionOpen(false);
  };

  const handleStateSelect = (state: string) => {
    const event = {
      target: { name: 'state', value: state }
    } as React.ChangeEvent<HTMLInputElement>;
    onFormChange(event);
    setStateOpen(false);
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Add High School Recruit
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg p-lg w-full max-w-2xl mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Add New High School Recruit</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0"
            aria-label="Close"
          >
            ×
          </Button>
        </div>
        <form className="space-y-7" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium">Name</Label>
                <Input id="name" name="name" value={form.name} onChange={onFormChange} placeholder="Player name" required className="w-full" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position" className="font-medium">Position</Label>
                <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={positionOpen} className="w-full justify-between">
                      {form.position || "Select position..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search position..." />
                      <CommandList>
                        <CommandEmpty>No position found.</CommandEmpty>
                        <CommandGroup>
                          {positions.map((position) => (
                            <CommandItem key={position} value={position} onSelect={() => handlePositionSelect(position)}>
                              <Check className={cn("mr-2 h-4 w-4", form.position === position ? "opacity-100" : "opacity-0")} />
                              {position}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="recruit_stars" className="font-medium">Stars</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button type="button" key={i} onClick={() => {
                      const event = { target: { name: 'recruit_stars', value: i + 1 } } as React.ChangeEvent<HTMLInputElement>;
                      onFormChange(event);
                    }} aria-label={`Set ${i + 1} stars`}>
                      <Star className={`h-5 w-5 ${i < (form.recruit_stars || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recruit_rank_nat" className="font-medium">National Rank</Label>
                <Input id="recruit_rank_nat" name="recruit_rank_nat" type="number" value={form.recruit_rank_nat} onChange={onFormChange} placeholder="0" required className="w-full" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recruit_rank_pos" className="font-medium">Positional Rank</Label>
                <Input id="recruit_rank_pos" name="recruit_rank_pos" type="number" value={form.recruit_rank_pos || ''} onChange={onFormChange} placeholder="0" required className="w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="speed" className="font-medium">Speed <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input id="speed" name="speed" type="number" value={form.speed} onChange={onFormChange} placeholder="Optional" className="w-full" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev_trait" className="font-medium">Dev Trait</Label>
                <Select value={form.dev_trait || "None"} onValueChange={(value) => {
                  const event = { target: { name: 'dev_trait', value: value === "None" ? "" : value } } as React.ChangeEvent<HTMLInputElement>;
                  onFormChange(event);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select dev trait" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Elite">Elite</SelectItem>
                    <SelectItem value="Star">Star</SelectItem>
                    <SelectItem value="Impact">Impact</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="height_feet" className="font-medium">Height (ft/in) & Weight</Label>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2 items-center">
                  <Input id="height_feet" name="height_feet" type="number" min={4} max={7} value={feet} onChange={e => handleHeightChange('feet', e.target.value)} placeholder="6" required className="w-14" />
                  <span className="self-center">&apos;</span>
                  <Input id="height_inches" name="height_inches" type="number" min={0} max={11} value={inches} onChange={e => handleHeightChange('inches', e.target.value)} placeholder="2" required className="w-14" />
                  <span className="self-center">&quot;</span>
                </div>
                <Input id="weight" name="weight" type="number" value={form.weight} onChange={onFormChange} placeholder="200" required className="w-24 ml-4" />
                <span className="text-muted-foreground ml-1">lbs</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="font-medium">State</Label>
              <Popover open={stateOpen} onOpenChange={setStateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={stateOpen} className="w-full justify-between">
                    {form.state || "Select state..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search state..." />
                    <CommandList>
                      <CommandEmpty>No state found.</CommandEmpty>
                      <CommandGroup>
                        {states.map((state) => (
                          <CommandItem key={state.value} value={state.value} onSelect={() => handleStateSelect(state.value)}>
                            <Check className={cn("mr-2 h-4 w-4", form.state === state.value ? "opacity-100" : "opacity-0")} />
                            {state.value} - {state.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {error && <p className="text-destructive text-sm mt-4 mb-0 text-center">{error}</p>}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1 text-base h-12">
              {loading ? "Adding..." : "Add Recruit"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 text-base h-12">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 