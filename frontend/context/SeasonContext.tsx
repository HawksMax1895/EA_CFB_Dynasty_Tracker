"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { Team } from "@/types";

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

  // Optionally, fetch seasons here or let pages do it and call setSeasons
  useEffect(() => {
    if (seasons.length > 0 && selectedSeason == null) {
      setSelectedSeason(seasons[seasons.length - 1].season_id);
    }
  }, [seasons]);

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