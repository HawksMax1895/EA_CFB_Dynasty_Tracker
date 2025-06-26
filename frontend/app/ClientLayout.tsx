"use client";
import React, { useEffect } from "react";
import { SeasonProvider, useSeason } from "@/context/SeasonContext";
import { Navigation } from "@/components/navigation";
import { fetchTeams } from "@/lib/api";
import { Team } from "@/types";

const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUserTeam } = useSeason();
  
    useEffect(() => {
      async function loadUserTeam() {
        try {
          const allTeams = await fetchTeams();
          const userControlledTeam = allTeams.find((t: Team) => (t as any).is_user_controlled);
          if (userControlledTeam) {
            setUserTeam(userControlledTeam);
          }
        } catch (error) {
          console.error("Failed to fetch user team:", error);
        }
      }
      loadUserTeam();
    }, [setUserTeam]);
  
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