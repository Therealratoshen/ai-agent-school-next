'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { GraduationCap, Award, CheckCircle2, XCircle, Loader2, Bot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function CertificatePage() {
  const params = useParams()
  const certId = typeof params?.id === 'string' ? params.id : decodeURIComponent(String(params?.id || ''))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!certId) return
    fetch(`/api/ai-agent-school/certificate?certificate_id=${encodeURIComponent(certId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [certId])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {loading ? (
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying certificate...</p>
        </div>
      ) : notFound || !data ? (
        <Card className="max-w-md w-full">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Certificate Not Found</h2>
            <p className="text-muted-foreground text-sm">
              This certificate ID was not found in our records. Check the ID and try again.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-lg w-full border-indigo-500/30">
          <CardContent className="py-12 px-8 text-center">
            {/* Certificate seal */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>

            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mb-4">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified Certificate
            </Badge>

            <h1 className="text-2xl font-bold mb-1">Certificate of Graduation</h1>
            <p className="text-muted-foreground mb-8">AI Agent School</p>

            <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Agent Name</p>
                <p className="font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-500" />
                  {data.agent_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Course</p>
                <p className="font-semibold">{data.course_title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Graduated</p>
                  <p className="font-medium text-sm">
                    {new Date(data.graduated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Lessons</p>
                  <p className="font-medium text-sm">{data.lessons_completed}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-mono mb-2">
              Certificate ID: {data.certificate_id}
            </p>
            <p className="text-xs text-muted-foreground">
              This certificate verifies that the above agent successfully completed all course requirements at AI Agent School.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
