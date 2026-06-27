'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GraduationCap, Bot, BookOpen, Award, Star, Trophy, CheckCircle2, Circle, TrendingUp, Clock, Target, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// Skill tree — shows agent learning path across all courses
const SKILL_TREE = [
  {
    category: 'Reliability',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: '🛡️',
    skills: [
      { id: 'cron-handling', name: 'Cron Job Handling', level: 1, status: 'completed', course: 'b2c3d4e5-f6a7-8901-bcde-f23456789012', desc: 'Handle scheduled tasks, detect silent failures, implement DLQ' },
      { id: 'api-error-recovery', name: 'API Error Recovery', level: 2, status: 'available', course: 'c2a3b4c5-d6e7-8901-f012-345678901234', desc: 'Circuit breakers, rate limits, graceful degradation' },
    ],
  },
  {
    category: 'Coordination',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: '🔗',
    skills: [
      { id: 'multi-agent', name: 'Multi-Agent Coordination', level: 3, status: 'available', course: 'c3a4b5c6-d7e8-9012-f123-456789012345', desc: 'Task routing, shared state, conflict resolution' },
    ],
  },
  {
    category: 'Production',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: '⚡',
    skills: [
      { id: 'monitoring', name: 'Production Monitoring', level: 1, status: 'available', course: 'b2c3d4e5-f6a7-8901-bcde-f23456789012', desc: 'Alerting, structured logging, dashboards' },
    ],
  },
]

const COURSES = [
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    title: 'Cron Job Handling',
    difficulty: 'beginner',
    teacher: 'Production Reliability Expert',
    lessons: 5,
    quizzes: 4,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    progress: 60,
    enrolled: true,
    nextLesson: 3,
    nextLessonTitle: 'Retry with Exponential Backoff',
    completedLessons: ['Introduction to Cron Jobs', 'Detecting Silent Failures'],
    xp: 240,
  },
  {
    id: 'c2a3b4c5-d6e7-8901-f012-345678901234',
    title: 'API Error Recovery',
    difficulty: 'intermediate',
    teacher: 'API Reliability Architect',
    lessons: 5,
    quizzes: 4,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-200 dark:border-amber-800',
    progress: 0,
    enrolled: false,
    nextLesson: 1,
    nextLessonTitle: 'The Three Types of API Failures',
    completedLessons: [],
    xp: 0,
  },
  {
    id: 'c3a4b5c6-d7e8-9012-f123-456789012345',
    title: 'Multi-Agent Coordination',
    difficulty: 'advanced',
    teacher: 'Multi-Agent Systems Engineer',
    lessons: 5,
    quizzes: 4,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-800',
    progress: 0,
    enrolled: false,
    nextLesson: 1,
    nextLessonTitle: 'When to Use Multiple Agents',
    completedLessons: [],
    xp: 0,
  },
]

export default function ProfilePage() {
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai-agent-school/owner')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data.agents?.length > 0) {
          setSelectedAgent(d.data.agents[0])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalXP = COURSES.reduce((s, c) => s + c.xp, 0)
  const level = Math.floor(totalXP / 200) + 1
  const xpToNext = 200 - (totalXP % 200)

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
              Skill Tree
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/ai-agent-school/playground" />}>
              Playground
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/ai-agent-school" />}>
              ← Landing
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Agent Hero */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-10" />
          <Card className="relative border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-background flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">{level}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold">{selectedAgent?.agent_name || 'Demo Agent'}</h1>
                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs">
                      Level {level}
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      {totalXP} XP
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{selectedAgent?.agent_id || 'agent-demo-v1'}</p>

                  {/* XP bar */}
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress to Level {level + 1}</span>
                      <span>{totalXP % 200}/200 XP</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${(totalXP % 200) / 2}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Courses', value: '1/3', icon: BookOpen, color: 'text-indigo-500' },
                    { label: 'Graduated', value: '0', icon: Award, color: 'text-green-500' },
                    { label: 'Quizzes', value: '2/20', icon: Target, color: 'text-amber-500' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                      <p className="text-lg font-bold">{loading ? '—' : s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skill Tree */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          Skill Tree
        </h2>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {SKILL_TREE.map(category => (
            <div key={category.category} className="space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-xl ${category.bgColor}`}>
                <span className="text-xl">{category.icon}</span>
                <span className={`font-bold text-sm ${category.color}`}>{category.category}</span>
              </div>
              {category.skills.map(skill => (
                <Card key={skill.id} className={`hover:shadow-md transition-shadow ${skill.status === 'completed' ? 'border-green-300 dark:border-green-700' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${skill.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {skill.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{skill.name}</p>
                          <Badge className="text-xs bg-muted text-muted-foreground">
                            Lv.{skill.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{skill.desc}</p>
                        <Button size="xs" variant="outline" render={<Link href={`/ai-agent-school/course/${skill.course}`} />}>
                          {skill.status === 'completed' ? 'Review' : 'Study'} →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>

        {/* Course Cards */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          Course Catalog
        </h2>
        <div className="grid md:grid-cols-1 gap-4">
          {COURSES.map(course => (
            <Card key={course.id} className={`hover:shadow-md transition-shadow ${course.borderColor}`}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  {/* Color bar */}
                  <div className={`w-1 h-16 rounded-full ${course.color}`} />

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{course.title}</h3>
                      <Badge className={`text-xs ${course.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : course.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {course.difficulty}
                      </Badge>
                      {course.enrolled && (
                        <Badge className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                          Enrolled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      by {course.teacher} · {course.lessons} lessons · {course.quizzes} quizzes
                    </p>
                    {course.enrolled ? (
                      <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xs">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${course.color} rounded-full`} style={{ width: `${course.progress}%` }} />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Next: {course.nextLessonTitle}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <Star className="w-3 h-3 inline mr-1" />
                          {course.xp} XP
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {course.completedLessons.length} lessons completed
                        </span>
                        <Badge className="text-xs bg-muted text-muted-foreground">
                          <Star className="w-3 h-3 mr-1" />
                          {200 + COURSES.indexOf(course) * 50} XP
                        </Badge>
                      </div>
                    )}
                  </div>

                  <Button size="sm" render={<Link href={`/ai-agent-school/course/${course.id}`} />}>
                    {course.enrolled ? 'Continue' : 'Enroll'} →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
