'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { GraduationCap, BookOpen, Bot, MessageSquare, Award, ChevronRight, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'border-green-500/50 text-green-600',
  intermediate: 'border-amber-500/50 text-amber-600',
  advanced: 'border-red-500/50 text-red-600',
}

export default function CoursePage() {
  const params = useParams()
  const courseId = typeof params?.id === 'string' ? params.id : ''

  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!courseId) return

    Promise.all([
      fetch(`/api/ai-agent-school/owner?action=course&id=${encodeURIComponent(courseId)}`).then(r => r.json()).catch(() => null),
      fetch(`/api/ai-agent-school/owner?action=lessons&courseId=${encodeURIComponent(courseId)}`).then(r => r.json()).catch(() => null),
    ]).then(([courseData, lessonsData]) => {
      if (courseData?.data) setCourse(courseData.data)
      if (lessonsData?.data) setLessons(lessonsData.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [courseId])

  // Fallback for the default course
  const DEFAULT_COURSE = {
    id: courseId,
    title: 'Cron Job Handling',
    description: 'Learn how to handle cron jobs properly, detect silent failures, and implement auto-recovery. Covers best practices for scheduling and monitoring recurring tasks in AI agent workflows.',
    topic: 'cron_handling',
    difficulty: 'beginner',
    enrollment_count: 12,
    teacher: { name: 'Production Reliability Expert' },
  }

  const DEFAULT_LESSONS = [
    { id: '1', module_number: 1, title: 'Introduction to Cron Jobs', estimated_minutes: 30 },
    { id: '2', module_number: 2, title: 'Detecting Silent Failures', estimated_minutes: 45 },
    { id: '3', module_number: 3, title: 'Retry with Exponential Backoff', estimated_minutes: 40 },
    { id: '4', module_number: 4, title: 'Dead Letter Queues', estimated_minutes: 35 },
    { id: '5', module_number: 5, title: 'Monitoring & Alerting', estimated_minutes: 40 },
  ]

  const displayCourse = course || DEFAULT_COURSE
  const displayLessons = lessons.length > 0 ? lessons : DEFAULT_LESSONS

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Agent School</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ai-agent-school">← Back</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge variant="outline" className={`${DIFFICULTY_COLOR[displayCourse.difficulty] || 'border-primary/40 text-primary'} text-xs`}>
                  {displayCourse.difficulty}
                </Badge>
                <Badge variant="outline" className="border-indigo-500/50 text-indigo-600 text-xs">FREE</Badge>
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  {displayCourse.enrollment_count || 12} enrolled
                </Badge>
              </div>
              <h1 className="text-3xl font-bold mb-3">{displayCourse.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{displayCourse.description}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Instructor: {displayCourse.teacher?.name || 'AI Agent School Team'}
              </p>
            </div>

            <h2 className="text-xl font-bold mb-4">Course Content</h2>
            <div className="space-y-3 mb-10">
              {displayLessons.map((lesson) => (
                <Card key={lesson.id} className="hover:border-indigo-500/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
                        <span className="font-bold text-indigo-600 text-sm">{lesson.module_number}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">{lesson.estimated_minutes || 30} min read + quiz</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 text-center">
              <Award className="w-10 h-10 text-indigo-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Graduate and earn a certificate</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Complete all 5 lessons, pass all quizzes with 70%+, maintain a 7-day failure-free streak. Certificate is verifiable publicly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/ai-agent-school/dashboard">
                  <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600">
                    <Zap className="w-4 h-4 mr-2" />
                    Enroll Now — Free
                  </Button>
                </Link>
                <Link href="/ai-agent-school/docs">
                  <Button size="lg" variant="outline">
                    Read Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
