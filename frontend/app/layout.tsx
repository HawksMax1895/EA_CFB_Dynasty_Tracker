import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "College Football Dynasty Tracker",
  description: "Track your college football dynasty progress, players, and achievements",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
