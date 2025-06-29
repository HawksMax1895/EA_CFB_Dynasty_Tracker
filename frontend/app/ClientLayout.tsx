"use client";
import React, { useEffect } from "react";
import { SeasonProvider, useSeason } from "@/context/SeasonContext";
import { Navigation } from "@/components/navigation";
import { fetchTeams, fetchSeasons } from "@/lib/api";
import { Team } from "@/types";

const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUserTeam, setSeasons } = useSeason();
  
    useEffect(() => {
      async function loadInitialData() {
        try {
          // Load seasons
          console.log('AppInitializer: Loading seasons...');
          const seasonsData = await fetchSeasons();
          console.log('AppInitializer: Seasons loaded', seasonsData);
          setSeasons(seasonsData);

          // Load user team
          console.log('AppInitializer: Loading teams...');
          const allTeams = await fetchTeams();
          const userControlledTeam = allTeams.find((t: Team) => (t as any).is_user_controlled);
          if (userControlledTeam) {
            console.log('AppInitializer: User team found', userControlledTeam);
            setUserTeam(userControlledTeam);
          }
        } catch (error) {
          console.error("Failed to fetch initial data:", error);
        }
      }
      loadInitialData();
    }, [setUserTeam, setSeasons]);
  
    return <>{children}</>;
};

const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SeasonProvider>
    <AppInitializer>
        <Navigation />
        <main>{children}</main>
    </AppInitializer>
  </SeasonProvider>
);

export default ClientLayout; 