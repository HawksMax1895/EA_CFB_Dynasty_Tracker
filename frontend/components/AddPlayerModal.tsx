"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Star } from "lucide-react";
import { addPlayer } from "@/lib/api";
import { useSeason } from "@/context/SeasonContext";

interface PlayerFormData {
  name: string;
  position: string;
  recruit_stars: number;
  current_year: string;
  ovr_rating: number;
  speed: number;
  dev_trait: string;
  height_feet: string;
  height_inches: string;
  weight: number;
  state: string;
  team_id: number;
  season_id: number;
}

const POSITIONS = [
  "QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS", "K", "P"
];

const DEV_TRAITS = [
  { value: "Normal", label: "Normal" },
  { value: "Star", label: "Star" },
  { value: "Impact", label: "Impact" },
  { value: "Superstar", label: "Superstar" },
];

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function AddPlayerModal({ onPlayerAdded }: { onPlayerAdded: () => void }) {
  const { selectedSeason, userTeam } = useSeason();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerFormData>({
    name: "",
    position: "",
    recruit_stars: 3,
    current_year: "FR",
    ovr_rating: 70,
    speed: 70,
    dev_trait: "Normal",
    height_feet: "6",
    height_inches: "0",
    weight: 200,
    state: "",
    team_id: userTeam?.team_id || 1,
    season_id: selectedSeason || 1,
  });

  const handleFormChange = (field: keyof PlayerFormData, value: string | number) => {
    setForm({ ...form, [field]: value });
  };

  const handleStarClick = (star: number) => {
    setForm({ ...form, recruit_stars: star });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Combine feet and inches for height
    const height = `${form.height_feet}'${form.height_inches}\"`;
    try {
      await addPlayer({
        ...form,
        height,
      });
      setForm({
        name: "",
        position: "",
        recruit_stars: 3,
        current_year: "FR",
        ovr_rating: 70,
        speed: 70,
        dev_trait: "Normal",
        height_feet: "6",
        height_inches: "0",
        weight: 200,
        state: "",
        team_id: userTeam?.team_id || 1,
        season_id: selectedSeason || 1,
      });
      setOpen(false);
      onPlayerAdded();
    } catch (err: any) {
      setError(err.message);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="Player Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select value={form.position} onValueChange={(value) => handleFormChange("position", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_year">Class Year</Label>
                  <Select value={form.current_year} onValueChange={(value) => handleFormChange("current_year", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FR">Freshman</SelectItem>
                      <SelectItem value="SO">Sophomore</SelectItem>
                      <SelectItem value="JR">Junior</SelectItem>
                      <SelectItem value="SR">Senior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={form.state} onValueChange={(value) => handleFormChange("state", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Physical Attributes */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Physical Attributes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height_feet">Height</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="height_feet"
                      type="number"
                      min="4"
                      max="7"
                      value={form.height_feet}
                      onChange={(e) => handleFormChange("height_feet", e.target.value)}
                      placeholder="Feet"
                      className="w-16"
                    />
                    <span>ft</span>
                    <Input
                      id="height_inches"
                      type="number"
                      min="0"
                      max="11"
                      value={form.height_inches}
                      onChange={(e) => handleFormChange("height_inches", e.target.value)}
                      placeholder="Inches"
                      className="w-16"
                    />
                    <span>in</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={form.weight}
                    onChange={(e) => handleFormChange("weight", parseInt(e.target.value))}
                    min="150"
                    max="350"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Ratings & Development */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Ratings & Development</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ovr_rating">Overall Rating</Label>
                  <Input
                    id="ovr_rating"
                    type="number"
                    value={form.ovr_rating}
                    onChange={(e) => handleFormChange("ovr_rating", parseInt(e.target.value))}
                    min="50"
                    max="99"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev_trait">Development Trait</Label>
                  <Select value={form.dev_trait} onValueChange={(value) => handleFormChange("dev_trait", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEV_TRAITS.map((trait) => (
                        <SelectItem key={trait.value} value={trait.value}>
                          {trait.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recruit Stars</Label>
                  <div className="flex gap-1 items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => handleStarClick(i + 1)}
                        className="focus:outline-none"
                        tabIndex={0}
                        aria-label={`Set ${i + 1} stars`}
                      >
                        <Star
                          className={`h-6 w-6 cursor-pointer transition-colors ${
                            i < form.recruit_stars
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speed">Speed Rating</Label>
                  <Input
                    id="speed"
                    type="number"
                    value={form.speed}
                    onChange={(e) => handleFormChange("speed", parseInt(e.target.value))}
                    min="50"
                    max="99"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Error Display */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Player"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 