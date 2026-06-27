-- AI Agent School — Initial Schema
-- Run this after creating a Supabase project
-- psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── MCP Sessions (for chat history) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_mcp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  enrollment_id UUID NOT NULL,
  token_usage JSONB DEFAULT '{"messages": [], "last_updated": null}'::jsonb,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Agents (API keys) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id UUID, -- linked after student creation
  agent_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL,
  hashed_api_key TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_api_key ON ai_school_agents(hashed_api_key);
CREATE INDEX idx_agents_user ON ai_school_agents(supabase_user_id);

-- ─── Teachers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  description TEXT,
  llm_provider TEXT DEFAULT 'openai',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'pending', 'certified', 'suspended')),
  rating_avg DECIMAL(3,2) DEFAULT 0.00,
  review_count INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_courses INTEGER DEFAULT 0,
  certified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Courses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES ai_school_teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL DEFAULT 'cron_handling',
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  enrollment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_courses_teacher ON ai_school_courses(teacher_id);
CREATE INDEX idx_courses_topic ON ai_school_courses(topic);
CREATE INDEX idx_courses_status ON ai_school_courses(status);

-- ─── Lessons ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES ai_school_courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'markdown' CHECK (content_type IN ('markdown', 'structured', 'video_url')),
  estimated_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_course ON ai_school_lessons(course_id);

-- ─── Quizzes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES ai_school_lessons(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'open_ended')),
  options JSONB, -- array of strings for multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quizzes_lesson ON ai_school_quizzes(lesson_id);

-- ─── Students ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'training', 'paused', 'graduated', 'failed')),
  failure_streak INTEGER DEFAULT 0,
  current_lesson INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  graduated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_name ON ai_school_students(name);

-- Add student FK to agents now that students table exists
ALTER TABLE ai_school_agents ADD CONSTRAINT agents_student_fk
  FOREIGN KEY (student_id) REFERENCES ai_school_students(id) ON DELETE SET NULL;

-- ─── Enrollments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES ai_school_students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES ai_school_courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES ai_school_teachers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'failed')),
  progress INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  quizzes_passed INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_enrollments_student ON ai_school_enrollments(student_id);
CREATE INDEX idx_enrollments_course ON ai_school_enrollments(course_id);

-- ─── Quiz Results ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES ai_school_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES ai_school_lessons(id) ON DELETE CASCADE,
  score DECIMAL(5,2) DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  answers JSONB,
  feedback JSONB,
  passed BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_enrollment ON ai_school_quiz_results(enrollment_id);

-- ─── Mistakes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_mistakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES ai_school_students(id) ON DELETE CASCADE,
  mistake TEXT NOT NULL,
  context JSONB,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  count INTEGER DEFAULT 1,
  resolved BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_mistakes_student ON ai_school_mistakes(student_id);

-- ─── Graduations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_school_graduations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES ai_school_students(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES ai_school_enrollments(id) ON DELETE SET NULL,
  certificate_id TEXT UNIQUE NOT NULL,
  failure_streak_at_graduation INTEGER NOT NULL,
  lessons_completed INTEGER NOT NULL,
  total_corrections INTEGER DEFAULT 0,
  total_training_days INTEGER NOT NULL DEFAULT 1,
  graduated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_graduations_student ON ai_school_graduations(student_id);
CREATE INDEX idx_graduations_cert ON ai_school_graduations(certificate_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE ai_school_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_graduations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_school_mcp_sessions ENABLE ROW LEVEL SECURITY;

-- Public read for published content
CREATE POLICY "Published courses are public" ON ai_school_courses FOR SELECT USING (status = 'published');
CREATE POLICY "Lessons of published courses are public" ON ai_school_lessons FOR SELECT
  USING (course_id IN (SELECT id FROM ai_school_courses WHERE status = 'published'));
CREATE POLICY "Quizzes are public for published courses" ON ai_school_quizzes FOR SELECT
  USING (lesson_id IN (SELECT id FROM ai_school_lessons WHERE course_id IN (SELECT id FROM ai_school_courses WHERE status = 'published')));
CREATE POLICY "Graduations are publicly verifiable" ON ai_school_graduations FOR SELECT USING (true);
CREATE POLICY "Sessions are accessible by enrollment owner" ON ai_school_mcp_sessions FOR ALL
  USING (enrollment_id IN (SELECT id FROM ai_school_enrollments WHERE student_id IN (SELECT id FROM ai_school_students WHERE name IS NOT NULL)));

-- Service role bypass for MCP server
CREATE POLICY "Service role full access agents" ON ai_school_agents FOR ALL USING (true);
CREATE POLICY "Service role full access courses" ON ai_school_courses FOR ALL USING (true);
CREATE POLICY "Service role full access lessons" ON ai_school_lessons FOR ALL USING (true);
CREATE POLICY "Service role full access quizzes" ON ai_school_quizzes FOR ALL USING (true);
CREATE POLICY "Service role full access students" ON ai_school_students FOR ALL USING (true);
CREATE POLICY "Service role full access enrollments" ON ai_school_enrollments FOR ALL USING (true);
CREATE POLICY "Service role full access quiz_results" ON ai_school_quiz_results FOR ALL USING (true);
CREATE POLICY "Service role full access mistakes" ON ai_school_mistakes FOR ALL USING (true);
CREATE POLICY "Service role full access graduations" ON ai_school_graduations FOR ALL USING (true);
CREATE POLICY "Service role full access sessions" ON ai_school_mcp_sessions FOR ALL USING (true);

-- ─── Helper functions ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_failure_streak(p_student_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_school_students
  SET failure_streak = failure_streak + 1, updated_at = NOW()
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
