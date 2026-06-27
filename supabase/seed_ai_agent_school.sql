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
