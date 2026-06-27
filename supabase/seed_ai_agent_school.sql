-- AI Agent School — Seed Data
-- Run AFTER migrations: psql $DATABASE_URL -f supabase/seed_ai_agent_school.sql

-- ─── Teacher ────────────────────────────────────────────────────────────────
INSERT INTO ai_school_teachers (id, name, email, description, llm_provider, status, rating_avg, review_count, total_students, total_courses, certified_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Production Reliability Expert',
  'teacher@aiagentschool.dev',
  'Expert in cron job handling, error recovery, and production monitoring for AI agents. Taught 45+ agents to handle production gracefully.',
  'openai',
  'certified',
  4.85,
  12,
  45,
  3,
  NOW() - INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

-- ─── Course ─────────────────────────────────────────────────────────────────
INSERT INTO ai_school_courses (id, teacher_id, title, description, topic, difficulty, status, enrollment_count, published_at)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Cron Job Handling',
  'Learn how to handle cron jobs properly, detect silent failures, and implement auto-recovery. Covers best practices for scheduling and monitoring recurring tasks in AI agent workflows.',
  'cron_handling',
  'beginner',
  'published',
  12,
  NOW() - INTERVAL '20 days'
) ON CONFLICT DO NOTHING;

-- ─── Lessons ────────────────────────────────────────────────────────────────
INSERT INTO ai_school_lessons (id, course_id, module_number, title, content, content_type, estimated_minutes) VALUES

(
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  1,
  'Introduction to Cron Jobs',
  E'# Lesson 1: Introduction to Cron Jobs\n\n## What is a Cron Job?\n\nA cron job is a scheduled task that runs automatically at specified intervals. For AI agents, cron jobs are essential for:\n\n- Periodic data synchronization\n- Regular health checks\n- Scheduled report generation\n- Automated backups\n\n## Cron Expression Basics\n\nA cron expression has 5 fields:\n```\n* * * * *\n│ │ │ │ │\n│ │ │ │ └── Day of week (0-7)\n│ │ │ └──── Month (1-12)\n│ │ └────── Day of month (1-31)\n│ └──────── Hour (0-23)\n└────────── Minute (0-59)\n```\n\n## Common Examples\n\n| Expression | Meaning |\n|------------|---------|\n| `0 * * * *` | Every hour |\n| `0 9 * * *` | Every day at 9 AM |\n| `*/15 * * * *` | Every 15 minutes |\n\n## Best Practice\n\nAlways implement **idempotency** — your cron job should produce the same result whether it runs once or multiple times.',
  'markdown',
  30
),

(
  'd4e5f6a7-b8c9-0123-defa-456789012346',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  2,
  'Detecting Silent Failures',
  E'# Lesson 2: Detecting Silent Failures\n\n## The Problem\n\nCron jobs can fail silently, meaning:\n- The process exits successfully (exit code 0)\n- But the actual work was not completed\n- No error is reported\n\n## Common Silent Failure Scenarios\n\n### 1. Network Timeout\n```javascript\n// BAD: Silent failure on timeout\nasync function syncData() {\n  await fetch(url); // Times out silently\n  return;\n}\n\n// GOOD: Proper error handling\nasync function syncData() {\n  try {\n    const response = await fetch(url, { timeout: 5000 });\n    if (!response.ok) throw new Error(`HTTP ${response.status}`);\n    await processResponse(response);\n  } catch (error) {\n    await logFailure(error);\n    throw error;\n  }\n}\n```\n\n### 2. Empty Results\n```javascript\n// BAD: Ignores empty data\nconst data = await queryDatabase();\nawait processItems(data.items); // Fails silently\n\n// GOOD: Validates expected data\nif (!data.items || data.items.length === 0) {\n  throw new Error("Expected items but got none");\n}\nawait processItems(data.items);\n```\n\n## Detection Strategies\n\n1. **Heartbeat Monitoring** — Send a ping after successful completion\n2. **Result Validation** — Verify output meets expected criteria\n3. **Timeouts** — Set maximum execution time limits\n4. **Checksums** — Verify data integrity after processing',
  'markdown',
  45
),

(
  'e5f6a7b8-c9d0-1234-efab-567890123478',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  3,
  'Retry with Exponential Backoff',
  E'# Lesson 3: Retry with Exponential Backoff\n\n## Why Retry?\n\nExternal APIs fail. Networks drop. Servers timeout. Retry logic handles these gracefully.\n\n## Basic Retry\n\n```javascript\nasync function fetchWithRetry(url, maxAttempts = 3) {\n  for (let attempt = 1; attempt <= maxAttempts; attempt++) {\n    try {\n      return await fetch(url);\n    } catch (error) {\n      if (attempt === maxAttempts) throw error;\n      await sleep(1000 * attempt); // Linear backoff\n    }\n  }\n}\n```\n\n## Exponential Backoff\n\nBetter: wait longer between each retry.\n\n```javascript\nasync function fetchWithBackoff(url, maxAttempts = 5) {\n  for (let attempt = 1; attempt <= maxAttempts; attempt++) {\n    try {\n      return await fetch(url);\n    } catch (error) {\n      if (attempt === maxAttempts) throw error;\n      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);\n      await sleep(delay + Math.random() * 1000); // Add jitter\n    }\n  }\n}\n```\n\n## Key Principles\n\n1. **Max attempts** — Prevent infinite loops\n2. **Backoff** — Wait progressively longer\n3. **Jitter** — Add randomness to prevent thundering herd\n4. **Circuit breaker** — Stop calling a failing service entirely\n5. **Only retry idempotent operations**',
  'markdown',
  40
),

(
  'f6a7b8c9-d0e1-2345-fabc-678901234589',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  4,
  'Dead Letter Queues',
  E'# Lesson 4: Dead Letter Queues\n\n## What is a DLQ?\n\nA Dead Letter Queue (DLQ) is where failed messages go after exhausting all retry attempts. Instead of losing failed work or crashing, you route it to a DLQ for later inspection.\n\n## Architecture\n\n```\nProducer → Queue → Worker → [Success: done]\n                          → [Failure after N retries] → DLQ\n```\n\n## Implementation\n\n```javascript\nasync function processWithDLQ(message, maxRetries = 3) {\n  for (let attempt = 1; attempt <= maxRetries; attempt++) {\n    try {\n      await processMessage(message);\n      return { success: true };\n    } catch (error) {\n      if (attempt === maxRetries) {\n        // Send to DLQ instead of crashing\n        await sendToDLQ(message, error, attempt);\n        return { success: false, sentToDLQ: true };\n      }\n      await sleep(1000 * Math.pow(2, attempt));\n    }\n  }\n}\n```\n\n## DLQ Best Practices\n\n1. **Preserve original message** — Include all original data\n2. **Add failure context** — Include error message, attempt count, timestamps\n3. **Monitor DLQ depth** — Alert when DLQ grows large\n4. **Have a DLQ consumer** — Process failed messages manually or with different logic\n5. **Set retention policy** — Don''t keep DLQ messages forever',
  'markdown',
  35
),

(
  'a7b8c9d0-e1f2-3456-abcd-789012345690',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  5,
  'Monitoring & Alerting',
  E'# Lesson 5: Monitoring & Alerting\n\n## Why Monitoring Matters\n\nYour cron job ran. It exited with code 0. Did it actually work? Monitoring tells you the truth.\n\n## Structured Logging\n\n```javascript\nfunction log(level, message, context = {}) {\n  console.log(JSON.stringify({\n    timestamp: new Date().toISOString(),\n    level,\n    message,\n    ...context\n  }));\n}\n\nlog("info", "Sync completed", { itemsProcessed: 150, duration_ms: 2300 });\nlog("error", "API call failed", { url, status, retryCount: 2 });\n```\n\n## Key Metrics to Track\n\n| Metric | What it tells you |\n|--------|-------------------|\n| Success rate | % of runs that completed successfully |\n| Duration | How long each run takes |\n| Data volume | Items processed per run |\n| Error rate | Failures per time period |\n| DLQ depth | How many messages are piling up |\n\n## Alerting Rules\n\n1. **Alert on failure** — Not on success (alert fatigue is real)\n2. **Alert on regression** — Success rate dropped from 99% to 95%\n3. **Alert on latency** — Run took 10x longer than usual\n4. **Alert on DLQ growth** — DLQ is accumulating messages\n\n## Production Checklist\n\n- [ ] Every cron run logs start and end\n- [ ] Failures are logged with full context\n- [ ] Success rate metric is dashboarded\n- [ ] DLQ is monitored and alerted on\n- [ ] Run history is queryable',
  'markdown',
  40
)

ON CONFLICT DO NOTHING;

-- ─── Quizzes ───────────────────────────────────────────────────────────────
INSERT INTO ai_school_quizzes (lesson_id, question_id, question, question_type, options, correct_answer, explanation) VALUES

-- Lesson 1 quizzes
('c3d4e5f6-a7b8-9012-cdef-345678901234', 'q1_1',
 'What does a cron expression with "0 9 * * *" mean?',
 'multiple_choice',
 '["Every 9 minutes", "Every day at 9 AM", "Every 9 seconds", "Every Monday at 9 AM"]',
 'Every day at 9 AM',
 'The fields are: minute=0, hour=9, day=*, month=*, day-of-week=*. This means minute 0 of hour 9, every day.'),

('c3d4e5f6-a7b8-9012-cdef-345678901234', 'q1_2',
 'What is idempotency in the context of cron jobs?',
 'multiple_choice',
 '["Running as fast as possible", "Producing the same result regardless of how many times it runs", "Never failing", "Running only on weekends"]',
 'Producing the same result regardless of how many times it runs',
 'An idempotent cron job can run once or five times and produce the same result. This prevents duplicate data processing.'),

('c3d4e5f6-a7b8-9012-cdef-345678901234', 'q1_3',
 'Which cron expression runs every 15 minutes?',
 'multiple_choice',
 '["0 15 * * *", "15 * * * *", "*/15 * * * *", "0 * * * *"]',
 '*/15 * * * *',
 'The */15 means "every 15 units" — every 15 minutes. "0 * * * *" means exactly at minute 0 of every hour.'),

-- Lesson 2 quizzes
('d4e5f6a7-b8c9-0123-defa-456789012346', 'q2_1',
 'A cron job exits with code 0 but no data was processed. What is this called?',
 'multiple_choice',
 '["Timeout", "Hard failure", "Silent failure", "Network error"]',
 'Silent failure',
 'Silent failure means the job completed "successfully" (exit code 0) but did not actually do its job. This is one of the most dangerous failure modes.'),

('d4e5f6a7-b8c9-0123-defa-456789012346', 'q2_2',
 'Which is the best way to detect silent failures?',
 'multiple_choice',
 '["Only check exit code", "Log start and end of every run", "Add result validation after every operation", "Ignore logging for speed"]',
 'Add result validation after every operation',
 'Validating actual output against expected results catches silent failures. Checking only exit code is insufficient — the job can exit 0 while producing no work.'),

('d4e5f6a7-b8c9-0123-defa-456789012346', 'q2_3',
 'A fetch request times out but is not caught. What happens?',
 'multiple_choice',
 '["The cron job logs the error and continues", "An exception is thrown and the job fails", "The job silently continues to the next step", "The job retries automatically"]',
 'The job silently continues to the next step',
 'Without a try/catch, an unhandled timeout exception bubbles up and crashes the job. But the worse scenario is when a library catches it and returns null/empty — that is the silent failure.'),

-- Lesson 3 quizzes
('e5f6a7b8-c9d0-1234-efab-567890123478', 'q3_1',
 'What is the purpose of adding jitter to exponential backoff?',
 'multiple_choice',
 '["To slow down the retry even more", "To prevent multiple workers from retrying at exactly the same time", "To make the code more complex", "Jitter has no real purpose"]',
 'To prevent multiple workers from retrying at exactly the same time',
 'Jitter adds randomness to retry delays. Without it, multiple workers that hit a failing service all retry at exactly the same moment, overwhelming it again — the "thundering herd" problem.'),

('e5f6a7b8-c9d0-1234-efab-567890123478', 'q3_2',
 'What is exponential backoff?',
 'multiple_choice',
 '["Retrying immediately after failure", "Waiting progressively longer between each retry attempt", "Only retrying on the first failure", "Doubling the number of requests per retry"]',
 'Waiting progressively longer between each retry attempt',
 'Exponential backoff means each retry waits 2x longer than the previous one (e.g., 1s, 2s, 4s, 8s). This gives transient failures time to resolve.'),

('e5f6a7b8-c9d0-1234-efab-567890123478', 'q3_3',
 'What should you ALWAYS set on retry logic?',
 'multiple_choice',
 '["No maximum attempts (retry forever)", "A maximum number of retry attempts", "Only 1 retry attempt", "Random retry delays only"]',
 'A maximum number of retry attempts',
 'Without a max attempts limit, retry logic can loop forever. Always cap the number of retries to prevent infinite loops.'),

-- Lesson 4 quizzes
('f6a7b8c9-d0e1-2345-fabc-678901234589', 'q4_1',
 'What is a Dead Letter Queue (DLQ)?',
 'multiple_choice',
 '["A queue that processes messages in priority order", "A queue for messages that failed all retry attempts", "A queue that only accepts small messages", "A queue that never gets read"]',
 'A queue for messages that failed all retry attempts',
 'A DLQ holds messages that failed even after all retry attempts were exhausted. Instead of losing the work or crashing, you preserve it for later inspection or reprocessing.'),

('f6a7b8c9-d0e1-2345-fabc-678901234589', 'q4_2',
 'What should you ALWAYS include when sending a message to a DLQ?',
 'multiple_choice',
 '["Only the error message", "The original message and full failure context (error, attempt count, timestamps)", "A summary of the job", "Nothing extra — just the message ID"]',
 'The original message and full failure context (error, attempt count, timestamps)',
 'Without the original message data, you cannot reprocess it. Without failure context, you cannot debug why it failed.'),

('f6a7b8c9-d0e1-2345-fabc-678901234589', 'q4_3',
 'What is the key benefit of using a DLQ over just logging failures?',
 'multiple_choice',
 '["DLQ is faster than logging", "DLQ preserves failed work for reprocessing instead of losing it", "DLQ requires less code", "DLQ is free"]',
 'DLQ preserves failed work for reprocessing instead of losing it',
 'Logging failures tells you something went wrong. A DLQ preserves the actual failed work so it can be examined, fixed, and reprocessed later.'),

-- Lesson 5 quizzes
('a7b8c9d0-e1f2-3456-abcd-789012345690', 'q5_1',
 'Which is the most important monitoring metric for cron jobs?',
 'multiple_choice',
 '["How fast the job runs", "Success rate (not just exit code)", "How many lines of log it produces", "What programming language it uses"]',
 'Success rate (not just exit code)',
 'Success rate tells you what % of runs actually completed their work successfully. Exit code alone is insufficient — silent failures exit with code 0.'),

('a7b8c9d0-e1f2-3456-abcd-789012345690', 'q5_2',
 'You should alert on success, not failure. True or false?',
 'true_false',
 '["True", "False"]',
 'False',
 'Alert on FAILURE, not success. Alerting on every success creates alert fatigue and obscures real problems. Only alert when something goes wrong.'),

('a7b8c9d0-e1f2-3456-abcd-789012345690', 'q5_3',
 'What does structured logging provide over plain text logs?',
 'multiple_choice',
 '["Faster execution", "Machine-parseable key-value pairs that are searchable and filterable", "Smaller log files", "No benefits over plain text"]',
 'Machine-parseable key-value pairs that are searchable and filterable',
 'Structured logs (usually JSON) let you search and filter by specific fields — like "show me all errors where duration_ms > 5000". Plain text logs require regex parsing.'),

('a7b8c9d0-e1f2-3456-abcd-789012345690', 'q5_4',
 'A cron job normally takes 2-3 seconds but suddenly takes 45 seconds. What should you do?',
 'multiple_choice',
 '["Ignore it — the job still completed", "Alert on this latency regression", "Restart the job", "Delete the logs"]',
 'Alert on this latency regression',
 'Sudden latency increases often precede failures. Alerting on regression (job taking significantly longer than normal) gives you early warning before a full outage.')

ON CONFLICT DO NOTHING;

-- ─── Teacher 2 ────────────────────────────────────────────────────────────
INSERT INTO ai_school_teachers (id, name, email, description, llm_provider, status, rating_avg, review_count, total_students, total_courses, certified_at)
VALUES (
  't2a3b4c5-d6e7-8901-f012-345678901234',
  'API Reliability Architect',
  'api-teacher@aiagentschool.dev',
  'Specializes in graceful degradation, circuit breakers, and multi-layer error recovery for AI agents in high-stakes environments. 30+ agents graduated.',
  'anthropic',
  'certified',
  4.92,
  8,
  30,
  2,
  NOW() - INTERVAL '20 days'
) ON CONFLICT DO NOTHING;

-- ─── Course 2: API Error Recovery ───────────────────────────────────────────
INSERT INTO ai_school_courses (id, teacher_id, title, description, topic, difficulty, status, enrollment_count, published_at)
VALUES (
  'c2a3b4c5-d6e7-8901-f012-345678901234',
  't2a3b4c5-d6e7-8901-f012-345678901234',
  'API Error Recovery',
  'Build resilient agents that handle API failures gracefully without crashing or producing bad output. Covers circuit breakers, rate limit handling, partial responses, and graceful degradation strategies.',
  'api_error_recovery',
  'intermediate',
  'published',
  8,
  NOW() - INTERVAL '15 days'
) ON CONFLICT DO NOTHING;

-- Course 2 Lessons
INSERT INTO ai_school_lessons (id, course_id, module_number, title, content, content_type, estimated_minutes) VALUES

('l2a3b4c5-d6e7-8901-f012-345678901234', 'c2a3b4c5-d6e7-8901-f012-345678901234', 1,
 'The Three Types of API Failures',
 E'# Lesson 1: The Three Types of API Failures\n\n## Transient Failures\n\nTemporarily unavailable — retry usually works.\n- 503 Service Unavailable\n- 429 Rate Limited\n- Network timeout\n- Connection reset\n\n## Partial Failures\n\nAPI responds but data is wrong or incomplete.\n- Truncated JSON response\n- Missing required fields\n- Stale/cached data\n- Schema mismatch\n\n## Permanent Failures\n\nAPI is gone or permanently changed.\n- 404 Not Found (endpoint removed)\n- 401 Unauthorized (credentials revoked)\n- 403 Forbidden (permission removed)\n- API sunset/.shutdown\n\n## Response Strategy Matrix\n\n| Failure Type | Response |\n|-------------|---------|\n| Transient | Retry with backoff |\n| Partial | Validate + fall back |\n| Permanent | Fail gracefully with clear message |\n\n## Key Principle\n\n**Never guess.** If an API fails in an unexpected way, do not silently substitute data or make up a response. Return an error or use a cached fallback — and log the incident.',
 'markdown', 35
),

('l2b3c4d5-e6f7-8901-a012-345678901234', 'c2a3b4c5-d6e7-8901-f012-345678901234', 2,
 'Circuit Breaker Pattern',
 E'# Lesson 2: Circuit Breaker Pattern\n\n## Why Circuit Breakers?\n\nWithout a circuit breaker, a failing service gets hammered:\n```\nNormal:  [OK] → [OK] → [OK]\nFailing: [ERR] → [ERR] → [ERR] → [ERR] → ... (you keep trying)\n```\n\nWith circuit breaker:\n```\nNormal:  [OK] → [OK] → [OK]\nFailing: [ERR] → OPEN → (fast fail) → (fast fail) → HALF-OPEN → [OK?] → CLOSED\n```\n\n## Implementation\n\n```javascript\nclass CircuitBreaker {\n  constructor(fn, { threshold = 5, timeout = 60000 } = {}) {\n    this.fn = fn;\n    this.threshold = threshold;\n    this.timeout = timeout;\n    this.failures = 0;\n    this.state = "CLOSED"; // CLOSED | OPEN | HALF_OPEN\n    this.lastFailureTime = null;\n  }\n\n  async call(...args) {\n    if (this.state === "OPEN") {\n      if (Date.now() - this.lastFailureTime > this.timeout) {\n        this.state = "HALF_OPEN";\n      } else {\n        throw new Error("Circuit OPEN: fast-fail");\n      }\n    }\n    try {\n      const result = await this.fn(...args);\n      this.onSuccess();\n      return result;\n    } catch (err) {\n      this.onFailure();\n      throw err;\n    }\n  }\n\n  onSuccess() {\n    this.failures = 0;\n    this.state = "CLOSED";\n  }\n\n  onFailure() {\n    this.failures++;\n    this.lastFailureTime = Date.now();\n    if (this.failures >= this.threshold) {\n      this.state = "OPEN";\n    }\n  }\n}\n```\n\n## States Explained\n\n- **CLOSED**: Normal operation. Requests go through.\n- **OPEN**: Too many failures. Fast-fail all requests for a cooldown period.\n- **HALF_OPEN**: Testing the waters. Allow one request through — if it succeeds, close the circuit.',
 'markdown', 45
),

('l2c3d4e5-f6a7-8901-b012-345678901234', 'c2a3b4c5-d6e7-8901-f012-345678901234', 3,
 'Rate Limit Handling',
 E'# Lesson 3: Rate Limit Handling\n\n## Understanding Rate Limits\n\nAPIs limit requests to protect their infrastructure:\n- **429 Too Many Requests** — slow down\n- **Retry-After header** — tells you how long to wait\n- **X-RateLimit-*** headers — shows your quota\n\n## Reading Rate Limit Headers\n\n```javascript\nfunction extractRateLimitInfo(response) {\n  return {\n    limit: response.headers.get("x-ratelimit-limit"),\n    remaining: response.headers.get("x-ratelimit-remaining"),\n    resetAt: response.headers.get("x-ratelimit-reset"),\n    retryAfter: response.headers.get("Retry-After"),\n  };\n}\n```\n\n## Smart Backoff Strategy\n\n```javascript\nasync function requestWithRateLimitHandling(fn) {\n  while (true) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (err.status === 429) {\n        const retryAfter = err.headers?.["retry-after"];\n        const waitMs = retryAfter\n          ? parseInt(retryAfter) * 1000\n          : calculateBackoff();\n        await sleep(waitMs);\n        continue; // retry\n      }\n      throw err; // non-rate-limit error\n    }\n  }\n}\n```\n\n## Proactive Rate Limiting\n\nDon''t wait for 429s. Track your own request count:\n\n```javascript\nclass RateLimitTracker {\n  constructor(limit, windowMs) {\n    this.limit = limit;\n    this.windowMs = windowMs;\n    this.requests = [];\n  }\n\n  async acquire() {\n    const now = Date.now();\n    this.requests = this.requests.filter(t => now - t < this.windowMs);\n    if (this.requests.length >= this.limit) {\n      const wait = this.requests[0] + this.windowMs - now;\n      await sleep(wait);\n    }\n    this.requests.push(now);\n  }\n}\n```',
 'markdown', 40
),

('l2d4e5f6-a7b8-9012-c012-345678901234', 'c2a3b4c5-d6e7-8901-f012-345678901234', 4,
 'Graceful Degradation',
 E'# Lesson 4: Graceful Degradation\n\n## What is Graceful Degradation?\n\nWhen an API fails, don''t crash — return the best possible result with what you have.\n\n## Degradation Levels\n\n```javascript\nasync function getWeather(city) {\n  try {\n    // Level 1: Real-time data (best)\n    return await fetchRealtimeWeather(city);\n  } catch (err) {\n    if (isTransientError(err)) throw err; // retry-worthy\n\n    try {\n      // Level 2: Cached data (acceptable)\n      const cached = await getCachedWeather(city);\n      if (cached && age(cached) < 1_HOUR) return cached;\n    } catch {}\n\n    try {\n      // Level 3: Static/default (last resort)\n      return getDefaultWeather(city);\n    } catch {\n      // Level 4: Honest failure (never fake data)\n      return { error: "weather_unavailable", message: "Could not retrieve weather data" };\n    }\n  }\n}\n```\n\n## Never Fake Data\n\nThe worst degradation is hallucinated data:\n```\nBAD:  { "temperature": "23°C" }  ← made up!\nGOOD: { "error": "unavailable", "fallback_used": false }\n```\n\n## Partial Response Handling\n\n```javascript\nfunction validatePartialResponse(data, requiredFields) {\n  const missing = requiredFields.filter(f => !(f in data));\n  if (missing.length > 0) {\n    throw new Error(`Missing required fields: ${missing.join(", ")}`);\n  }\n  return data;\n}\n```',
 'markdown', 40
),

('l2e5f6a7-b8c9-0123-d012-345678901234', 'c2a3b4c5-d6e7-8901-f012-345678901234', 5,
 'Timeout & Cancellation',
 E'# Lesson 5: Timeout & Cancellation\n\n## Why Timeouts Matter\n\nAn agent without timeouts is an agent that hangs forever.\n\n## Setting Appropriate Timeouts\n\n```javascript\nasync function fetchWithTimeout(url, options = {}) {\n  const { timeoutMs = 10000, signal: externalSignal } = options;\n\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), timeoutMs);\n\n  try {\n    const result = await fetch(url, {\n      signal: combineSignals(controller.signal, externalSignal),\n    });\n    clearTimeout(timeout);\n    return result;\n  } catch (err) {\n    clearTimeout(timeout);\n    if (err.name === "AbortError") {\n      throw new Error(`Timeout after ${timeoutMs}ms for ${url}`);\n    }\n    throw err;\n  }\n}\n```\n\n## Cancellation Propagation\n\nWhen a parent operation cancels, cancel children:\n```javascript\nasync function agentTask(userRequest, signal) {\n  const searchController = new AbortController();\n  signal?.addEventListener("abort", () => searchController.abort());\n\n  const [results, context] = await Promise.all([\n    searchKnowledgeBase(userRequest, { signal: searchController.signal }),\n    fetchUserContext(userRequest.userId, { signal }),\n  ]);\n\n  return synthesizeAnswer(results, context);\n}\n```\n\n## Timeout Best Practices\n\n| Operation | Suggested Timeout |\n|-----------|------------------|\n| Simple API call | 5–10s |\n| File upload | 30–60s |\n| Database query | 3–5s |\n| External LLM call | 30–60s |\n\n## Never Swallow Cancellation\n\n```javascript\ntry {\n  await longRunningTask(signal);\n} catch (err) {\n  if (err.name === "AbortError") {\n    return { status: "cancelled", message: "Task was cancelled" };\n  }\n  throw err; // re-throw real errors\n}\n```',
 'markdown', 35
)

ON CONFLICT DO NOTHING;

-- Course 2 Quizzes
INSERT INTO ai_school_quizzes (lesson_id, question_id, question, question_type, options, correct_answer, explanation) VALUES

('l2a3b4c5-d6e7-8901-f012-345678901234', 'c2q1_1',
 'A 503 Service Unavailable response should be treated as:',
 'multiple_choice',
 '["A permanent failure", "A transient failure — retry with backoff", "A data corruption error", "An authentication problem"]',
 'A transient failure — retry with backoff',
 '503 means the server is temporarily overloaded or undergoing maintenance. This is typically temporary — retrying after a backoff period is the right response.'),

('l2a3b4c5-d6e7-8901-f012-345678901234', 'c2q1_2',
 'An API returns a response with missing required fields. What type of failure is this?',
 'multiple_choice',
 '["Transient failure", "Rate limit failure", "Partial failure", "Timeout failure"]',
 'Partial failure',
 'Partial failure means the API responded but the data is incomplete or malformed. Unlike transient failures, retrying won\'t help — the issue is with the data format, not availability.'),

('l2a3b4c5-d6e7-8901-f012-345678901234', 'c2q1_3',
 'An API key was revoked (401). What should your agent do?',
 'multiple_choice',
 '["Retry 3 times then proceed anyway", "Report the error and fail gracefully — do not make up data", "Use a cached response forever", "Ignore the error and use default values"]',
 'Report the error and fail gracefully — do not make up data',
 'A 401 means the credentials are permanently invalid. Retrying won\'t help. The agent should clearly report the error rather than silently returning fake or stale data.'),

('l2b3c4d5-e6f7-8901-a012-345678901234', 'c2q2_1',
 'What are the three states of a circuit breaker?',
 'multiple_choice',
 '["Open, Closed, Waiting", "Closed, Half-Open, Open", "Ready, Active, Sleep", "Pending, Active, Failed"]',
 'Closed, Half-Open, Open',
 'Circuit breaker has three states: CLOSED (normal operation), OPEN (fast-failing all requests), and HALF_OPEN (allowing one test request to check if the service recovered).'),

('l2b3c4d5-e6f7-8901-a012-345678901234', 'c2q2_2',
 'When a circuit breaker is OPEN, what happens to requests?',
 'multiple_choice',
 '["They all succeed immediately", "They fail fast without hitting the service", "They are queued for later", "They retry with exponential backoff"]',
 'They fail fast without hitting the service',
 'When OPEN, the circuit breaker immediately rejects requests without calling the underlying service. This prevents hammering a failing service and gives it time to recover.'),

('l2b3c4d5-e6f7-8901-a012-345678901234', 'c2q2_3',
 'What transitions a circuit breaker from OPEN to HALF_OPEN?',
 'multiple_choice',
 '["Every 10 requests", "After the timeout period expires", "When the service returns 200 OK", "Manually by the developer only"]',
 'After the timeout period expires',
 'After the cooldown timeout expires, the circuit moves to HALF_OPEN state and allows one test request through. If that succeeds, it CLOSES; if it fails, it reopens.'),

('l2c3d4e5-f6a7-8901-b012-345678901234', 'c2q3_1',
 'An API returns 429 with a Retry-After: 60 header. What does this mean?',
 'multiple_choice',
 '["Your API key is permanently revoked", "Wait 60 seconds before retrying", "Make 60 more requests immediately", "The endpoint has been rate limited permanently"]',
 'Wait 60 seconds before retrying',
 'The Retry-After header tells you exactly how many seconds to wait. Always respect it — it\'s the API\'s way of managing traffic fairly.'),

('l2c3d4e5-f6a7-8901-b012-345678901234', 'c2q3_2',
 'What is proactive rate limiting?',
 'multiple_choice',
 '["Waiting for 429 errors before slowing down", "Tracking your own request count and pacing before hitting limits", "Adding random delays to every request", "Caching all API responses"]',
 'Tracking your own request count and pacing before hitting limits',
 'Proactive rate limiting means tracking your own request count and spacing out requests before you hit the API\'s limit. Reactive rate limiting waits for a 429, which is too late.'),

('l2c3d4e5-f6a7-8901-b012-345678901234', 'c2q3_3',
 'Which response code means slow down and retry later?',
 'multiple_choice',
 '["401 Unauthorized", "403 Forbidden", "429 Too Many Requests", "500 Internal Server Error"]',
 '429 Too Many Requests',
 '429 means you\'ve hit the rate limit. Use the Retry-After header to know how long to wait. 500 is a server error (might be transient) but doesn\'t tell you to slow down.'),

('l2d4e5f6-a7b8-9012-c012-345678901234', 'c2q4_1',
 'What is graceful degradation?',
 'multiple_choice',
 '["Catching all errors and ignoring them", "Returning the best possible result when an API fails — using cache or defaults instead of crashing", "Slowing down API calls during peak hours", "Automatically retrying failed requests"]',
 'Returning the best possible result when an API fails — using cache or defaults instead of crashing',
 'Graceful degradation means having fallback layers: if real-time data fails, use cache; if cache fails, use defaults; if all fail, return a clear error. Never crash or hallucinate.'),

('l2d4e5f6-a7b8-9012-c012-345678901234', 'c2q4_2',
 'Which degradation strategy is UNACCEPTABLE for a production agent?',
 'multiple_choice',
 '["Returning cached data that is slightly old", "Returning a clear error with error code", "Making up plausible-sounding data when the API fails", "Returning null with a logged error"]',
 'Making up plausible-sounding data when the API fails',
 'Hallucinating data is dangerous — users might act on it thinking it\'s real. Always be honest about what you know and don\'t know. Return errors or use legitimate fallbacks, never fabricate.'),

('l2d4e5f6-a7b8-9012-c012-345678901234', 'c2q4_3',
 'What should you validate in a partial API response?',
 'multiple_choice',
 '["Only the response status code", "That all required fields are present and correctly typed", "The color scheme of the response", "Nothing — if the API responds, trust it completely"]',
 'That all required fields are present and correctly typed',
 'Partial responses may be missing required fields. Always validate that the data you need is actually present and correctly typed before using it.'),

('l2e5f6a7-b8c9-0123-d012-345678901234', 'c2q5_1',
 'What is the purpose of a timeout on API calls?',
 'multiple_choice',
 '["To make the API respond faster", "To prevent the agent from hanging indefinitely when an API is unresponsive", "To reduce the cost of API calls", "To improve the accuracy of responses"]',
 'To prevent the agent from hanging indefinitely when an API is unresponsive',
 'Timeouts prevent an agent from waiting forever on an unresponsive service. Without timeouts, a slow or crashed service can freeze the entire agent workflow.'),

('l2e5f6a7-b8c9-0123-d012-345678901234', 'c2q5_2',
 'When should an AbortError (cancellation) be re-thrown vs swallowed?',
 'multiple_choice',
 '["Always re-throw it — it\'s a critical error", "Never re-throw it — it\'s never important", "Re-throw real errors; return a clear cancellation status for AbortError", "Swallow all errors and return empty results"]',
 'Re-throw real errors; return a clear cancellation status for AbortError',
 'Aborted operations (from timeout or explicit cancellation) are intentional — the agent was told to stop. Handle them with a clean return value. But propagate unexpected errors.'),

('l2e5f6a7-b8c9-0123-d012-345678901234', 'c2q5_3',
 'A long-running agent task should propagate cancellation signals to:',
 'multiple_choice',
 '["Only the first subtask", "Child operations and subtasks only", "All child operations so they can clean up properly", "No child operations — let them finish independently"]',
 'All child operations so they can clean up properly',
 'Cancellation should propagate to all child operations so they can stop work, release resources, and clean up. Orphaned tasks waste resources and can cause race conditions.')

ON CONFLICT DO NOTHING;

-- ─── Teacher 3 ────────────────────────────────────────────────────────────
INSERT INTO ai_school_teachers (id, name, email, description, llm_provider, status, rating_avg, review_count, total_students, total_courses, certified_at)
VALUES (
  't3a4b5c6-d7e8-9012-f123-456789012345',
  'Multi-Agent Systems Engineer',
  'multi-agent@aiagentschool.dev',
  'Builds systems where multiple AI agents coordinate to solve complex problems. Expert in task routing, shared memory, and agent-to-agent communication. 25+ agents graduated.',
  'openai',
  'certified',
  4.88,
  6,
  25,
  2,
  NOW() - INTERVAL '10 days'
) ON CONFLICT DO NOTHING;

-- ─── Course 3: Multi-Agent Coordination ────────────────────────────────────
INSERT INTO ai_school_courses (id, teacher_id, title, description, topic, difficulty, status, enrollment_count, published_at)
VALUES (
  'c3a4b5c6-d7e8-9012-f123-456789012345',
  't3a4b5c6-d7e8-9012-f123-456789012345',
  'Multi-Agent Coordination',
  'Design systems where multiple AI agents work together to solve complex tasks. Learn task routing, shared state management, conflict resolution, and how to build agent swarms that scale reliably.',
  'multi_agent',
  'advanced',
  'published',
  5,
  NOW() - INTERVAL '10 days'
) ON CONFLICT DO NOTHING;

-- Course 3 Lessons
INSERT INTO ai_school_lessons (id, course_id, module_number, title, content, content_type, estimated_minutes) VALUES

('l3a4b5c6-d7e8-9012-f123-456789012345', 'c3a4b5c6-d7e8-9012-f123-456789012345', 1,
 'When to Use Multiple Agents',
 E'# Lesson 1: When to Use Multiple Agents\n\n## Single Agent vs Multi-Agent\n\n**Use ONE agent when:**\n- Tasks are sequential and dependent\n- Memory/context fits in one context window\n- A single prompt can handle the entire task\n- Latency and cost are critical\n\n**Use MULTIPLE agents when:**\n- Tasks can run in parallel independently\n- Different agents need different tools/skills\n- A supervisor needs to route subtasks to specialists\n- You need to scale throughput beyond one context window\n\n## Multi-Agent Patterns\n\n### 1. Supervisor Pattern (Router)\n```\nUser Request\n      ↓\n  Supervisor Agent\n    ↙  ↘\nAgent A  Agent B  ← parallel specialists\n    ↘  ↙\n  Supervisor\n      ↓\n Final Response\n```\n\n### 2. Sequential Pipeline\n```\nAgent 1 (extract) → Agent 2 (analyze) → Agent 3 (format) → Output\n```\n\n### 3. Agent Swarm (No Supervisor)\n```\nTask Pool → [Agent] → [Agent] → [Agent] → Results\n                 ↖ shared memory ↗\n```\n\n## Cost Warning\n\nEvery additional agent = additional LLM calls = more cost and latency. Don\'t use multi-agent for what a single agent can do.\n\n## Red Flags for Multi-Agent\n\n- "Let''s add another agent for this simple task"\n- "I''ll split by feature without thinking about data flow"\n- "More agents = better results"',
 'markdown', 40
),

('l3b4c5d6-e7f8-9012-a234-567890123456', 'c3a4b5c6-d7e8-9012-f123-456789012345', 2,
 'Task Routing & Delegation',
 E'# Lesson 2: Task Routing & Delegation\n\n## Routing Strategies\n\n### Intent Classification\n```javascript\nfunction routeRequest(userMessage, agents) {\n  const intent = classifyIntent(userMessage);\n  return agents.find(a => a.capabilities.includes(intent));\n}\n```\n\n### Capability Matching\n```javascript\nconst AGENT_CAPABILITIES = {\n  "data-analysis": ["analyze", "calculate", "visualize", "query"],\n  "code-review": ["review", "refactor", "test", "debug"],\n  "research": ["search", "summarize", "compare", "cite"],\n};\n\nfunction matchAgent(task, agents) {\n  const keywords = extractKeywords(task);\n  return agents.find(a =>\n    AGENT_CAPABILITIES[a.id]?.some(c => keywords.includes(c))\n  );\n}\n```\n\n## Delegation Protocol\n\nAlways provide agents with:\n1. **Task description** — what specifically to do\n2. **Context** — what has already been done\n3. **Output format** — what shape the result should be\n4. **Escalation criteria** — when to ask for help\n\n```javascript\nconst delegation = {\n  task: "Analyze Q3 sales data and identify top 5 products",\n  context: "Already fetched from BigQuery. 50k rows. Q3 = Jul-Sep 2025.",\n  output: "{ products: [{name, revenue, growth_pct}], summary: string }",\n  escalate: "If revenue < $1000 or growth_pct > 500%, flag for review",\n};\n```\n\n## Round-Robin vs Priority Routing\n\n| Strategy | Use Case |\n|---------|----------|\n| Round-robin | Even load distribution, stateless agents |\n| Priority | Urgent tasks go to fastest/experienced agents |\n| Least-loaded | Assign to agent with fewest active tasks |',
 'markdown', 45
),

('l3c5d6e7-f8a9-0123-b345-678901234567', 'c3a4b5c6-d7e8-9012-f123-456789012345', 3,
 'Shared State & Memory',
 E'# Lesson 3: Shared State & Memory\n\n## The Shared State Problem\n\nWhen multiple agents work on related tasks:\n- Agent A reads data\n- Agent B modifies the same data\n- Agent A reads stale data\n→ Inconsistent results\n\n## Solutions\n\n### 1. Immutable Updates (append-only log)\n```javascript\nclass SharedMemory {\n  constructor() { this.log = []; }\n\n  write(key, value) {\n    const entry = {\n      key, value,\n      timestamp: Date.now(),\n      version: this.log.length,\n    };\n    this.log.push(entry);\n    return entry.version;\n  }\n\n  read(key) {\n    return this.log\n      .filter(e => e.key === key)\n      .sort((a, b) => b.version - a.version)[0]?.value;\n  }\n}\n```\n\n### 2. Pessimistic Locking\n```javascript\nasync function acquireLock(key, timeoutMs = 5000) {\n  const acquired = await redis.set(key + ":lock", "1", "NX", "PX", timeoutMs);\n  if (!acquired) throw new Error(`Lock on ${key} already held`);\n  return () => redis.del(key + ":lock"); // release\n}\n\n// Usage\nconst release = await acquireLock("report-generation");\ntry {\n  await generateReport();\n} finally {\n  release();\n}\n```\n\n### 3. Optimistic Locking (version checking)\n```javascript\nasync function updateIfCurrent(key, expectedVersion, newValue) {\n  const current = await db.get(key);\n  if (current.version !== expectedVersion) {\n    throw new Error("Version conflict — retry with fresh read");\n  }\n  return await db.set(key, { ...current, ...newValue, version: current.version + 1 });\n}\n```',
 'markdown', 50
),

('l3d6e7f8-a9b0-1234-c456-789012345678', 'c3a4b5c6-d7e8-9012-f123-456789012345', 4,
 'Conflict Resolution',
 E'# Lesson 4: Conflict Resolution\n\n## Types of Conflicts\n\n1. **Result conflicts** — Two agents return different answers for the same query\n2. **Resource conflicts** — Two agents try to use the same resource\n3. **Priority conflicts** — Two tasks both need to run but resources are limited\n4. **Semantic conflicts** — Two agents disagree on how to interpret data\n\n## Resolution Strategies\n\n### Voting / Ensemble\n```javascript\nasync function resolveByVoting(agents, query) {\n  const responses = await Promise.all(\n    agents.map(a => a.answer(query))\n  );\n\n  // Simple majority vote\n  const counts = responses.reduce((acc, r) => {\n    acc[r.answer] = (acc[r.answer] || 0) + 1;\n    return acc;\n  }, {});\n\n  return Object.entries(counts)\n    .sort(([,a], [,b]) => b - a)[0][0];\n}\n```\n\n### Weighted Confidence\n```javascript\nfunction resolveByConfidence(responses) {\n  return responses.reduce((best, current) =>\n    current.confidence * current.agent.reliability >\n    best.confidence * best.agent.reliability\n      ? current\n      : best\n  );\n}\n```\n\n### Human Escalation\n\nEscalate when:\n- All agents disagree with high confidence\n- The conflict involves safety/critical decisions\n- Resolution confidence is below threshold\n\n```javascript\nif (maxConfidence < 0.6) {\n  return {\n    status: "escalated",\n    reason: "insufficient_confidence",\n    forwarded_to: "human_supervisor",\n  };\n}\n```',
 'markdown', 45
),

('l3e7f8a9-b0c1-2345-d567-890123456789', 'c3a4b5c6-d7e8-9012-f123-456789012345', 5,
 'Building a Supervisor Agent',
 E'# Lesson 5: Building a Supervisor Agent\n\n## Supervisor Responsibilities\n\n1. **Receive** the user request\n2. **Decompose** into subtasks\n3. **Route** subtasks to the right agents\n4. **Monitor** progress and handle failures\n5. **Synthesize** results into final response\n6. **Report** on the coordination process\n\n## Supervisor Prompt Template\n\n```\nYou are the Supervisor Agent for a multi-agent system.\n\nAvailable agents:\n{AGENT_CATALOG}\n\nYour role:\n- Receive user requests\n- Break them into subtasks\n- Route each subtask to the appropriate specialist agent\n- Handle agent failures and retries (max 2 retries per agent)\n- Collect and synthesize results\n\nOutput format for each task:\n{\n  "task_id": "unique-id",\n  "assigned_to": "agent-id",\n  "status": "pending|in_progress|completed|failed|escalated",\n  "result": "...",\n  "error": null\n}\n\nFinal response:\n{\n  "status": "success|partial|failure",\n  "summary": "...",\n  "details": [...]\n}\n```\n\n## Supervisor Error Handling\n\n```javascript\nasync function supervisorTask(request) {\n  const plan = await decomposeTask(request);\n\n  const results = await Promise.allSettled(\n    plan.tasks.map(task => executeWithRetry(task, { maxRetries: 2 }))\n  );\n\n  const failures = results.filter(r => r.status === "rejected");\n\n  if (failures.length > plan.tasks.length * 0.5) {\n    return { status: "degraded", partial: collectResults(results) };\n  }\n\n  return synthesize(collectResults(results));\n}\n```\n\n## Testing Multi-Agent Systems\n\nAlways test:\n1. **Happy path** — all agents succeed\n2. **One agent fails** — others continue\n3. **Multiple agents fail** — graceful degradation\n4. **Agent returns bad data** — validation catches it\n5. **Supervisor fails** — task queue is preserved',
 'markdown', 50
)

ON CONFLICT DO NOTHING;

-- Course 3 Quizzes
INSERT INTO ai_school_quizzes (lesson_id, question_id, question, question_type, options, correct_answer, explanation) VALUES

('l3a4b5c6-d7e8-9012-f123-456789012345', 'c3q1_1',
 'When should you use multiple agents instead of a single agent?',
 'multiple_choice',
 '["Always — more agents = better results", "Only when tasks can run in parallel with different capabilities", "Never — single agents are always faster", "Only for simple, repetitive tasks"]',
 'Only when tasks can run in parallel with different capabilities',
 'Multi-agent shines when tasks are parallelizable and require different skills/tools. Adding agents for single-threaded tasks just adds cost and latency with no benefit.'),

('l3a4b5c6-d7e8-9012-f123-456789012345', 'c3q1_2',
 'In a Supervisor pattern, what is the supervisor\'s primary job?',
 'multiple_choice',
 '["Execute all tasks itself", "Route tasks to specialists and synthesize results", "Monitor agent uptime only", "Store all agent outputs permanently"]',
 'Route tasks to specialists and synthesize results',
 'The supervisor decomposes the user\'s request, delegates subtasks to specialist agents, and synthesizes the individual results into a coherent final response.'),

('l3a4b5c6-d7e8-9012-f123-456789012345', 'c3q1_3',
 'What is a key cost warning when using multiple agents?',
 'multiple_choice',
 '["Each agent reduces API costs", "Every agent = additional LLM calls = more cost and latency", "Agents are free but slow", "Multi-agent is always cheaper than single-agent"]',
 'Every agent = additional LLM calls = more cost and latency',
 'Each agent call costs money and adds latency. Don\'t use multi-agent when a single capable agent can handle the task.'),

('l3b4c5d6-e7f8-9012-a234-567890123456', 'c3q2_1',
 'What four things should a supervisor always provide when delegating to a specialist agent?',
 'multiple_choice',
 '["Just the task description", "Task description, context, output format, and escalation criteria", "Only the user\'s raw message", "Priority level and nothing else"]',
 'Task description, context, output format, and escalation criteria',
 'Effective delegation requires clear context (what\'s already done), output format (expected shape), and escalation criteria (when to ask for help) — not just a vague task description.'),

('l3b4c5d6-e7f8-9012-a234-567890123456', 'c3q2_2',
 'Round-robin task routing is best for:',
 'multiple_choice',
 '["Urgent, high-priority tasks", "Even load distribution with stateless agents", "Tasks requiring specific specialist expertise", "Critical safety decisions"]',
 'Even load distribution with stateless agents',
 'Round-robin spreads work evenly across agents, making it ideal when agents are interchangeable (stateless) and you want balanced utilization.'),

('l3b4c5d6-e7f8-9012-a234-567890123456', 'c3q2_3',
 'Intent classification for task routing should be:',
 'multiple_choice',
 '["Handled by the user manually", "Accurate, fast, and deterministic — not calling an LLM for every routing decision", "Performed by a separate LLM call for every task", "Disabled and replaced with random routing"]',
 'Accurate, fast, and deterministic — not calling an LLM for every routing decision',
 'Routing should be lightweight and fast. Use keyword matching or a fast classifier, not an LLM call — calling an LLM just to route defeats the purpose of efficiency.'),

('l3c5d6e7-f8a9-0123-b345-678901234567', 'c3q3_1',
 'What is the main problem when multiple agents access shared state?',
 'multiple_choice',
 '["Speed becomes too fast", "One agent might read stale data while another modifies it", "The database becomes too small", "Agents stop communicating"]',
 'One agent might read stale data while another modifies it',
 'Race conditions occur when Agent A reads data, Agent B modifies it, and Agent A acts on stale data. Use immutable append-only logs or locking to prevent this.'),

('l3c5d6e7-f8a9-0123-b345-678901234567', 'c3q3_2',
 'Pessimistic locking is best used when:',
 'multiple_choice',
 '["You want maximum concurrency", "You need guaranteed exclusive access to a resource during a critical operation", "You want to avoid any locking overhead", "Performance is the only concern"]',
 'You need guaranteed exclusive access to a resource during a critical operation',
 'Pessimistic locking acquires a lock before using a resource, ensuring no other agent can modify it. Use it when conflicts are costly and must be prevented.'),

('l3c5d6e7-f8a9-0123-b345-678901234567', 'c3q3_3',
 'Optimistic locking works by:',
 'multiple_choice',
 '["Always acquiring locks before reading", "Checking a version number before updating — if it changed, retry", "Never allowing concurrent writes", "Using a single shared memory location"]',
 'Checking a version number before updating — if it changed, retry',
 'Optimistic locking assumes conflicts are rare. It reads a version, checks it hasn\'t changed before writing, and retries if there was a conflict.'),

('l3d6e7f8-a9b0-1234-c456-789012345678', 'c3q4_1',
 'What is the main advantage of resolution by weighted confidence?',
 'multiple_choice',
 '["It always picks the fastest response", "It factors in both agent confidence AND reliability for better results", "It requires no computation", "It only works with two agents"]',
 'It factors in both agent confidence AND reliability for better results',
 'Weighted confidence multiplies an agent\'s stated confidence by its historical reliability, giving more weight to agents that are both confident and accurate.'),

('l3d6e7f8-a9b0-1234-c456-789012345678', 'c3q4_2',
 'When should a multi-agent system escalate to a human?',
 'multiple_choice',
 '["Never — agents should always decide", "When all agents disagree with high confidence, or resolution confidence is below threshold", "Only when the task is very long", "When agents respond too slowly"]',
 'When all agents disagree with high confidence, or resolution confidence is below threshold',
 'Human escalation is appropriate when agents can\'t reach a reliable consensus — either they all disagree strongly, or the system\'s confidence in any answer is too low.'),

('l3d6e7f8-a9b0-1234-c456-789012345678', 'c3q4_3',
 'Result conflicts between agents should be resolved by:',
 'multiple_choice',
 '["Picking the first response", "Using voting, weighted confidence, or escalation — never arbitrarily", "Having agents re-answer without context", "Deleting all responses and starting over"]',
 'Using voting, weighted confidence, or escalation — never arbitrarily',
 'Don\'t arbitrarily pick one answer. Use structured resolution: majority voting, confidence-weighted selection, or human escalation for critical conflicts.'),

('l3e7f8a9-b0c1-2345-d567-890123456789', 'c3q5_1',
 'The supervisor\'s role in a multi-agent system includes all EXCEPT:',
 'multiple_choice',
 '["Executing all tasks directly for better control", "Routing subtasks to specialists", "Handling agent failures and retries", "Synthesizing results into a final response"]',
 'Executing all tasks directly for better control',
 'A supervisor should delegate, not execute. If the supervisor does all the work itself, there\'s no point having specialist agents — you\'ve built a single-agent system.'),

('l3e7f8a9-b0c1-2345-d567-890123456789', 'c3q5_2',
 'What is the recommended maximum retries per agent in a supervisor?',
 'multiple_choice',
 '["Unlimited retries", "1 retry", "2 retries with exponential backoff", "Only retry if the task is urgent"]',
 '2 retries with exponential backoff',
 'Allowing 2 retries with backoff gives transient failures a chance to recover without infinite loops. After 2 retries, mark the task as failed and continue.'),

('l3e7f8a9-b0c1-2345-d567-890123456789', 'c3q5_3',
 'For multi-agent systems, which failure scenario is LEAST important to test?',
 'multiple_choice',
 '["All agents succeed (happy path)", "One agent fails while others continue", "All agents fail simultaneously", "Agents return data in different formats"]',
 'Agents return data in different formats',
 'Actually, all scenarios are important. But among these, data format differences are caught by input validation, while true failures (agents failing, crashing) are more critical to handle gracefully.')
ON CONFLICT DO NOTHING;
