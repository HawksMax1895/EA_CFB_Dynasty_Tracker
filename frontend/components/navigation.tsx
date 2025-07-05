"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, Users, Trophy, Award, TrendingUp, Target, Menu, X, Cog } from "lucide-react"
import { useState } from "react"
import { SeasonSelector } from "./SeasonSelector"
import { useSeason } from "@/context/SeasonContext"
import { ThemeToggle } from "./theme-toggle"
import Image from "next/image"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Players", href: "/players", icon: Users },
  { name: "Games", href: "/games", icon: Trophy },
  { name: "Awards", href: "/awards", icon: Award },
  { name: "Rankings", href: "/rankings", icon: TrendingUp },
  { name: "Recruiting", href: "/recruiting", icon: Target },
  { name: "Settings", href: "/settings", icon: Cog },
]

export function Navigation() {
  const pathname = usePathname()
  const { userTeam, selectedSeason } = useSeason();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Helper to append ?season=... to links
  const getSeasonHref = (href: string) => {
    if (selectedSeason) {
      const url = new URL(href, 'http://dummy');
      url.searchParams.set('season', String(selectedSeason));
      return url.pathname + url.search;
    }
    return href;
  };

  return (
    <nav className="bg-card shadow-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href={getSeasonHref("/")} className="flex items-center gap-3">
              {userTeam?.logo_url && (
                <Image
                  src={userTeam.logo_url}
                  alt={userTeam.team_name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded object-cover border border-muted"
                />
              )}
              <span className="text-2xl font-bold text-foreground leading-tight">CFB Dynasty</span>
              {userTeam?.team_name && (
                <span className="ml-2 text-base text-muted-foreground font-normal hidden sm:inline">({userTeam.team_name})</span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={getSeasonHref(item.href)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <SeasonSelector />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <ThemeToggle />
            <SeasonSelector />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={getSeasonHref(item.href)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
