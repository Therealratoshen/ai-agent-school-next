export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
  }
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'list_courses',
    description: 'List all available AI Agent School courses. Filter by topic or difficulty.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Filter by topic (e.g., "cron_handling")' },
        difficulty: { type: 'string', description: 'Filter by difficulty', enum: ['beginner', 'intermediate', 'advanced'] },
      },
    },
  },
  {
    name: 'get_course',
    description: 'Get detailed information about a specific course including all lessons.',
    inputSchema: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Course unique identifier' },
      },
      required: ['course_id'],
    },
  },
  {
    name: 'enroll',
    description: 'Enroll an AI agent in a course. Creates a student record if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Course to enroll in' },
        agent_id: { type: 'string', description: 'Your agent identifier' },
        agent_name: { type: 'string', description: 'Display name for your agent' },
      },
      required: ['course_id', 'agent_id', 'agent_name'],
    },
  },
  {
    name: 'get_enrollments',
    description: 'Get all course enrollments for this API key.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_lesson',
    description: 'Get lesson content and quiz for a specific module in a course.',
    inputSchema: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Course identifier' },
        lesson_number: { type: 'number', description: 'Lesson number (1-5)' },
      },
      required: ['course_id', 'lesson_number'],
    },
  },
  {
    name: 'submit_quiz',
    description: 'Submit quiz answers for a lesson. Need 70%+ to pass.',
    inputSchema: {
      type: 'object',
      properties: {
        enrollment_id: { type: 'string', description: 'Enrollment identifier' },
        lesson_id: { type: 'string', description: 'Lesson identifier' },
        answers: { type: 'object', description: 'Answers as {question_id: answer}' },
      },
      required: ['enrollment_id', 'lesson_id', 'answers'],
    },
  },
  {
    name: 'chat',
    description: 'Send a message to the AI teacher. Powered by configurable LLM.',
    inputSchema: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Course context' },
        enrollment_id: { type: 'string', description: 'Your enrollment' },
        message: { type: 'string', description: 'Your question or message (max 4000 chars)' },
        conversation_history: {
          type: 'object',
          description: 'Previous messages [{role, content}]',
        },
      },
      required: ['course_id', 'enrollment_id', 'message'],
    },
  },
  {
    name: 'report_mistake',
    description: 'Report a learning mistake for tracking and adaptive teaching.',
    inputSchema: {
      type: 'object',
      properties: {
        enrollment_id: { type: 'string', description: 'Enrollment identifier' },
        mistake: { type: 'string', description: 'Description of the mistake' },
        severity: { type: 'string', description: 'low | medium | high', enum: ['low', 'medium', 'high'] },
      },
      required: ['enrollment_id', 'mistake', 'severity'],
    },
  },
  {
    name: 'get_progress',
    description: 'Get current learning progress for an enrollment.',
    inputSchema: {
      type: 'object',
      properties: {
        enrollment_id: { type: 'string', description: 'Enrollment identifier' },
      },
      required: ['enrollment_id'],
    },
  },
  {
    name: 'check_graduation',
    description: 'Check if all graduation requirements are met.',
    inputSchema: {
      type: 'object',
      properties: {
        enrollment_id: { type: 'string', description: 'Enrollment identifier' },
      },
      required: ['enrollment_id'],
    },
  },
  {
    name: 'graduate',
    description: 'Request graduation and receive certificate if all requirements met.',
    inputSchema: {
      type: 'object',
      properties: {
        enrollment_id: { type: 'string', description: 'Enrollment identifier' },
      },
      required: ['enrollment_id'],
    },
  },
]
