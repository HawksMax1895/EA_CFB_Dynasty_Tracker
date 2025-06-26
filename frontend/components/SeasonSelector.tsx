import React from "react";
import { useSeason } from "../context/SeasonContext";
import { useRouter, useSearchParams } from 'next/navigation';

export const SeasonSelector: React.FC = () => {
  const { seasons, selectedSeason, setSelectedSeason } = useSeason();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const seasonId = Number(e.target.value);
    setSelectedSeason(seasonId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', String(seasonId));
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white text-gray-800 text-base"
      value={selectedSeason ?? ''}
      onChange={handleChange}
    >
      {seasons.map((season) => (
        <option key={season.season_id} value={season.season_id}>{season.year}</option>
      ))}
    </select>
  );
}; 