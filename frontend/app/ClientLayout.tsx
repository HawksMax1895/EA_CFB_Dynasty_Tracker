"use client";
import React from "react";
import { SeasonProvider } from "@/context/SeasonContext";
import { Navigation } from "@/components/navigation";
import { SeasonSelector } from "@/components/SeasonSelector";

const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SeasonProvider>
    <Navigation />
    <div className="w-full flex justify-center py-4 bg-white border-b">
      <SeasonSelector />
    </div>
    <main>{children}</main>
  </SeasonProvider>
);

export default ClientLayout; 