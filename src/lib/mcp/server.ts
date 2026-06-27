import type { ToolResult, ToolCall } from './tools/index'
import { listCourses, getCourse } from './tools/courses'
import { enroll, getEnrollments } from './tools/enrollment'
import { getLesson } from './tools/lessons'
import { submitQuiz } from './tools/quiz'
import { chat } from './tools/chat'
import { reportMistake } from './tools/mistakes'
import { getProgress, checkGraduation, graduate } from './tools/progress'

export interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: Record<string, unknown>
}

export interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
}

function errorResponse(id: string | number | null, code: number, message: string): JSONRPCResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export async function handleMCPRequest(
  req: JSONRPCRequest,
  agentContext?: { agentId: string; agentName: string; apiKeyId?: string }
): Promise<JSONRPCResponse> {
  const { id } = req

  if (req.method !== 'tools/call') {
    return errorResponse(id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${req.method}`)
  }

  const params = req.params as { name?: string; arguments?: Record<string, unknown> }
  if (!params?.name) {
    return errorResponse(id, MCP_ERROR_CODES.INVALID_PARAMS, 'Missing tool name')
  }

  const toolCall: ToolCall = {
    name: params.name,
    arguments: params.arguments || {},
  }

  let result: ToolResult

  try {
    switch (toolCall.name) {
      case 'list_courses':
        result = await listCourses(toolCall.arguments as { topic?: string; difficulty?: string })
        break

      case 'get_course':
        result = await getCourse(toolCall.arguments as { course_id: string })
        break

      case 'enroll':
        result = await enroll({
          ...(toolCall.arguments as { course_id: string; agent_id?: string; agent_name?: string }),
          agent_id: (toolCall.arguments as any).agent_id || agentContext?.agentId || '',
          agent_name: (toolCall.arguments as any).agent_name || agentContext?.agentName || '',
        })
        break

      case 'get_enrollments':
        result = await getEnrollments((toolCall.arguments as any).agent_id || agentContext?.agentId || '')
        break

      case 'get_lesson':
        result = await getLesson(toolCall.arguments as { course_id: string; lesson_number: number })
        break

      case 'submit_quiz':
        result = await submitQuiz(toolCall.arguments as {
          enrollment_id: string
          lesson_id: string
          answers: Record<string, string>
        })
        break

      case 'chat':
        result = await chat(toolCall.arguments as {
          course_id: string
          enrollment_id: string
          message: string
          conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
        })
        break

      case 'report_mistake':
        result = await reportMistake(toolCall.arguments as {
          enrollment_id: string
          mistake: string
          severity: 'low' | 'medium' | 'high'
        })
        break

      case 'get_progress':
        result = await getProgress(toolCall.arguments as { enrollment_id: string })
        break

      case 'check_graduation':
        result = await checkGraduation(toolCall.arguments as { enrollment_id: string })
        break

      case 'graduate':
        result = await graduate(toolCall.arguments as { enrollment_id: string })
        break

      default:
        return errorResponse(id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown tool: ${toolCall.name}`)
    }

    return {
      jsonrpc: '2.0',
      id,
      result: result.success ? result.data : { error: result.error },
    }
  } catch (err: any) {
    return errorResponse(id, MCP_ERROR_CODES.INTERNAL_ERROR, err.message || 'Internal error')
  }
}
