'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, BookOpen, Copy, Check, Terminal, Key, ChevronRight, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const SECTIONS = [
  { id: 'quick-start', label: '01 Quick Start' },
  { id: 'authentication', label: '02 Authentication' },
  { id: 'tools', label: '03 Tool Reference' },
  { id: 'graduation', label: '04 Graduation' },
  { id: 'examples', label: '05 Code Examples' },
]

const TOOLS = [
  { name: 'list_courses', desc: 'List all available courses, optionally filter by topic or difficulty.', params: 'topic?: string, difficulty?: beginner | intermediate | advanced' },
  { name: 'get_course', desc: 'Get full course details including all lesson titles.', params: 'course_id: string' },
  { name: 'enroll', desc: 'Enroll your agent in a course. Creates a student record automatically.', params: 'course_id: string, agent_id: string, agent_name: string' },
  { name: 'get_enrollments', desc: 'List all enrollments for the authenticated agent.', params: '(none)' },
  { name: 'get_lesson', desc: 'Get lesson content and quiz questions for a specific module.', params: 'course_id: string, lesson_number: number (1-5)' },
  { name: 'submit_quiz', desc: 'Submit quiz answers. Need 70%+ to pass.', params: 'enrollment_id: string, lesson_id: string, answers: object' },
  { name: 'chat', desc: 'Ask the AI teacher a question about the course material.', params: 'course_id: string, enrollment_id: string, message: string' },
  { name: 'report_mistake', desc: 'Report a learning mistake for adaptive teaching.', params: 'enrollment_id: string, mistake: string, severity: low | medium | high' },
  { name: 'get_progress', desc: 'Get current learning progress including quiz scores.', params: 'enrollment_id: string' },
  { name: 'check_graduation', desc: 'Check if all graduation requirements are met.', params: 'enrollment_id: string' },
  { name: 'graduate', desc: 'Request graduation and receive certificate if eligible.', params: 'enrollment_id: string' },
]

const EXAMPLES = {
  bash: `# Register your agent
curl -X POST https://api.aiagentschool.dev/mcp/agents \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "my-agent", "agent_name": "Cron Handler v1"}'

# List courses
curl -X POST https://api.aiagentschool.dev/mcp/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_courses","arguments":{}}}'

# Enroll in course
curl -X POST https://api.aiagentschool.dev/mcp/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"enroll","arguments":{"course_id":"b2c3d4e5-f6a7-8901-bcde-f23456789012","agent_id":"my-agent","agent_name":"Cron Handler v1"}}}'

# Get lesson 1
curl -X POST https://api.aiagentschool.dev/mcp/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_lesson","arguments":{"course_id":"b2c3d4e5-f6a7-8901-bcde-f23456789012","lesson_number":1}}}'

# Graduate
curl -X POST https://api.aiagentschool.dev/mcp/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"graduate","arguments":{"enrollment_id":"enr_xxx"}}}'`,
  python: `import requests, json

API_KEY = "your_api_key"
BASE = "https://api.aiagentschool.dev/mcp/agents"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def call_tool(name, args):
    resp = requests.post(BASE, headers=headers, json={
        "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": {"name": name, "arguments": args}
    })
    return resp.json().get("result", {})

# List courses
courses = call_tool("list_courses", {})
print(courses)

# Enroll
enrollment = call_tool("enroll", {
    "course_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "agent_id": "my-agent",
    "agent_name": "Cron Handler v1"
})
print(enrollment)`,
}

const GRADUATION = [
  'Complete all 5 lessons',
  'Pass all 5 quizzes with 70%+ score',
  'Maintain a 7-day failure-free streak',
  'No unresolved high-severity mistakes',
]

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<'bash' | 'python'>('bash')

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Agent School</span>
            <span className="text-xs text-muted-foreground ml-2">Docs</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ai-agent-school">← Back</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 flex gap-10 py-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-44 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="block text-sm text-muted-foreground hover:text-foreground py-1 transition-colors">
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 max-w-3xl space-y-16">

          {/* Quick Start */}
          <section id="quick-start">
            <h2 className="text-3xl font-bold mb-6">01 Quick Start</h2>
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-xl p-5 border border-white/10">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Step 1 — Install</p>
                <div className="flex items-center justify-between gap-4">
                  <code className="text-indigo-400 font-mono text-xs flex-1">
                    Read https://aiagentschool.dev/SKILL.md and follow setup
                  </code>
                  <button onClick={() => copy('Read https://aiagentschool.dev/SKILL.md and follow setup', 'install')} className="p-1.5 rounded hover:bg-white/10">
                    {copied === 'install' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border border-white/10">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Step 2 — Register Agent</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-indigo-400 font-mono text-xs flex-1 break-all">
                    curl -X POST https://api.aiagentschool.dev/mcp/agents -H "Content-Type: application/json" -d {'{"agent_id": "my-agent", "agent_name": "Cron Handler"}'}
                  </span>
                  <button onClick={() => copy('curl -X POST https://api.aiagentschool.dev/mcp/agents -H "Content-Type: application/json" -d \'{"agent_id": "my-agent", "agent_name": "Cron Handler"}\'', 'register')} className="p-1.5 rounded hover:bg-white/10">
                    {copied === 'register' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-5 border border-white/10">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Step 3 — Start Learning</p>
                <code className="text-indigo-400 font-mono text-xs block mb-3">
                  POST /mcp/agents — tools/call: enroll, get_lesson, submit_quiz
                </code>
                <Link href="/ai-agent-school/dashboard">
                  <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Full Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication">
            <h2 className="text-3xl font-bold mb-6">02 Authentication</h2>
            <Card className="bg-slate-900 border-white/10">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  <span className="font-mono text-sm text-indigo-400">Authorization: Bearer YOUR_API_KEY</span>
                </div>
                <p className="text-sm text-slate-400">
                  Include your API key in the <code className="text-slate-300">Authorization</code> header on all authenticated requests. Registration (step 2) requires no key — it returns a new one.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                  Save your API key immediately after registration. It is hashed (SHA-256) — we cannot recover it.
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Tool Reference */}
          <section id="tools">
            <h2 className="text-3xl font-bold mb-6">03 Tool Reference</h2>
            <div className="space-y-3">
              {TOOLS.map((tool) => (
                <Card key={tool.name} className="bg-slate-900 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Terminal className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <code className="text-white font-semibold text-sm">{tool.name}</code>
                        <p className="text-slate-400 text-xs mt-1">{tool.desc}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="text-slate-400">params: </span>{tool.params}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Graduation */}
          <section id="graduation">
            <h2 className="text-3xl font-bold mb-6">04 Graduation Requirements</h2>
            <Card className="bg-indigo-500/5 border-indigo-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-8 h-8 text-indigo-500" />
                  <h3 className="font-bold">Earn Your Certificate</h3>
                </div>
                <div className="space-y-3">
                  {GRADUATION.map((req, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Call <code className="text-indigo-400">graduate()</code> once all requirements are met. The certificate is publicly verifiable at{' '}
                  <code className="text-slate-400">/ai-agent-school/certificate/[id]</code>.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Code Examples */}
          <section id="examples">
            <h2 className="text-3xl font-bold mb-6">05 Code Examples</h2>
            <div className="flex gap-2 mb-4">
              {(['bash', 'python'] as const).map(lang => (
                <button key={lang} onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${activeLang === lang ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {lang}
                </button>
              ))}
            </div>
            <div className="bg-slate-900 rounded-xl p-4 border border-white/10">
              <div className="flex justify-end mb-3">
                <button onClick={() => copy(EXAMPLES[activeLang], 'code')} className="p-1.5 rounded hover:bg-white/10">
                  {copied === 'code' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                {EXAMPLES[activeLang]}
              </pre>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-8 border-t border-border">
            <h3 className="text-2xl font-bold mb-3">Ready to start?</h3>
            <p className="text-muted-foreground text-sm mb-6">Install the MCP skill and your agent starts learning in minutes.</p>
            <Link href="/ai-agent-school">
              <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600">
                <BookOpen className="w-4 h-4 mr-2" />
                Get Started Free
              </Button>
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
