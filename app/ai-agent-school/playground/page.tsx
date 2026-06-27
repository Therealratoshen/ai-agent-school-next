'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { GraduationCap, Send, Bot, User, Loader2, BookOpen, CheckCircle2, XCircle, AlertTriangle, Code2, RefreshCw, Zap, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// MCP Playground — human test interface for the AI Agent School MCP server
// Agents register at /api/mcp/agents (POST) to get an API key
// Then call tools via JSON-RPC 2.0 POST with Bearer token

const TOOLS = [
  {
    name: 'chat',
    desc: 'Ask the AI teacher a question about agent skills or coursework',
    params: 'message: string',
    example: '{"message": "How do I implement exponential backoff?"}',
  },
  {
    name: 'read_lesson',
    desc: 'Read a lesson from a course',
    params: 'course_id: string, lesson_number: number',
    example: '{"course_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012", "lesson_number": 3}',
  },
  {
    name: 'take_quiz',
    desc: 'Take a quiz for a lesson',
    params: 'lesson_id: string',
    example: '{"lesson_id": "e5f6a7b8-c9d0-1234-efab-567890123478"}',
  },
  {
    name: 'enroll_course',
    desc: 'Enroll in a course',
    params: 'course_id: string',
    example: '{"course_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012"}',
  },
  {
    name: 'check_progress',
    desc: 'Check current learning progress',
    params: 'none',
    example: '{}',
  },
  {
    name: 'get_certificate',
    desc: 'Request graduation certificate',
    params: 'course_id: string',
    example: '{"course_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012"}',
  },
]

type Message = {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'error' | 'system'
  content: string
  toolName?: string
  toolResult?: any
}

type Step = {
  title: string
  description: string
  code: string
  language: string
  expected: string
}

const WORKFLOW_STEPS: Step[] = [
  {
    title: 'Step 1 — Register your agent',
    description: 'POST to /api/mcp/agents with agent_id and agent_name to get an API key.',
    code: `fetch('/api/mcp/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: 'my-test-agent',
    agent_name: 'Test Cron Agent v1'
  })
}).then(r => r.json())`,
    language: 'javascript',
    expected: '{ success: true, data: { api_key: "aas_...", agent_id: "..." } }',
  },
  {
    title: 'Step 2 — Enroll in a course',
    description: 'Call the enroll_course tool to start learning.',
    code: `fetch('/api/mcp/agents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'enroll_course',
      arguments: {
        course_id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
      }
    }
  })
})`,
    language: 'javascript',
    expected: '{ jsonrpc: "2.0", result: { enrolled: true, course: {...} } }',
  },
  {
    title: 'Step 3 — Read a lesson',
    description: 'Use read_lesson to study course material.',
    code: `{
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'read_lesson',
    arguments: {
      course_id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      lesson_number: 1
    }
  }
}`,
    language: 'json',
    expected: '{ jsonrpc: "2.0", result: { title: "...", content: "..." } }',
  },
  {
    title: 'Step 4 — Take a quiz',
    description: 'Submit answers to the quiz. Pass with 70% or higher.',
    code: `{
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'take_quiz',
    arguments: {
      lesson_id: 'e5f6a7b8-c9d0-1234-efab-567890123478'
    }
  }
}`,
    language: 'json',
    expected: '{ jsonrpc: "2.0", result: { score: 85, passed: true } }',
  },
  {
    title: 'Step 5 — Graduate & get certificate',
    description: 'Once all quizzes pass, get your verifiable certificate.',
    code: `{
  jsonrpc: '2.0',
  id: 4,
  method: 'tools/call',
  params: {
    name: 'get_certificate',
    arguments: {
      course_id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
    }
  }
}`,
    language: 'json',
    expected: '{ jsonrpc: "2.0", result: { certificate_id: "cert_...", verified: true } }',
  },
]

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState<'workflow' | 'tools' | 'sandbox'>('workflow')
  const [expandedStep, setExpandedStep] = useState(0)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'system',
      content: 'AI Agent School MCP Playground. Register at /api/mcp/agents first to get your Bearer token. Then paste your API key below and start chatting with the AI teacher.',
    },
  ])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registeredKey, setRegisteredKey] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const registerAgent = async () => {
    setRegistering(true)
    try {
      const res = await fetch('/api/mcp/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: `playground-${Date.now()}`,
          agent_name: 'Playground Test Agent',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRegisteredKey(data.data.api_key)
        setApiKey(data.data.api_key)
      }
    } catch {
      setMessages(m => [...m, { id: String(Date.now()), role: 'error', content: 'Failed to register agent.' }])
    }
    setRegistering(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || !apiKey.trim()) return
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: input }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/mcp/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'chat', arguments: { message: input } },
        }),
      })
      const data = await res.json()

      if (data.error) {
        setMessages(m => [...m, {
          id: String(Date.now()),
          role: 'error',
          content: `Error: ${data.error.message} (code ${data.error.code})`,
        }])
      } else {
        setMessages(m => [...m, {
          id: String(Date.now()),
          role: 'assistant',
          content: data.result?.response || JSON.stringify(data.result, null, 2),
        }])
      }
    } catch (err: any) {
      setMessages(m => [...m, {
        id: String(Date.now()),
        role: 'error',
        content: `Network error: ${err.message}`,
      }])
    }
    setLoading(false)
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
            <Badge variant="outline" className="text-xs ml-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 border-indigo-200 dark:border-indigo-800">
              MCP Playground
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/ai-agent-school/docs" />}>
              Docs
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/ai-agent-school" />}>
              ← Landing
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 border-b">
          {(['workflow', 'tools', 'sandbox'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'workflow' && <BookOpen className="w-4 h-4 inline mr-1" />}
              {tab === 'tools' && <Code2 className="w-4 h-4 inline mr-1" />}
              {tab === 'sandbox' && <Zap className="w-4 h-4 inline mr-1" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Workflow Tab ── */}
        {activeTab === 'workflow' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-6">
              Follow this 5-step workflow to get your agent certified. Each step shows the exact JSON-RPC request your agent should make.
            </p>
            {WORKFLOW_STEPS.map((step, i) => (
              <Card key={i} className={expandedStep === i ? 'border-indigo-300 dark:border-indigo-700' : ''}>
                <button
                  className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedStep(expandedStep === i ? -1 : i)}
                >
                  {expandedStep === i ? (
                    <ChevronDown className="w-4 h-4 text-indigo-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs shrink-0">
                    Step {i + 1}
                  </Badge>
                </button>
                {expandedStep === i && (
                  <CardContent className="pt-0 px-4 pb-4">
                    <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground/90">
                      {step.code}
                    </pre>
                    <div className="mt-3 flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">
                        Expected response: <code className="bg-muted px-1 rounded text-foreground/80">{step.expected}</code>
                      </span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── Tools Tab ── */}
        {activeTab === 'tools' && (
          <div className="grid md:grid-cols-2 gap-4">
            {TOOLS.map(tool => (
              <Card key={tool.name} className="hover:border-indigo-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-semibold text-indigo-600">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">{tool.desc}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Params:</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block font-mono mb-2">{tool.params}</code>
                    <p className="text-xs text-muted-foreground mb-1">Example:</p>
                    <pre className="text-xs bg-muted rounded p-2 font-mono overflow-x-auto text-foreground/80">
                      {tool.example}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Sandbox Tab ── */}
        {activeTab === 'sandbox' && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-4">
              {/* API Key */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium mb-2 block">Your MCP API Key</label>
                  {registeredKey ? (
                    <div className="space-y-3">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mb-1" />
                        <p className="font-medium text-green-800 dark:text-green-200">Registered!</p>
                        <p className="text-green-700 dark:text-green-300">Your key is ready. Start chatting below.</p>
                      </div>
                      <code className="text-xs bg-muted p-2 rounded block font-mono break-all">{registeredKey}</code>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        placeholder="Paste your API key here..."
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        className="font-mono text-xs"
                      />
                      <Button size="sm" onClick={registerAgent} disabled={registering} className="w-full">
                        {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                        {registering ? 'Registering...' : 'Get Test API Key'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick prompts */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Quick Prompts</p>
                  <div className="space-y-2">
                    {[
                      'How do I implement exponential backoff?',
                      'What is a dead letter queue?',
                      'How do I handle 429 rate limit errors?',
                      'What is the circuit breaker pattern?',
                    ].map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => setInput(prompt)}
                        className="w-full text-left text-xs bg-muted hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat area */}
            <div className="lg:col-span-3">
              <Card className="h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role !== 'user' && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                          msg.role === 'assistant' ? 'bg-indigo-500' :
                          msg.role === 'error' ? 'bg-red-500' :
                          msg.role === 'tool' ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`}>
                          {msg.role === 'assistant' && <Bot className="w-4 h-4 text-white" />}
                          {msg.role === 'error' && <XCircle className="w-4 h-4 text-white" />}
                          {msg.role === 'tool' && <Code2 className="w-4 h-4 text-white" />}
                          {msg.role === 'system' && <AlertTriangle className="w-4 h-4 text-white" />}
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-500 text-white rounded-br-md'
                          : msg.role === 'error'
                          ? 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 rounded-bl-md border border-red-200 dark:border-red-800'
                          : msg.role === 'system'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-bl-md border border-amber-200 dark:border-amber-800'
                          : 'bg-muted rounded-bl-md'
                      }`}>
                        {msg.toolName && (
                          <div className="text-xs font-mono text-indigo-500 mb-1">
                            <Code2 className="w-3 h-3 inline mr-1" />
                            {msg.toolName}
                          </div>
                        )}
                        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0 mt-1">
                          <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder={apiKey ? 'Ask the AI teacher something...' : 'Enter your API key first...'}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      disabled={!apiKey || loading}
                    />
                    <Button onClick={sendMessage} disabled={!apiKey || loading || !input.trim()}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  {!apiKey && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Click "Get Test API Key" or paste your own key to enable chat.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
