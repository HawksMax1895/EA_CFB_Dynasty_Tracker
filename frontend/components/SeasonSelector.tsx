import React from "react";
import { useSeason } from "../context/SeasonContext";

export const SeasonSelector: React.FC = () => {
  const { seasons, selectedSeason, setSelectedSeason } = useSeason();

  return (
    <select
      className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white text-gray-800 text-base"
      value={selectedSeason ?? ''}
      onChange={e => setSelectedSeason(Number(e.target.value))}
    >
      {seasons.map((season) => (
        <option key={season.season_id} value={season.season_id}>{season.year}</option>
      ))}
    </select>
  );
}; 