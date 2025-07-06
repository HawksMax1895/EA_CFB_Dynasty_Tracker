import React, { Suspense } from "react";
import { useSeason } from "../context/SeasonContext";
import { useRouter, useSearchParams } from 'next/navigation';

const SeasonSelectorInner: React.FC = () => {
  const { seasons, selectedSeason, setSelectedSeason } = useSeason();
  const router = useRouter();
  const searchParams = useSearchParams();

  console.log('SeasonSelector: seasons', seasons);
  console.log('SeasonSelector: selectedSeason', selectedSeason);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const seasonId = Number(e.target.value);
    console.log('SeasonSelector: handleChange', seasonId);
    setSelectedSeason(seasonId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', String(seasonId));
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      className="border border-border rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-ring focus:border-primary bg-card text-foreground text-base"
      value={selectedSeason ?? ''}
      onChange={handleChange}
    >
      {seasons.map((season) => (
        <option key={season.season_id} value={season.season_id}>{season.year}</option>
      ))}
    </select>
  );
};

export const SeasonSelector: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SeasonSelectorInner />
    </Suspense>
  );
}; 