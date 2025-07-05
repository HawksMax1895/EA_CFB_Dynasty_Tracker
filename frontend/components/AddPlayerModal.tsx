"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Star } from "lucide-react";
import { addPlayer } from "@/lib/api";
import { useSeason } from "@/context/SeasonContext";

// --- AddRecruitModal-style recruit fields ---
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

const recruitPositions = [
  "QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"
];

const recruitStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const devTraits = [
  { value: "Normal", label: "Normal" },
  { value: "Impact", label: "Impact" },
  { value: "Star", label: "Star" },
  { value: "Elite", label: "Elite" },
];

export function AddPlayerModal({ onPlayerAdded }: { onPlayerAdded: () => void }) {
  const { selectedSeason, userTeam } = useSeason();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RecruitForm>({
    name: "",
    position: "",
    recruit_stars: 3,
    recruit_rank_nat: 0,
    recruit_rank_pos: 0,
    speed: "",
    dev_trait: "",
    height: "",
    weight: "",
    state: "",
  });

  const handleFormChange = (field: keyof RecruitForm, value: string | number) => {
    setForm({ ...form, [field]: value });
  };

  const handleStarClick = (star: number) => {
    setForm({ ...form, recruit_stars: star });
  };

  const handleHeightChange = (type: 'feet' | 'inches', value: string) => {
    // Parse and update height as 6'2" format
    const match = form.height.match(/(\d+)'(\d+)?/);
    let feet = match ? match[1] : '';
    let inches = match ? match[2] : '';
    if (type === 'feet') feet = value.replace(/\D/g, '');
    if (type === 'inches') inches = value.replace(/\D/g, '');
    let heightString = '';
    if (feet) heightString += `${feet}'`;
    if (inches) heightString += `${inches}`;
    if (feet && inches !== '') heightString += '"';
    setForm({ ...form, height: heightString });
  };

  const { height } = form;
  const match = height.match(/(\d+)'(\d+)?/);
  const feet = match ? match[1] : '';
  const inches = match ? match[2] : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await addPlayer({
        ...form,
        team_id: userTeam?.team_id || 1,
        season_id: selectedSeason || 1,
      });
      setForm({
        name: "",
        position: "",
        recruit_stars: 3,
        recruit_rank_nat: 0,
        recruit_rank_pos: 0,
        speed: "",
        dev_trait: "",
        height: "",
        weight: "",
        state: "",
      });
      setOpen(false);
      onPlayerAdded();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[var(--size-48)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Recruit Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={e => handleFormChange("name", e.target.value)} placeholder="Player Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select value={form.position} onValueChange={value => handleFormChange("position", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {recruitPositions.map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stars</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Button key={star} type="button" variant={form.recruit_stars === star ? "default" : "outline"} size="icon" onClick={() => handleStarClick(star)}>
                        <Star className={form.recruit_stars >= star ? "text-yellow-400" : "text-gray-300"} />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="recruit_rank_nat">National Rank</Label>
                    <Input id="recruit_rank_nat" type="number" value={form.recruit_rank_nat} onChange={e => handleFormChange("recruit_rank_nat", e.target.value)} placeholder="National Rank" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="recruit_rank_pos">Positional Rank</Label>
                    <Input id="recruit_rank_pos" type="number" value={form.recruit_rank_pos} onChange={e => handleFormChange("recruit_rank_pos", e.target.value)} placeholder="Positional Rank" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Speed <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input id="speed" value={form.speed} onChange={e => handleFormChange("speed", e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev_trait">Dev Trait</Label>
                  <Select value={form.dev_trait} onValueChange={value => handleFormChange("dev_trait", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dev trait" />
                    </SelectTrigger>
                    <SelectContent>
                      {devTraits.map(trait => (
                        <SelectItem key={trait.value} value={trait.value}>{trait.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 mb-2 font-semibold text-foreground">Physical Attributes</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex items-center gap-2">
                  <Label className="mb-0">Height (ft/in)</Label>
                  <Input id="height_feet" type="number" value={feet} onChange={e => handleHeightChange('feet', e.target.value)} placeholder="Feet" className="w-20 text-sm" />
                  <span>&apos;</span>
                  <Input id="height_inches" type="number" value={inches} onChange={e => handleHeightChange('inches', e.target.value)} placeholder="Inches" className="w-20 text-sm" />
                  <span>&quot;</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="mb-0">Weight</Label>
                  <Input id="weight" type="number" value={form.weight} onChange={e => handleFormChange("weight", e.target.value)} placeholder="Weight" className="w-24 text-sm" />
                  <span>lbs</span>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={form.state} onValueChange={value => handleFormChange("state", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recruitStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Player"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          {error && <div className="text-destructive text-sm mt-2">{error}</div>}
        </form>
      </DialogContent>
    </Dialog>
  );
} 