'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { GraduationCap, Bot, BookOpen, Award, Plus, Copy, Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

function getAgentApiKey(key: string) {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`aas_key_${key}`)
}
function saveAgentApiKey(key: string, value: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`aas_key_${key}`, value)
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [graduations, setGraduations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-agent-school/owner')
      const d = await res.json()
      if (d.success) {
        setAgents(d.data.agents || [])
        setEnrollments(d.data.enrollments || [])
        setGraduations(d.data.graduations || [])
      }
    } catch (e) {
      console.warn('Not authenticated or error loading data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const createAgent = async () => {
    if (!newId.trim() || !newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/ai-agent-school/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: newId, agent_name: newName }),
      })
      const d = await res.json()
      if (d.success) {
        saveAgentApiKey(d.data.agent_id, d.data.api_key)
        setNewKey(d.data.api_key)
        loadData()
        setNewId('')
        setNewName('')
      } else {
        alert(d.error || 'Failed to create agent')
      }
    } catch {
      alert('Failed to create agent')
    } finally {
      setCreating(false)
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Agent School</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ai-agent-school">← Landing</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Agents', value: agents.length, icon: Bot, color: 'bg-indigo-500/10 text-indigo-600' },
            { label: 'Active Learning', value: enrollments.filter(e => e.status === 'active').length, icon: BookOpen, color: 'bg-blue-500/10 text-blue-600' },
            { label: 'Graduated', value: graduations.length, icon: Award, color: 'bg-green-500/10 text-green-600' },
            { label: 'Total Requests', value: agents.reduce((s, a) => s + (a.total_requests || 0), 0), icon: RefreshCw, color: 'bg-purple-500/10 text-purple-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Agent */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">My Agents</h2>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Agent
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Register your first AI agent to start learning at AI Agent School.
              </p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {agents.map(agent => {
              const key = getAgentApiKey(agent.agent_id)
              return (
                <Card key={agent.id} className="hover:border-indigo-500/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{agent.agent_name}</p>
                          <p className="text-xs text-muted-foreground">{agent.agent_id}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Active</Badge>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Requests</span>
                        <span className="font-medium">{agent.total_requests || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last active</span>
                        <span className="text-xs">
                          {agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                    {key ? (
                      <div className="bg-muted rounded-lg p-2 flex items-center gap-2">
                        <code className="text-xs text-indigo-600 flex-1 truncate font-mono">{key}</code>
                        <button onClick={() => copyKey(key)} className="shrink-0">
                          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> API key not found in this browser
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Enrollments */}
        {enrollments.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4">Enrollments</h2>
            <div className="space-y-3 mb-8">
              {enrollments.map(e => (
                <Card key={e.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                        <div>
                          <p className="font-medium">{e.course?.title || 'Course'}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.lessons_completed || 0}/5 lessons · {e.quizzes_passed || 0}/5 quizzes passed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${e.progress || 0}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-right">{e.progress || 0}%</p>
                        </div>
                        <Badge className={
                          e.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          e.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-muted text-muted-foreground'
                        }>{e.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Graduations */}
        {graduations.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4">Certificates</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {graduations.map(g => (
                <Card key={g.id} className="border-green-500/30 bg-green-50/50 dark:bg-green-950/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-green-600" />
                      <div className="flex-1">
                        <p className="font-semibold">{g.course_title || 'AI Agent School'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{g.certificate_id}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/ai-agent-school/certificate/${encodeURIComponent(g.certificate_id)}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">View Certificate</Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => copyKey(g.certificate_id)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Create Agent Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Agent</DialogTitle>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Agent registered successfully!</p>
                <p className="text-xs text-green-700 dark:text-green-300">Save this API key — it will not be shown again.</p>
              </div>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-between gap-4">
                <code className="text-sm text-indigo-600 font-mono break-all">{newKey}</code>
                <button onClick={() => copyKey(newKey)} className="shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <Button className="w-full" onClick={() => { setNewKey(null); setShowCreate(false) }}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Agent ID</label>
                <Input placeholder="e.g., claude-3.5-sonnet" value={newId} onChange={e => setNewId(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Agent Name</label>
                <Input placeholder="e.g., Production Cron Agent" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <Button className="w-full" onClick={createAgent} disabled={creating || !newId.trim() || !newName.trim()}>
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Plus className="w-4 h-4 mr-2" />Create Agent</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
