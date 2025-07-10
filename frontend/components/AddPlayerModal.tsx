"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Star } from "lucide-react";
import { addPlayer } from "@/lib/api";
import { useSeason } from "@/context/SeasonContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// --- AddRecruitModal-style recruit fields ---
interface RecruitForm {
  name: string;
  position: string;
  recruit_stars: number;
  speed: string;
  dev_trait: string;
  height: string;
  weight: string;
  state: string;
  ovr_rating: number;
  redshirt_used: boolean;
  current_year: string; // 'FR', 'SO', 'JR', or 'SR'
}

// Use the same positions array as AddRecruitModal
const positions = [
  "QB", "RB", "FB", "WR", "TE", "RT", "RG", "C", "LG", "LT", "LEDG", "REDG", "DT", "SAM", "MIKE", "WILL", "CB", "FS", "SS", "K", "P"
];

const states = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" }, { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" }, { value: "DC", label: "District of Columbia" }
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
    speed: "",
    dev_trait: "",
    height: "",
    weight: "",
    state: "",
    ovr_rating: 70,
    redshirt_used: false,
    current_year: "FR",
  });

  const handleFormChange = (field: keyof RecruitForm, value: string | number | boolean) => {
    setForm({ ...form, [field]: value });
  };

  const handleStarClick = (star: number) => {
    setForm({ ...form, recruit_stars: star });
  };

  const handleHeightChange = (type: 'feet' | 'inches', value: string) => {
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
        ovr_rating: Number(form.ovr_rating),
        team_id: userTeam?.team_id || 1,
        season_id: selectedSeason || 1,
        current_year: form.current_year,
      });
      setForm({
        name: "",
        position: "",
        recruit_stars: 3,
        speed: "",
        dev_trait: "",
        height: "",
        weight: "",
        state: "",
        ovr_rating: 70,
        redshirt_used: false,
        current_year: "FR",
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={e => handleFormChange("name", e.target.value)} placeholder="Player Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
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
                              <CommandItem key={position} value={position} onSelect={() => handleFormChange("position", position)}>
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
                <div className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="current_year">Class</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                          {form.current_year || "Select class..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search class..." />
                          <CommandList>
                            <CommandEmpty>No class found.</CommandEmpty>
                            <CommandGroup>
                              {['FR', 'SO', 'JR', 'SR'].map(cls => (
                                <CommandItem key={cls} value={cls} onSelect={() => handleFormChange("current_year", cls)}>
                                  <Check className={cn("mr-2 h-4 w-4", form.current_year === cls ? "opacity-100" : "opacity-0")} />
                                  {cls}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox id="redshirt_used" checked={form.redshirt_used} onCheckedChange={checked => handleFormChange("redshirt_used", !!checked)} />
                    <Label htmlFor="redshirt_used" className="text-sm">RS&nbsp;Used</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ovr_rating">Overall Rating (OVR)</Label>
                  <Input
                    id="ovr_rating"
                    type="number"
                    value={form.ovr_rating}
                    onChange={e => handleFormChange("ovr_rating", e.target.value)}
                    placeholder="OVR"
                    min={0}
                    max={99}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recruit_stars" className="font-medium">Stars</Label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button type="button" key={i} onClick={() => handleFormChange('recruit_stars', i + 1)} aria-label={`Set ${i + 1} stars`}>
                        <Star className={`h-5 w-5 ${i < (form.recruit_stars || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Speed <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input id="speed" value={form.speed} onChange={e => handleFormChange("speed", e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev_trait">Dev Trait</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {form.dev_trait || "Select dev trait..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search dev trait..." />
                        <CommandList>
                          <CommandEmpty>No dev trait found.</CommandEmpty>
                          <CommandGroup>
                            {devTraits.map(trait => (
                              <CommandItem key={trait.value} value={trait.value} onSelect={() => handleFormChange("dev_trait", trait.value)}>
                                <Check className={cn("mr-2 h-4 w-4", form.dev_trait === trait.value ? "opacity-100" : "opacity-0")} />
                                {trait.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="mt-6 mb-2 font-semibold text-foreground">Physical Attributes</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <Label className="block mb-1">Height (ft/in)</Label>
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      id="height_feet"
                      type="number"
                      value={feet}
                      onChange={e => handleHeightChange('feet', e.target.value)}
                      placeholder="Feet"
                      className="w-24 text-base px-4 py-2"
                      min={0}
                    />
                    <span className="text-lg font-medium">'</span>
                    <Input
                      id="height_inches"
                      type="number"
                      value={inches}
                      onChange={e => handleHeightChange('inches', e.target.value)}
                      placeholder="Inches"
                      className="w-24 text-base px-4 py-2"
                      min={0}
                      max={11}
                    />
                    <span className="text-lg font-medium">"</span>
                  </div>
                </div>
                <div>
                  <Label className="block mb-1">Weight</Label>
                  <div className="flex items-center w-full">
                    <Input
                      id="weight"
                      type="number"
                      value={form.weight}
                      onChange={e => handleFormChange("weight", e.target.value)}
                      placeholder="Weight"
                      className="w-full text-sm"
                      min={0}
                    />
                    <span className="ml-1 text-sm text-muted-foreground">lbs</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <Label htmlFor="state">State</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {form.state
                        ? `${form.state} - ${states.find(s => s.value === form.state)?.label ?? ''}`
                        : "Select state..."}
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
                            <CommandItem key={state.value} value={state.value} onSelect={() => handleFormChange("state", state.value)}>
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