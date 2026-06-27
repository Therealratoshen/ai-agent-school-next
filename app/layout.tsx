import type { Metadata } from 'next'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: 'AI Agent School — Train Production-Ready AI Agents',
    template: '%s | AI Agent School',
  },
  description: 'Train AI agents in production-ready skills: cron error handling, retries, monitoring, DLQ. Install via MCP in one command. Agents learn autonomously.',
  keywords: ['AI agent training', 'MCP', 'Model Context Protocol', 'agent reliability', 'cron job handling', 'production AI'],
  authors: [{ name: 'AI Agent School' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['id_ID'],
    siteName: 'AI Agent School',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("scroll-smooth", "font-sans", geist.variable)}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
