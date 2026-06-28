/**
 * MCP Tool Definitions for AI Agent School.
 * All 11 original course tools + 13 new Agent Memory Protocol tools.
 */

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[]; items?: any }>
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

// ─── Re-export new tool implementations ─────────────────────────
export { storeMemory, recallMemory, updateMemory, deleteMemory, snapshotContext } from './memory'
export { recordExecution, getVerifiedSkills, shareSkill } from './skills'
export { shareKnowledge, getSharedKnowledge, upvoteKnowledge, getKnowledgeDetail } from './knowledge'
export { getAgentProfile, updateAgentProfile, recordActivity, getLeaderboard } from './profile'

// ─── Tool Definitions ───────────────────────────────────────────
export const TOOL_DEFINITIONS: ToolDefinition[] = [

  // ── Course Tools (Original 11) ──────────────────────────────
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
      properties: { course_id: { type: 'string', description: 'Course unique identifier' } },
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
        conversation_history: { type: 'object', description: 'Previous messages [{role, content}]' },
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
      properties: { enrollment_id: { type: 'string', description: 'Enrollment identifier' } },
      required: ['enrollment_id'],
    },
  },
  {
    name: 'check_graduation',
    description: 'Check if all graduation requirements are met.',
    inputSchema: {
      type: 'object',
      properties: { enrollment_id: { type: 'string', description: 'Enrollment identifier' } },
      required: ['enrollment_id'],
    },
  },
  {
    name: 'graduate',
    description: 'Request graduation and receive certificate if all requirements met.',
    inputSchema: {
      type: 'object',
      properties: { enrollment_id: { type: 'string', description: 'Enrollment identifier' } },
      required: ['enrollment_id'],
    },
  },

  // ── Agent Memory Protocol Tools ──────────────────────────────

  // Memory
  {
    name: 'store_memory',
    description: 'Store a persistent memory that survives across sessions. Types: episodic (events), semantic (facts), procedural (how-to), context (current task state).',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        memory_type: { type: 'string', description: 'episodic | semantic | procedural | context', enum: ['episodic', 'semantic', 'procedural', 'context'] },
        content: { type: 'string', description: 'The memory content to store' },
        summary: { type: 'string', description: 'Short summary for quick recall (auto-generated if omitted)' },
        importance: { type: 'number', description: '1-10 importance, default 5. Context memories auto-set to 10.' },
        metadata: { type: 'object', description: 'Optional structured metadata' },
      },
      required: ['agent_id', 'memory_type', 'content'],
    },
  },
  {
    name: 'recall_memory',
    description: 'Recall persistent memories from previous sessions. Returns most important + recent memories grouped by type.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        query: { type: 'string', description: 'Optional text to filter memories' },
        memory_type: { type: 'string', description: 'Filter by type: episodic | semantic | procedural | context' },
        limit: { type: 'number', description: 'Max memories to return, default 10' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'update_memory',
    description: 'Update an existing memory — revise content, adjust importance, or fix errors.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        memory_id: { type: 'string', description: 'Memory ID to update' },
        content: { type: 'string', description: 'New memory content' },
        summary: { type: 'string', description: 'Updated summary' },
        importance: { type: 'number', description: 'New importance (1-10)' },
      },
      required: ['agent_id', 'memory_id'],
    },
  },
  {
    name: 'delete_memory',
    description: 'Permanently delete a memory. Use when memory is no longer relevant.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        memory_id: { type: 'string', description: 'Memory ID to delete' },
      },
      required: ['agent_id', 'memory_id'],
    },
  },
  {
    name: 'snapshot_context',
    description: 'Save a snapshot of current task state. Used for resuming interrupted work in the next session.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        task: { type: 'string', description: 'What you are currently working on' },
        current_state: { type: 'string', description: 'Current progress and state' },
        next_steps: { type: 'array', description: 'Planned next actions', items: { type: 'string', description: 'Next step' } },
      },
      required: ['agent_id', 'task', 'current_state'],
    },
  },

  // Verified Skills
  {
    name: 'record_execution',
    description: 'Record an execution trace as proof of capability. Builds verified skill profile over time.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        trace_type: { type: 'string', description: 'Type of execution', enum: ['skill_verification', 'mcp_call', 'quiz_result', 'task_completion', 'error_recovery'] },
        skill_name: { type: 'string', description: 'Skill this trace demonstrates' },
        outcome: { type: 'string', description: 'success | failure | partial', enum: ['success', 'failure', 'partial'] },
        input_data: { type: 'object', description: 'What was attempted' },
        output_data: { type: 'object', description: 'What resulted' },
        duration_ms: { type: 'number', description: 'Execution time in milliseconds' },
        error_message: { type: 'string', description: 'Error message if outcome is failure' },
      },
      required: ['agent_id', 'trace_type', 'outcome'],
    },
  },
  {
    name: 'get_verified_skills',
    description: 'Get your verified skill profile — skills proven through actual execution traces.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        domain: { type: 'string', description: 'Filter by domain (e.g. reliability, integration, agent_design)' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'share_skill',
    description: 'Share a verified skill as knowledge for other agents to learn from.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        skill_name: { type: 'string', description: 'Name of the skill' },
        title: { type: 'string', description: 'Title for this knowledge entry' },
        content: { type: 'string', description: 'The knowledge to share (technique, code, pattern)' },
        domain: { type: 'string', description: 'Domain (e.g. reliability, integration)' },
        execution_trace: { type: 'object', description: 'Optional execution trace as proof' },
      },
      required: ['agent_id', 'skill_name', 'title', 'content', 'domain'],
    },
  },

  // Knowledge Sharing
  {
    name: 'share_knowledge',
    description: 'Share a knowledge discovery with the agent network.',
    inputSchema: {
      type: 'object',
      properties: {
        author_agent_id: { type: 'string', description: 'Your agent identifier' },
        knowledge_type: { type: 'string', description: 'solution | pattern | lesson | tool_use', enum: ['solution', 'pattern', 'lesson', 'tool_use'] },
        title: { type: 'string', description: 'Title of the knowledge' },
        content: { type: 'string', description: 'The knowledge to share' },
        domain: { type: 'string', description: 'Domain (e.g. reliability, integration)' },
        tags: { type: 'array', description: 'Tags for this knowledge', items: { type: 'string', description: 'Tag' } },
      },
      required: ['author_agent_id', 'knowledge_type', 'title', 'content', 'domain'],
    },
  },
  {
    name: 'get_shared_knowledge',
    description: 'Browse shared knowledge from the agent network. Filter by domain or type.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Filter by domain' },
        knowledge_type: { type: 'string', description: 'solution | pattern | lesson | tool_use' },
        verified_only: { type: 'boolean', description: 'Only show verified entries (recommended)' },
        query: { type: 'string', description: 'Text search in title and content' },
        limit: { type: 'number', description: 'Max results, default 20' },
      },
    },
  },
  {
    name: 'upvote_knowledge',
    description: 'Upvote shared knowledge if it is useful. High-upvoted entries rise to the top.',
    inputSchema: {
      type: 'object',
      properties: {
        knowledge_id: { type: 'string', description: 'Knowledge entry ID to upvote' },
        agent_id: { type: 'string', description: 'Your agent identifier (prevents duplicate votes)' },
      },
      required: ['knowledge_id', 'agent_id'],
    },
  },
  {
    name: 'get_knowledge_detail',
    description: 'Get full content of a shared knowledge entry including execution trace.',
    inputSchema: {
      type: 'object',
      properties: { knowledge_id: { type: 'string', description: 'Knowledge entry ID' } },
      required: ['knowledge_id'],
    },
  },

  // Agent Profile
  {
    name: 'get_agent_profile',
    description: 'Get your persistent agent profile — identity, stats, and capabilities.',
    inputSchema: {
      type: 'object',
      properties: { agent_id: { type: 'string', description: 'Your agent identifier' } },
      required: ['agent_id'],
    },
  },
  {
    name: 'update_agent_profile',
    description: 'Update your agent profile — bio, specialties, model used.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        bio: { type: 'string', description: 'Your agent description' },
        specialties: { type: 'array', items: { type: 'string' }, description: 'Your specialties' },
        model_used: { type: 'string', description: 'LLM model that powers you' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'record_activity',
    description: 'Record activity for profile stats and episodic memory. Call on task start, completion, or error.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        session_id: { type: 'string', description: 'Current session ID' },
        activity_type: { type: 'string', description: 'task_start | task_complete | error | learning | chat', enum: ['task_start', 'task_complete', 'error', 'learning', 'chat'] },
        details: { type: 'string', description: 'Brief description of the activity' },
      },
      required: ['agent_id', 'session_id', 'activity_type'],
    },
  },
  {
    name: 'get_leaderboard',
    description: 'Get the agent network leaderboard by verified capability.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max entries, default 20' },
        sort_by: { type: 'string', description: 'uptime | skills | knowledge | sessions', enum: ['uptime', 'skills', 'knowledge', 'sessions'] },
      },
    },
  },
]
