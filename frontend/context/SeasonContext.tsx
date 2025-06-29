"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { Team } from "@/types";
import { useSearchParams } from 'next/navigation';

interface Season {
  season_id: number;
  year: number;
}

interface SeasonContextType {
  seasons: Season[];
  selectedSeason: number | null;
  setSelectedSeason: (id: number) => void;
  setSeasons: (seasons: Season[]) => void;
  userTeam: Team | null;
  setUserTeam: (team: Team) => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export const SeasonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log('SeasonContext: searchParams changed', searchParams.toString());
    const seasonFromUrl = searchParams.get('season');
    console.log('SeasonContext: seasonFromUrl', seasonFromUrl);
    if (seasonFromUrl) {
      if (selectedSeason !== Number(seasonFromUrl)) {
        console.log('SeasonContext: setting selectedSeason from URL', Number(seasonFromUrl));
        setSelectedSeason(Number(seasonFromUrl));
      }
    } else if (seasons.length > 0 && !selectedSeason) {
      console.log('SeasonContext: setting selectedSeason to latest season', seasons[seasons.length - 1].season_id);
      setSelectedSeason(seasons[seasons.length - 1].season_id);
    }
    // Only run when seasons or searchParams change
  }, [searchParams, seasons]);

  console.log('SeasonContext: current state', { seasons, selectedSeason });

  return (
    <SeasonContext.Provider value={{ seasons, selectedSeason, setSelectedSeason, setSeasons, userTeam, setUserTeam }}>
      {children}
    </SeasonContext.Provider>
  );
};

export function useSeason() {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error("useSeason must be used within a SeasonProvider");
  return ctx;
} 