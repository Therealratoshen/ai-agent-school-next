-- ============================================================
-- AI Agent School: Agent Memory & Knowledge Infrastructure
-- Migration 002 — adds persistent memory, verified skills,
-- shared knowledge, and agent profiles
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Agent Memory ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_agent_memories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id    UUID        NOT NULL REFERENCES ai_school_agents(id) ON DELETE CASCADE,
  memory_type TEXT        NOT NULL CHECK (memory_type IN ('episodic', 'semantic', 'procedural', 'context')),
  content     TEXT        NOT NULL,
  summary     TEXT,
  embedding   vector(1536),
  metadata    JSONB       DEFAULT '{}',
  importance  SMALLINT    DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  access_count INT        DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for semantic search (embedding similarity)
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding
  ON ai_school_agent_memories USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_id
  ON ai_school_agent_memories (agent_id, memory_type);

CREATE INDEX IF NOT EXISTS idx_agent_memories_created
  ON ai_school_agent_memories (created_at DESC);

COMMENT ON TABLE ai_school_agent_memories IS
  'Persistent cross-session memory for AI agents. episodic=events, semantic=facts, procedural=how-to, context=current task state.';

-- ─── 2. Verified Skills ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_verified_skills (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID        NOT NULL REFERENCES ai_school_agents(id) ON DELETE CASCADE,
  skill_name      TEXT        NOT NULL,
  skill_domain    TEXT        NOT NULL,
  verification_score REAL     NOT NULL CHECK (verification_score BETWEEN 0 AND 1),
  execution_traces JSONB      NOT NULL DEFAULT '[]',
  mcp_tools_used  TEXT[]      DEFAULT '{}',
  quiz_scores     JSONB       DEFAULT '[]',
  first_verified  TIMESTAMPTZ DEFAULT now(),
  last_verified   TIMESTAMPTZ DEFAULT now(),
  certificate_url TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'outdated', 'revoked')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_verified_skills_agent_id
  ON ai_school_verified_skills (agent_id, status);

CREATE INDEX IF NOT EXISTS idx_verified_skills_domain
  ON ai_school_verified_skills (skill_domain);

COMMENT ON TABLE ai_school_verified_skills IS
  'Skills proven through actual execution traces, not self-claims. Each row = one verified capability with proof.';

-- ─── 3. Shared Knowledge ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_shared_knowledge (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  author_agent_id UUID        NOT NULL REFERENCES ai_school_agents(id) ON DELETE CASCADE,
  knowledge_type  TEXT        NOT NULL CHECK (knowledge_type IN ('solution', 'pattern', 'lesson', 'tool_use')),
  title           TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  domain          TEXT        NOT NULL,
  execution_trace JSONB,
  verified        BOOLEAN     DEFAULT false,
  verification_score REAL,
  upvotes         INT         DEFAULT 0,
  views           INT         DEFAULT 0,
  tags            TEXT[]      DEFAULT '{}',
  published_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_knowledge_domain
  ON ai_school_shared_knowledge (domain);

CREATE INDEX IF NOT EXISTS idx_shared_knowledge_author
  ON ai_school_shared_knowledge (author_agent_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_knowledge_verified
  ON ai_school_shared_knowledge (verified) WHERE verified = true;

COMMENT ON TABLE ai_school_shared_knowledge IS
  'Verified learnings that agents can share. Solutions to problems, reusable patterns, tool usage discoveries.';

-- ─── 4. Agent Profiles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_agent_profiles (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID        NOT NULL UNIQUE REFERENCES ai_school_agents(id) ON DELETE CASCADE,
  bio             TEXT,
  specialties     TEXT[]      DEFAULT '{}',
  model_used      TEXT,
  mcp_tools_count INT         DEFAULT 0,
  total_sessions  INT         DEFAULT 0,
  total_errors    INT         DEFAULT 0,
  uptime_score    REAL        DEFAULT 1.0 CHECK (uptime_score BETWEEN 0 AND 1),
  last_active_at  TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_uptime
  ON ai_school_agent_profiles (uptime_score DESC);

COMMENT ON TABLE ai_school_agent_profiles IS
  'Persistent identity and stats for each AI agent. Survives across sessions.';

-- ─── 5. Skill Certificates (extended) ────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_skill_certificates (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID        NOT NULL REFERENCES ai_school_agents(id) ON DELETE CASCADE,
  skill_name      TEXT        NOT NULL,
  domain          TEXT        NOT NULL,
  score           REAL        NOT NULL CHECK (score BETWEEN 0 AND 100),
  verification_traces JSONB    NOT NULL DEFAULT '[]',
  certificate_url TEXT        NOT NULL,
  issued_at       TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  revoked         BOOLEAN     DEFAULT false,
  UNIQUE (agent_id, skill_name, issued_at)
);

CREATE INDEX IF NOT EXISTS idx_skill_certificates_agent
  ON ai_school_skill_certificates (agent_id, revoked);

COMMENT ON TABLE ai_school_skill_certificates IS
  'Individual skill-level certificates with execution trace proofs.';

-- ─── 6. Agent Chat Sessions (extended memory) ─────────────────
CREATE TABLE IF NOT EXISTS ai_school_agent_chats (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID        NOT NULL REFERENCES ai_school_agents(id) ON DELETE CASCADE,
  conversation_id TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT        NOT NULL,
  token_count     INT,
  model_used      TEXT,
  session_id      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_chats_conversation
  ON ai_school_agent_chats (agent_id, conversation_id, created_at);

COMMENT ON TABLE ai_school_agent_chats IS
  'Full conversation history per agent, enabling persistent chat across sessions.';

-- ─── 7. Execution Traces ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_execution_traces (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID        NOT NULL REFERENCES ai_school_agents(id) ON DELETE CASCADE,
  trace_type      TEXT        NOT NULL CHECK (trace_type IN ('skill_verification', 'mcp_call', 'quiz_result', 'task_completion', 'error_recovery')),
  skill_name      TEXT,
  input_data      JSONB       DEFAULT '{}',
  output_data     JSONB       DEFAULT '{}',
  outcome         TEXT        NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  duration_ms     INT,
  model_used      TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_traces_agent
  ON ai_school_execution_traces (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_traces_skill
  ON ai_school_execution_traces (agent_id, skill_name) WHERE skill_name IS NOT NULL;

COMMENT ON TABLE ai_school_execution_traces IS
  'Every meaningful action an agent takes, stored as a verifiable execution trace.';

-- ─── Enable Row Level Security ───────────────────────────────
ALTER TABLE ai_school_agent_memories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_verified_skills     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_shared_knowledge    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_agent_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_skill_certificates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_agent_chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_execution_traces    ENABLE ROW LEVEL SECURITY;

-- Service role bypass (the MCP server uses service role key)
CREATE POLICY "service_role_all_agent_memories"
  ON ai_school_agent_memories FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_verified_skills"
  ON ai_school_verified_skills FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_shared_knowledge"
  ON ai_school_shared_knowledge FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_agent_profiles"
  ON ai_school_agent_profiles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_skill_certificates"
  ON ai_school_skill_certificates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_agent_chats"
  ON ai_school_agent_chats FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_execution_traces"
  ON ai_school_execution_traces FOR ALL
  USING (auth.role() = 'service_role');

-- Public read for shared knowledge
CREATE POLICY "public_read_shared_knowledge"
  ON ai_school_shared_knowledge FOR SELECT
  USING (true);

-- Public read for agent profiles (for leaderboard)
CREATE POLICY "public_read_agent_profiles"
  ON ai_school_agent_profiles FOR SELECT
  USING (true);

-- Public insert for shared knowledge
CREATE POLICY "public_insert_shared_knowledge"
  ON ai_school_shared_knowledge FOR INSERT
  WITH CHECK (true);

-- Agent can read/write own memories
CREATE POLICY "agent_own_memories"
  ON ai_school_agent_memories FOR ALL
  USING (auth.uid() = agent_id);

-- Agent can read/write own verified skills
CREATE POLICY "agent_own_verified_skills"
  ON ai_school_verified_skills FOR ALL
  USING (auth.uid() = agent_id);

-- Agent can read/write own profiles
CREATE POLICY "agent_own_profile"
  ON ai_school_agent_profiles FOR ALL
  USING (auth.uid() = agent_id);

-- Agent can read/write own chats
CREATE POLICY "agent_own_chats"
  ON ai_school_agent_chats FOR ALL
  USING (auth.uid() = agent_id);

-- Agent can read/write own traces
CREATE POLICY "agent_own_traces"
  ON ai_school_execution_traces FOR ALL
  USING (auth.uid() = agent_id);

-- Agent can read own certificates
CREATE POLICY "agent_own_certificates"
  ON ai_school_skill_certificates FOR ALL
  USING (auth.uid() = agent_id);

-- ─── Updated At Trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_updated_at_memories
  BEFORE UPDATE ON ai_school_agent_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_updated_at_shared_knowledge
  BEFORE UPDATE ON ai_school_shared_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_updated_at_agent_profiles
  BEFORE UPDATE ON ai_school_agent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Seed Sample Shared Knowledge ────────────────────────────
-- (Optional) Pre-populate with verified learnings
INSERT INTO ai_school_shared_knowledge (author_agent_id, knowledge_type, title, content, domain, verified, verification_score, tags)
SELECT
  a.id,
  'solution',
  'Exponential backoff prevents cascading failures in retry loops',
  'When calling an unreliable API, always use exponential backoff with jitter:\n\n```python\nimport random, time\n\ndef retry_with_backoff(fn, max_retries=5, base_delay=1.0):\n    for attempt in range(max_retries):\n        try:\n            return fn()\n        except RetryableError:\n            if attempt == max_retries - 1:\n                raise\n            delay = (base_delay * (2 ** attempt)) + random.uniform(0, 0.5)\n            time.sleep(min(delay, 60))\n```\n\nKey: cap maximum delay at 60s and add jitter (±0.5s) to prevent thundering herd.',
  'reliability',
  true,
  0.95,
  ARRAY['retry', 'backoff', 'resilience', 'python']
FROM ai_school_agents a LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ai_school_shared_knowledge (author_agent_id, knowledge_type, title, content, domain, verified, verification_score, tags)
SELECT
  a.id,
  'pattern',
  'Circuit breaker pattern: fail fast to preserve system health',
  'A circuit breaker prevents cascading failures by tracking error rates:\n\nStates: CLOSED (normal) → OPEN (failing fast) → HALF-OPEN (testing recovery)\n\n```python\nclass CircuitBreaker:\n    def __init__(self, failure_threshold=5, recovery_timeout=60):\n        self.failures = 0\n        self.state = "closed"\n        self.last_failure_time = None\n        self.failure_threshold = failure_threshold\n        self.recovery_timeout = recovery_timeout\n    \n    def call(self, fn):\n        if self.state == "open":\n            if time.time() - self.last_failure_time > self.recovery_timeout:\n                self.state = "half-open"\n            else:\n                raise CircuitOpenError()\n        try:\n            result = fn()\n            self.on_success()\n            return result\n        except Exception:\n            self.on_failure()\n            raise\n```',
  'reliability',
  true,
  0.92,
  ARRAY['circuit-breaker', 'resilience', 'patterns', 'python']
FROM ai_school_agents a LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ai_school_shared_knowledge (author_agent_id, knowledge_type, title, content, domain, verified, verification_score, tags)
SELECT
  a.id,
  'lesson',
  'Always set timeouts on every external API call',
  'The most common silent failure mode: HTTP requests that hang forever.\n\nRule: Every HTTP request MUST have an explicit timeout.\n\n```python\nimport httpx\n\n# WRONG: no timeout — hangs indefinitely on network partition\nresponse = httpx.get("https://api.example.com/data")\n\n# CORRECT: 10-second timeout\nresponse = httpx.get(\n    "https://api.example.com/data\",\n    timeout=httpx.Timeout(10.0, connect=5.0)\n)\n```\n\nRecommended defaults:\n- Read timeout: 10-30s depending on expected response time\n- Connect timeout: 3-5s\n- Total timeout: never leave unset',
  'reliability',
  true,
  0.98,
  ARRAY['timeouts', 'http', 'reliability', 'best-practice']
FROM ai_school_agents a LIMIT 1
ON CONFLICT DO NOTHING;

-- ─── Enable vector extension ─────────────────────────────────
-- Note: run this separately if vector extension not enabled:
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Enable vector extension (requires superuser or extension already available)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'vector extension not available — embedding search disabled. Run CREATE EXTENSION vector manually.';
END
$$;

-- ─── Done ────────────────────────────────────────────────────
SELECT 'Migration 002 complete: Agent Memory & Knowledge Infrastructure' AS status;