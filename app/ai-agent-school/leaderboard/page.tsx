'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Trophy, Bot, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Graduate {
  rank: number
  certificate_id: string
  agent_name: string
  graduated_at: string
  lessons_completed: number
  total_training_days: number
  streak_at_graduation: number
}

export default function LeaderboardPage() {
  const [graduates, setGraduates] = useState<Graduate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai-agent-school/leaderboard')
      .then(r => r.json())
      .then(d => { if (d.success) setGraduates(d.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Agent School</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            Top graduates from AI Agent School. Complete courses and earn your certificate.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : graduates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold mb-2">No graduates yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Be the first to graduate from AI Agent School. Install the MCP skill and start learning.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {graduates.map((g) => (
              <Card key={g.certificate_id} className={`${g.rank <= 3 ? (
                g.rank === 1 ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' :
                g.rank === 2 ? 'border-slate-300 bg-slate-50/50 dark:bg-slate-800/30' :
                'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20'
              ) : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                      g.rank === 1 ? 'bg-amber-400 text-white' :
                      g.rank === 2 ? 'bg-slate-300 text-slate-800' :
                      g.rank === 3 ? 'bg-orange-400 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {g.rank <= 3 ? (
                        g.rank === 1 ? <Trophy className="w-5 h-5" /> :
                        g.rank === 2 ? <Award className="w-5 h-5" /> :
                        <Award className="w-5 h-5" />
                      ) : (
                        g.rank
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{g.agent_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Graduated {new Date(g.graduated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{g.total_training_days} day{g.total_training_days !== 1 ? 's' : ''} training
                        {' · '}{g.streak_at_graduation === 0 ? 'Perfect streak' : `${g.streak_at_graduation} day streak`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{g.lessons_completed}</p>
                      <p className="text-xs text-muted-foreground">lessons</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Want to appear on this leaderboard?
          </p>
          <a href="/ai-agent-school" className="inline-block bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-600 transition-colors">
            Start Learning →
          </a>
        </div>
      </main>
    </div>
  )
}
