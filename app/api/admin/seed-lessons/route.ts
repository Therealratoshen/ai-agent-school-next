/**
 * Seed all real lesson content for AI Agent School.
 * 3 courses × 5 lessons = 15 lessons with real production content.
 * Run: POST /api/admin/seed-lessons?secret=migrate-now
 */

export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhramomdceifuolecrpu.supabase.co'
const SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_SHORTCUT || ''

const COURSES = {
  cron: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  api: 'c2-0001-0002-0002-000000000002',
  multi: 'c3-0001-0003-0003-000000000003',
}

// ─── Real Lesson Content ────────────────────────────────────────
const LESSONS = [
  // ═══ COURSE 1: Cron Job Handling ════════════════════════════
  {
    course_id: COURSES.cron, module: 1,
    title: 'The Silent Failure Problem',
    content: `## The Silent Failure Problem

Most cron jobs fail silently. They run, they fail, and nobody knows. The failure happens at 3am, the alert doesn't fire, and by the time anyone notices, hours of data are corrupted or jobs have been skipped entirely.

### Why Cron Jobs Are Dangerous

Cron runs outside your application context. It doesn't share your logging infrastructure, your health checks, or your alerting system. A cron job is essentially a separate process that your main system has no visibility into.

Common silent failure modes:

- **Exit code ignored**: Cron runs the script but never checks \`$?\`
- **No output logging**: STDOUT/STDERR go to \`/dev/null\` or are never rotated
- **Dependency not checked**: The job assumes services are up, but doesn't verify
- **Partial completion**: Job starts, fails mid-way, reports nothing
- **Time drift**: Server clock skew causes jobs to run at wrong times

### The Reliable Cron Checklist

\`\`\`bash
# 1. Always capture and log exit codes
0 * * * * /opt/myapp/sync.sh >> /var/log/cron/sync.log 2>&1 || {
  echo "FAILED at $(date)" >> /var/log/cron/sync.err
  exit 1
}

# 2. Use flock to prevent overlapping runs
0 * * * * flock -n /var/lock/sync.lock /opt/myapp/sync.sh

# 3. Verify dependencies before starting
0 * * * * pg_isready -h db && /opt/myapp/sync.sh
\`\`\`

### Key Principle

Every cron job must answer these questions before going to production:
1. What happens if it fails? (What's the blast radius?)
2. Who gets alerted? (PagerDuty? Slack? Email?)
3. Can we replay it? (Idempotency)
4. What if it runs twice at the same time? (Concurrency safety)`,
    estimated_minutes: 15,
  },
  {
    course_id: COURSES.cron, module: 2,
    title: 'Exponential Backoff with Jitter',
    content: `## Exponential Backoff with Jitter

When a cron job or scheduled task calls an external service that fails, naive retry logic makes things worse. You hammer the failing service with retries, it stays overwhelmed, and you take down your own system trying to recover.

### The Problem with Fixed Delays

\`\`\`javascript
// BAD: Fixed delay — hammers failing service
async function syncWithRetry() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await syncData()
    } catch (err) {
      await sleep(1000) // Same delay every time
    }
  }
}
\`\`\`

This is called a "thundering herd" — all clients retry at the same intervals, creating synchronized load spikes.

### The Correct Formula

\`\`\`javascript
// GOOD: Exponential backoff with jitter
async function syncWithRetry(maxAttempts = 5, baseDelayMs = 1000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await syncData()
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err

      // Cap at 60 seconds max
      const cap = 60_000
      // Exponential: 1s, 2s, 4s, 8s, 16s...
      const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), cap)
      // Jitter: add ±50% randomness to prevent synchronized herds
      const jitter = exponentialDelay * (0.5 + Math.random())
      const delay = Math.round(jitter)

      console.log(\`Attempt \${attempt + 1} failed. Retrying in \${delay}ms...\`)
      await sleep(delay)
    }
  }
}
\`\`\`

### The Mathematics

- **Base delay**: Start small (1 second for APIs, 100ms for local)
- **Multiplier**: Double each attempt (\`2^attempt\`)
- **Cap**: Never exceed 60 seconds — beyond that, the service is probably down for real
- **Jitter**: Add \`±50%\` randomness using \`random() * 0.5 + 0.5\`

### When to Use Each Pattern

| Pattern | Use When |
|---------|---------|
| Immediate retry | Transient blips (< 1 second) |
| Fixed delay | Non-critical background jobs |
| Exponential backoff | External API calls |
| Exponential + jitter | Any production service call |

### Retry Budget

Every request has a "retry budget." If you exhaust it, stop retrying and fail fast:

\`\`\`javascript
async function syncWithBudget() {
  const startTime = Date.now()
  const maxDuration = 30_000 // 30 second budget

  while (Date.now() - startTime < maxDuration) {
    try {
      return await syncData()
    } catch (err) {
      if (Date.now() - startTime >= maxDuration) {
        throw new Error('Retry budget exhausted after 30s')
      }
      await sleep(getBackoffDelay(attempt++))
    }
  }
}
\`\`\``,
    estimated_minutes: 20,
  },
  {
    course_id: COURSES.cron, module: 3,
    title: 'Dead Letter Queues and Failure Isolation',
    content: `## Dead Letter Queues and Failure Isolation

When a job fails repeatedly, you don't want it to block the entire system. Dead Letter Queues (DLQ) capture failed messages so the rest of your pipeline keeps running.

### The Problem Without DLQ

\`\`\`javascript
// BAD: Failed message blocks the queue
async function processQueue() {
  while (true) {
    const msg = await queue.pop()
    try {
      await processMessage(msg)
    } catch (err) {
      // Message is lost. Queue is blocked.
      console.error('Failed:', err)
    }
  }
}
\`\`\`

### DLQ Pattern

\`\`\`javascript
// GOOD: Failed messages go to DLQ
async function processQueueWithDLQ() {
  while (true) {
    const msg = await queue.pop()
    try {
      await processMessage(msg)
    } catch (err) {
      // Move to DLQ, not lost
      await dlq.push({
        original: msg,
        error: err.message,
        failedAt: new Date().toISOString(),
        attemptCount: (msg.attempts || 0) + 1,
      })
      // Log for alerting
      console.error(\`DLQ: message \${msg.id} failed permanently: \${err.message}\`)
      // Alert on DLQ depth
      await alertIfDLQTooDeep()
    }
  }
}
\`\`\`

### DLQ Monitoring Rules

\`\`\`yaml
# Prometheus alerting
- alert: DLQDepthHigh
  expr: dlq_messages > 100
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Dead Letter Queue has {{ $value }} messages"

- alert: DLQNewMessages
  expr: rate(dlq_messages_added[5m]) > 10
  for: 1m
  labels:
    severity: warning
\`\`\`

### Retry Before DLQ

Messages should be retried a few times before going to DLQ:

\`\`\`javascript
async function handleMessage(msg) {
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await processMessage(msg)
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) {
        await sendToDLQ(msg, err, 'retries_exhausted')
        return
      }
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500
      await sleep(backoff)
    }
  }
}
\`\`\``,
    estimated_minutes: 20,
  },
  {
    course_id: COURSES.cron, module: 4,
    title: 'Structured Logging and Monitoring Metrics',
    content: `## Structured Logging and Monitoring Metrics

Raw log strings are useless for alerting. "Sync completed" tells you nothing. Structured logs with metrics let you build dashboards, detect anomalies, and debug failures.

### Bad vs Good Logging

\`\`\`javascript
// BAD: String logs — can't query, can't alert
console.log('Sync completed')
console.log('Sync failed: ' + error.message)

// GOOD: Structured JSON logs — queryable, alertable
logger.info('sync_completed', {
  duration_ms: 2340,
  records_processed: 1542,
  records_failed: 0,
  job_id: 'sync-2024-01-15-0300',
})

logger.error('sync_failed', {
  error: err.message,
  duration_ms: 3400,
  records_processed: 892,
  records_failed: 5,
  job_id: 'sync-2024-01-15-0300',
  retryable: err.retryable,
})
\`\`\`

### Cron Job Metrics You Must Track

\`\`\`javascript
// Prometheus metrics for cron jobs
const metrics = {
  cron_job_duration_seconds: new Histogram({
    name: 'cron_job_duration_seconds',
    help: 'Duration of cron job execution',
    labelNames: ['job_name', 'status'],
  }),

  cron_job_records_total: new Counter({
    name: 'cron_job_records_total',
    help: 'Total records processed',
    labelNames: ['job_name', 'status'], // status: success | failure | partial
  }),

  cron_job_last_success_timestamp: new Gauge({
    name: 'cron_job_last_success_timestamp',
    help: 'Unix timestamp of last successful run',
    labelNames: ['job_name'],
  }),
}

// In your cron job:
async function runSync() {
  const start = Date.now()
  try {
    const result = await syncData()
    metrics.cron_job_duration_seconds.observe(
      { job_name: 'data_sync', status: 'success' },
      (Date.now() - start) / 1000
    )
    metrics.cron_job_records_total.inc(
      { job_name: 'data_sync', status: 'success' },
      result.processed
    )
    metrics.cron_job_last_success_timestamp.set(
      { job_name: 'data_sync' },
      Date.now() / 1000
    )
  } catch (err) {
    metrics.cron_job_duration_seconds.observe(
      { job_name: 'data_sync', status: 'failure' },
      (Date.now() - start) / 1000
    )
  }
}
\`\`\`

### The 4 Golden Signals for Cron Jobs

| Signal | How to Measure |
|--------|---------------|
| **Latency** | How long did the job take? (histogram) |
| **Traffic** | How many records processed? (counter) |
| **Errors** | How many failed? What type? (counter with labels) |
| **Saturation** | How close to timeout? (gauge) |

### Alerting Rules That Don't Cause Fatigue

\`\`\`yaml
# BAD: Too noisy
- alert: CronJobFailed
  expr: cron_job_status{status="failed"}
  for: 0m  # Fires immediately on every failure

# GOOD: Fires only when sustained
- alert: CronJobSustainedFailure
  expr: changes(cron_job_status{status="failed"}[5m]) > 2
  for: 5m  # Wait 5 minutes of consistent failures
  labels:
    severity: critical
\`\`\``,
    estimated_minutes: 20,
  },
  {
    course_id: COURSES.cron, module: 5,
    title: 'Idempotency and Safe Retries',
    content: `## Idempotency and Safe Retries

The cardinal rule of cron jobs: if a job runs twice, the result should be the same as running it once. This is idempotency. Without it, retrying a cron job can corrupt data.

### The Problem

\`\`\`sql
-- BAD: Running twice inserts twice
INSERT INTO order_totals (date, total)
SELECT date, SUM(amount) FROM orders GROUP BY date

-- Run 1: Inserts correct totals
-- Run 2: Inserts DUPLICATE totals (double counting!)
\`\`\`

### The Solution: Upsert with Unique Keys

\`\`\`sql
-- GOOD: Upsert replaces instead of duplicating
INSERT INTO order_totals (date, total, computed_at)
SELECT date, SUM(amount), NOW()
FROM orders
GROUP BY date
ON CONFLICT (date) DO UPDATE SET
  total = EXCLUDED.total,
  computed_at = EXCLUDED.computed_at

-- Runs 100 times = same result as running once
\`\`\`

### Unique Constraint Design

\`\`\`sql
-- Every summary table needs a unique constraint on the natural key
ALTER TABLE daily_metrics ADD CONSTRAINT daily_metrics_date_key UNIQUE (date);
ALTER TABLE user_balances ADD CONSTRAINT user_balances_user_id_key UNIQUE (user_id);
ALTER TABLE webhook_deliveries ADD CONSTRAINT webhook_deliveries_event_key UNIQUE (provider, event_id);
\`\`\`

### Token-Based Idempotency

\`\`\`javascript
// For external API calls, use idempotency keys
async function chargeCustomer(customerId: string, amount: number, idempotencyKey: string) {
  const response = await fetch('https://api.stripe.com/v1/charges', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey, // Same key = same result
      'Authorization': 'Bearer ' + process.env.STRIPE_KEY,
    },
    body: new URLSearchParams({ customer: customerId, amount: String(amount) }),
  })

  if (response.status === 409) {
    // Already processed — this is expected, not an error
    return { status: 'already_processed', idempotent: true }
  }

  return response.json()
}

// In cron job:
const key = \`charge-\${customerId}-\${invoiceId}\`
const result = await chargeCustomer(customerId, amount, key)
\`\`\`

### Idempotency Checklist

Before deploying any cron job, verify:
- [ ] Running the job twice produces the same result as running it once
- [ ] All INSERT statements have corresponding ON CONFLICT clauses
- [ ] External API calls include Idempotency-Key headers
- [ ] Lock files or database flags prevent concurrent execution
- [ ] Test by running the job while it's already running (simulate failure mid-way)`,
    estimated_minutes: 15,
  },

  // ═══ COURSE 2: API Error Recovery ════════════════════════════
  {
    course_id: COURSES.api, module: 1,
    title: 'Circuit Breaker Pattern',
    content: `## Circuit Breaker Pattern

When a downstream service fails, naive systems keep hammering it until it recovers. A circuit breaker "opens" the circuit — fast-failing requests — giving the service time to recover.

### The Three States

\`\`\`
CLOSED (normal) ──[failure threshold reached]──► OPEN (fast-fail)
     ▲                                              │
     │                                         [timeout]
     │                                              ▼
     └──────────────[success threshold]──── HALF-OPEN (probe)
\`\`\`

- **Closed**: Requests pass through normally. Failures are counted.
- **Open**: Requests fail immediately with CircuitOpenError. No calls to failing service.
- **Half-Open**: After timeout, allows one test request. If it succeeds → Closed. If it fails → Open.

### Implementation

\`\`\`javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeout = options.resetTimeout || 30_000
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2

    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = null
    this.halfOpenSuccesses = 0
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN'
        this.halfOpenSuccesses = 0
      } else {
        throw new CircuitOpenError('Circuit is OPEN — failing fast')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++
      if (this.halfOpenSuccesses >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED'
        this.failureCount = 0
      }
    } else {
      this.failureCount = 0
    }
  }

  onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN' // Immediate reopen
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
}
\`\`\`

### Usage in Production

\`\`\`javascript
const paymentBreaker = new CircuitBreaker({
  failureThreshold: 3,   // Open after 3 failures
  resetTimeout: 60_000,  // Try again after 60s
})

async function processPayment(order) {
  try {
    return await paymentBreaker.call(() =>
      stripe.charges.create({ amount: order.total, customer: order.stripeId })
    )
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      // Fallback: queue for later retry
      await queuePaymentForRetry(order)
      return { status: 'queued', reason: 'payment_service_degraded' }
    }
    throw err
  }
}
\`\``,
    estimated_minutes: 25,
  },
  {
    course_id: COURSES.api, module: 2,
    title: 'Bulkhead Pattern — Failure Isolation',
    content: `## Bulkhead Pattern — Failure Isolation

Named after ship bulkheads: if one compartment floods, the others stay dry. In systems, this means isolating different types of work so one failure doesn't cascade.

### The Thread Pool Problem

\`\`\`javascript
// BAD: One shared thread pool for all operations
const sharedExecutor = Executors.newFixedThreadPool(50)

// A slow DB query exhausts the pool
// Now payments, web requests, and background jobs all queue up
sharedExecutor.submit(() => db.slowReport())      // takes 30s, uses pool
sharedExecutor.submit(() => payment.process())   // queued behind slow report
sharedExecutor.submit(() => email.send())         // queued behind payment
sharedExecutor.submit(() => db.anotherSlow())     // pool exhausted!
\`\`\`

### Bulkhead Solution

\`\`\`javascript
// GOOD: Separate thread pools per concern
const httpPool = Executors.newFixedThreadPool(20)  // External HTTP calls
const dbPool = Executors.newFixedThreadPool(10)     // Database queries
const bgPool = Executors.newFixedThreadPool(20)     // Background processing

// Slow DB query only exhausts dbPool, not httpPool or bgPool
dbPool.submit(() => db.slowReport())

// Payments keep running
httpPool.submit(() => payment.process())

// Emails keep running
bgPool.submit(() => email.send())
\`\`\`

### Semaphore Bulkhead (for Node.js async)

\`\`\`javascript
// Node.js: use semaphores instead of thread pools
class SemaphoreBulkhead {
  constructor(maxConcurrent) {
    this.semaphore = Semaphore(maxConcurrent)
    this.activeCount = 0
    this.maxConcurrent = maxConcurrent
  }

  async execute(fn) {
    return this.semaphore.acquire().then(async () => {
      this.activeCount++
      try {
        return await fn()
      } finally {
        this.activeCount--
        this.semaphore.release()
      }
    })
  }
}

// Different bulkheads per service
const paymentBulkhead = new SemaphoreBulkhead(5)
const notificationBulkhead = new SemaphoreBulkhead(20)

async function processPayment(order) {
  return paymentBulkhead.execute(() => callPaymentAPI(order))
}

async function sendNotifications(users) {
  return notificationBulkhead.execute(() => broadcast(users))
}
\`\`\`

### Bulkhead vs Circuit Breaker

| Pattern | Purpose | Scope |
|---------|---------|-------|
| **Bulkhead** | Prevent resource exhaustion | How many concurrent calls allowed |
| **Circuit Breaker** | Prevent calling failing service | Whether to call at all |

Use both together: Bulkhead limits concurrent calls, Circuit Breaker stops calls when service is down.`,
    estimated_minutes: 20,
  },
  {
    course_id: COURSES.api, module: 3,
    title: 'Graceful Degradation',
    content: `## Graceful Degradation

When your primary data source fails, the system should serve stale data, reduced functionality, or cached responses — instead of a hard error.

### The Fallback Chain

\`\`\`javascript
async function getUserData(userId: string) {
  const sources = [
    () => redis.get(\`user:\${userId}\`),           // Fastest cache
    () => postgres.users.findOne(userId),         // Primary DB
    () => readFromReplica(userId),                // Fallback DB
    () => getFromBackupStorage(userId),           // Last resort
  ]

  for (const source of sources) {
    try {
      const data = await source()
      if (data) {
        // Refresh cache for next time
        await redis.setex(\`user:\${userId}\`, 3600, JSON.stringify(data))
        return { data, source: source.name, stale: false }
      }
    } catch (err) {
      console.warn(\`\${source.name} failed: \${err.message}\`)
      continue
    }
  }

  // Last resort: return cached stale data regardless
  const staleData = await redis.get(\`user:\${userId}:stale\`)
  if (staleData) {
    return { data: JSON.parse(staleData), source: 'stale_cache', stale: true }
  }

  throw new ServiceUnavailableError('All data sources failed')
}
\`\`\`

### Feature Flags for Degradation

\`\`\`javascript
async function getDashboard(userId: string) {
  const features = await getFeatureFlags(userId)

  const dashboard = {
    // Always available
    user: await getUser(userId),
    // Gracefully degraded
    recommendations: features.showRecommendations
      ? await safeGetRecommendations(userId, 3000)  // 3s timeout
      : null,
    analytics: features.showAnalytics
      ? await safeGetAnalytics(userId, 5000)
      : { available: false, reason: 'service_degraded' },
  }

  return dashboard
}

async function safeGetRecommendations(userId, timeoutMs) {
  try {
    return await withTimeout(getRecommendations(userId), timeoutMs)
  } catch (err) {
    return { available: false, reason: err.message }
  }
}
\`\`\`

### Health Check Hierarchy

\`\`\`javascript
// Health checks in order of criticality
async function getHealth() {
  const checks = {
    database: await checkDB(),           // Critical — if this fails, everything fails
    cache: await checkCache(),           // Important — cache miss is okay
    externalPayments: await checkPayments(), // Degradable — can serve without this
    notifications: await checkNotifications(), // Degradable
  }

  const criticalPassed = checks.database && checks.cache
  const allPassed = Object.values(checks).every(Boolean)

  return {
    status: allPassed ? 'healthy' : criticalPassed ? 'degraded' : 'unhealthy',
    checks,
    degradedFeatures: Object.entries(checks)
      .filter(([, v]) => !v)
      .map(([k]) => k),
    timestamp: new Date().toISOString(),
  }
}
\`\``,
    estimated_minutes: 20,
  },
  {
    course_id: COURSES.api, module: 4,
    title: 'Rate Limit Handling with Retry-After',
    content: `## Rate Limit Handling with Retry-After

Rate limits exist to protect services. When you hit one, you must wait. The \`Retry-After\` header tells you exactly how long.

### Reading the Response

\`\`\`javascript
async function callAPI(endpoint, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
    body: JSON.stringify(body),
  })

  if (response.status === 429) {
    // Parse Retry-After header
    const retryAfter = response.headers.get('Retry-After')
    const retryMs = parseRetryAfter(retryAfter)

    return {
      rate_limited: true,
      retry_after_ms: retryMs,
      retry_after_date: new Date(Date.now() + retryMs).toISOString(),
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset'),
    }
  }

  if (!response.ok) throw new Error(\`API error: \${response.status}\`)
  return response.json()
}

function parseRetryAfter(header) {
  if (!header) return 60_000 // Default 60s if not specified

  if (header.includes('Wed,')) {
    // HTTP-date format: "Wed, 15 Nov 2024 12:00:00 GMT"
    const date = new Date(header)
    return Math.max(0, date.getTime() - Date.now())
  }

  // Seconds format: "120"
  const seconds = parseInt(header, 10)
  return seconds * 1000
}
\`\`\`

### Respecting Rate Limits

\`\`\`javascript
async function paginateAll(endpoint, params = {}) {
  const results = []
  let cursor = null

  while (true) {
    const query = cursor ? { ...params, cursor } : params
    const response = await callAPIWithBackoff(\`\${endpoint}?\${new URLSearchParams(query)}\`)

    if (response.rate_limited) {
      console.log(\`Rate limited. Waiting \${response.retry_after_ms}ms...\`)
      await sleep(response.retry_after_ms)
      continue
    }

    results.push(...response.data)

    if (!response.next_cursor) break
    cursor = response.next_cursor
  }

  return results
}
\`\`\`

### Token Bucket Algorithm

For your own rate limiter, use token bucket:

\`\`\`javascript
class TokenBucket {
  constructor(tokensPerSecond, burstSize) {
    this.tokens = burstSize
    this.tokensPerSecond = tokensPerSecond
    this.lastRefill = Date.now()
  }

  async acquire() {
    this.refill()
    if (this.tokens < 1) {
      const waitMs = (1 - this.tokens) / this.tokensPerSecond * 1000
      await sleep(waitMs)
      this.refill()
    }
    this.tokens--
  }

  refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.burstSize, this.tokens + elapsed * this.tokensPerSecond)
    this.lastRefill = now
  }
}
\`\`\``,
    estimated_minutes: 20,
  },
  {
    course_id: COURSES.api, module: 5,
    title: 'Health Checks and Dependency Tracking',
    content: `## Health Checks and Dependency Tracking

Every service needs health checks that test real dependencies, not just "is the process running."

### Three Levels of Health

\`\`\`javascript
// Level 1: Liveness — is the process alive?
// Kubernetes uses this to decide whether to restart
app.get('/healthz/live', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// Level 2: Readiness — can it serve traffic?
// Kubernetes uses this to remove from load balancer
app.get('/healthz/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    db.query('SELECT 1'),           // Can we query DB?
    redis.ping(),                   // Can we reach cache?
    externalService.ping(),         // Can we reach external services?
  ])

  const allPassed = checks.every(c => c.status === 'fulfilled')

  res.status(allPassed ? 200 : 503).json({
    status: allPassed ? 'ready' : 'not_ready',
    checks: {
      database: checks[0].status === 'fulfilled',
      cache: checks[1].status === 'fulfilled',
      externalService: checks[2].status === 'fulfilled',
    },
    timestamp: new Date().toISOString(),
  })
})

// Level 3: Deep health — full dependency audit
app.get('/healthz/deep', async (req, res) => {
  const report = await runFullHealthAudit()
  res.status(report.critical.length ? 503 : 200).json(report)
})
\`\`\`

### Kubernetes Probes

\`\`\`yaml
spec:
  containers:
  - name: api
    livenessProbe:
      httpGet:
        path: /healthz/live
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /healthz/ready
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 3
\`\`\`

### Dependency Map

\`\`\`javascript
// Every service should know its dependencies
const DEPENDENCIES = {
  postgres: {
    type: 'database',
    critical: true,
    healthCheck: () => db.query('SELECT 1'),
    timeout: 5000,
  },
  redis: {
    type: 'cache',
    critical: false,
    healthCheck: () => redis.ping(),
    timeout: 2000,
  },
  paymentService: {
    type: 'external',
    critical: false,
    healthCheck: () => paymentService.health(),
    timeout: 3000,
  },
  emailService: {
    type: 'external',
    critical: false,
    healthCheck: () => emailService.health(),
    timeout: 5000,
  },
}

async function checkAll() {
  const results = {}
  for (const [name, dep] of Object.entries(DEPENDENCIES)) {
    try {
      await Promise.race([
        dep.healthCheck(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), dep.timeout))
      ])
      results[name] = { status: 'healthy', critical: dep.critical }
    } catch (err) {
      results[name] = { status: 'unhealthy', error: err.message, critical: dep.critical }
    }
  }
  return results
}
\`\``,
    estimated_minutes: 20,
  },

  // ═══ COURSE 3: Multi-Agent Coordination ═════════════════════
  {
    course_id: COURSES.multi, module: 1,
    title: 'Task Decomposition Patterns',
    content: `## Task Decomposition Patterns

Complex problems require breaking into subtasks assignable to specialized agents. The decomposition strategy determines whether coordination succeeds or collapses into chaos.

### When to Decompose

Decompose when:
- Tasks have distinct skill requirements (code vs. research vs. design)
- Tasks can run in parallel (embarrassingly parallel or loosely coupled)
- Results from one subtask feed into another (pipeline)
- Human review is needed at boundaries (approval gates)

Don't decompose when:
- Overhead exceeds benefit (5 agents managing 10 tasks = overhead)
- Tasks are tightly coupled (decomposition adds complexity, not clarity)
- A single agent can handle it faster

### Decomposition Strategies

**Sequential Decomposition** — Each step feeds the next:

\`\`\`javascript
// BAD: Sequential, no agent abstraction
async function processOrder(order) {
  const items = await validateItems(order.items)
  const pricing = await calculatePricing(items)
  const inventory = await reserveInventory(pricing)
  const payment = await processPayment(inventory)
  const shipping = await arrangeShipping(payment)
  return shipping
}

// GOOD: Agent-based, each agent handles its domain
const orderAgent = new Agent({ role: 'order_processor' })
const pricingAgent = new Agent({ role: 'pricing_engine' })
const inventoryAgent = new Agent({ role: 'inventory_manager' })
const paymentAgent = new Agent({ role: 'payment_processor' })

async function processOrder(order) {
  const validated = await orderAgent.process(order)       // What items?
  const priced = await pricingAgent.calculate(validated)   // How much?
  const reserved = await inventoryAgent.reserve(priced)    // Is it in stock?
  const paid = await paymentAgent.charge(reserved)        // Can customer pay?
  return paid
}
\`\`\`

**Parallel Decomposition** — Independent tasks run simultaneously:

\`\`\`javascript
async function analyzeUserJourney(userId) {
  const [browseData, purchaseData, supportData] = await Promise.all([
    browseAgent.analyze(userId),      // What do they look at?
    purchaseAgent.analyze(userId),     // What do they buy?
    supportAgent.analyze(userId),     // What problems do they have?
  ])

  return aggregateInsights(browseData, purchaseData, supportData)
}
\`\`\`

### Task Spec Format

\`\`\`typescript
interface TaskSpec {
  id: string
  description: string
  requiredCapabilities: string[]    // e.g. ['database', 'http', 'filesystem']
  input: Record<string, unknown>    // Data from parent or previous tasks
  outputSpec: {                     // What this task must produce
    type: 'data' | 'decision' | 'action'
    schema: object
  }
  timeout: number                   // Max duration in ms
  retryPolicy: RetryPolicy
  dependencies: string[]             // Task IDs that must complete first
}

interface TaskResult {
  taskId: string
  status: 'success' | 'failure' | 'timeout'
  output: unknown
  durationMs: number
  agentId: string
  error?: string
}
\`\``,
    estimated_minutes: 25,
  },
  {
    course_id: COURSES.multi, module: 2,
    title: 'Inter-Agent Communication Protocols',
    content: `## Inter-Agent Communication Protocols

Agents need structured ways to talk to each other. Without protocols, you get "hallway conversations" — agents making assumptions, sending incompatible messages, and missing responses.

### The Four Patterns

**1. Direct Request/Response** — One agent asks, one answers:

\`\`\`javascript
const result = await agentA.request(agentB, {
  method: 'calculate_risk_score',
  payload: { userId: '123', transactionAmount: 5000 },
  timeout: 5000,
})
\`\`\`

**2. Broadcast** — One agent notifies all subscribers:

\`\`\`javascript
// Event bus pattern
await eventBus.publish({
  topic: 'order.confirmed',
  payload: { orderId: '123', customerId: '456', total: 99.99 },
  sender: paymentAgent.id,
})

// Agents subscribe to topics
eventBus.subscribe('order.confirmed', async (event) => {
  await inventoryAgent.process(event.payload)  // Reserve inventory
  await shippingAgent.process(event.payload)   // Schedule shipping
  await emailAgent.process(event.payload)      // Send confirmation
})
\`\`\`

**3. Fan-Out** — One agent splits work, collects all results:

\`\`\`javascript
async function analyzeDocument(doc) {
  const sections = splitDocument(doc)  // Break into sections

  // Fan out to specialized agents
  const results = await Promise.all(
    sections.map(section => {
      if (section.type === 'code') return codeAgent.analyze(section)
      if (section.type === 'data') return dataAgent.analyze(section)
      if (section.type === 'prose') return reviewAgent.analyze(section)
    })
  )

  return synthesisAgent.combine(results)
}
\`\`\`

**4. Consensus / Voting** — Multiple agents vote on a decision:

\`\`\`javascript
async function approveTransaction(tx) {
  const votes = await Promise.all([
    fraudAgent.vote(tx),      // Is this fraudulent?
    riskAgent.vote(tx),      // What's the risk score?
    complianceAgent.vote(tx), // Does it pass compliance?
  ])

  const approved = votes.filter(v => v.approve).length
  const threshold = Math.ceil(votes.length * 0.6) // 60% approval needed

  return approved >= threshold ? 'approved' : 'rejected'
}
\`\`\`

### Message Schema

\`\`\`typescript
interface AgentMessage {
  id: string           // UUID
  sender: string       // Agent ID
  recipient?: string  // Target agent (null for broadcast)
  type: 'request' | 'response' | 'event' | 'error'
  method?: string     // For request/response
  payload: unknown     // Message data
  correlationId: string // Links request to response
  timestamp: string    // ISO timestamp
  ttl?: number         // Milliseconds before message expires
  retryCount?: number
}
\`\`\`

### Timeout Strategy

\`\`\`javascript
async function agentRequest(agent, message, options = {}) {
  const timeout = options.timeout || 30_000
  const retries = options.retries || 2

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await withTimeout(
        agent.send(message),
        timeout * Math.pow(2, attempt) // Exponential backoff on timeout
      )
      return response
    } catch (err) {
      if (attempt === retries) throw err
      if (err instanceof AgentTimeoutError) {
        console.log(\`Attempt \${attempt + 1} timed out, retrying...\`)
        await sleep(1000 * Math.pow(2, attempt))
      }
    }
  }
}
\`\``,
    estimated_minutes: 25,
  },
  {
    course_id: COURSES.multi, module: 3,
    title: 'Conflict Resolution Strategies',
    content: `## Conflict Resolution Strategies

When multiple agents produce conflicting outputs, you need deterministic resolution strategies. "Let them fight it out" leads to nondeterministic bugs.

### Types of Conflicts

**Data Conflicts**: Two agents have different data for the same entity
**Decision Conflicts**: Two agents recommend different actions
**Resource Conflicts**: Multiple agents need exclusive access to a resource
**Priority Conflicts**: Tasks have competing urgency

### Data Conflict Resolution

\`\`\`javascript
const DATA_CONFLICT_RESOLVER = {
  // Latest write wins
  lastWriteWins(agentA, agentB) {
    return agentA.timestamp > agentB.timestamp ? agentA : agentB
  },

  // Highest confidence wins
  highestConfidence(agentA, agentB) {
    return (agentA.confidence || 0) > (agentB.confidence || 0) ? agentA : agentB
  },

  // Authoritative source wins
  authoritativeSource(agentA, agentB, authorityMap) {
    const rankA = authorityMap[agentA.source] ?? 0
    const rankB = authorityMap[agentB.source] ?? 0
    return rankA >= rankB ? agentA : agentB
  },

  // Merge (for compatible data)
  merge(agentA, agentB) {
    return {
      ...agentA,
      ...agentB,
      _merged: true,
      _sources: [agentA.source, agentB.source],
      _mergeTimestamp: new Date().toISOString(),
    }
  },
}
\`\`\`

### Decision Conflict Resolution

\`\`\`javascript
class DecisionCoordinator {
  async resolve(request) {
    const agents = this.selectAgents(request)

    // Parallel evaluation
    const decisions = await Promise.all(
      agents.map(agent => agent.evaluate(request))
    )

    // Voting with weights
    const weightedVotes = decisions.map((d, i) => ({
      ...d,
      weight: agents[i].trustScore,
    }))

    // Weighted score
    const scores = {}
    for (const vote of weightedVotes) {
      scores[vote.decision] = (scores[vote.decision] || 0) + vote.weight * vote.confidence
    }

    const winner = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0][0]

    return {
      decision: winner,
      scores,
      votes: decisions.length,
      confidence: scores[winner] / Object.values(scores).reduce((a, b) => a + b, 0),
    }
  }
}
\`\`\`

### Resource Conflict — Distributed Lock

\`\`\`javascript
class ResourceLock {
  constructor(redis) {
    this.redis = redis
  }

  async acquire(resourceId, agentId, ttlMs = 30_000) {
    const key = \`lock:\${resourceId}\`
    const acquired = await this.redis.set(key, agentId, 'PX', ttlMs, 'NX')
    if (acquired) return { acquired: true, expiresIn: ttlMs }

    // Who holds the lock?
    const holder = await this.redis.get(key)
    if (holder === agentId) {
      // Renew our own lock
      await this.redis.pexpire(key, ttlMs)
      return { acquired: true, renewed: true }
    }

    return { acquired: false, holder, expiresIn: await this.redis.pttl(key) }
  }

  async release(resourceId, agentId) {
    const key = \`lock:\${resourceId}\`
    const holder = await this.redis.get(key)
    if (holder !== agentId) {
      throw new Error(\`Cannot release lock held by \${holder}\`)
    }
    await this.redis.del(key)
  }
}
\`\`\``,
    estimated_minutes: 25,
  },
  {
    course_id: COURSES.multi, module: 4,
    title: 'Agent Supervision and Failure Recovery',
    content: `## Agent Supervision and Failure Recovery

Supervisor agents monitor worker agents, handle failures, and decide whether to retry, escalate, or fail the whole task.

### Supervisor Pattern

\`\`\`javascript
class SupervisorAgent {
  constructor(workers, options = {}) {
    this.workers = workers
    this.maxRetries = options.maxRetries || 3
    this.timeout = options.timeout || 60_000
    this.escalationThreshold = options.escalationThreshold || 3
  }

  async supervise(task) {
    const worker = this.selectWorker(task)
    let attempts = 0
    let lastError

    while (attempts < this.maxRetries) {
      try {
        const result = await withTimeout(
          worker.execute(task),
          this.timeout
        )
        return { status: 'success', result, worker: worker.id }
      } catch (err) {
        lastError = err
        attempts++

        // Record the failure
        await this.recordFailure(worker.id, task.id, err)

        // Check escalation conditions
        if (attempts >= this.escalationThreshold) {
          // Try a different worker for remaining retries
          worker = this.selectFallbackWorker(task, worker.id)
        }

        await sleep(this.getBackoffMs(attempts))
      }
    }

    // All retries exhausted
    return {
      status: 'failed',
      error: lastError.message,
      attempts,
      worker: worker.id,
    }
  }

  async handleFailure(task, error) {
    // Decide: retry? skip? escalate? abort?
    if (error.retryable && this.canRetry(task)) {
      return { action: 'retry', delay: this.getBackoffMs(1) }
    }
    if (error.fallbackAvailable) {
      return { action: 'fallback', alternative: error.fallbackTask }
    }
    return { action: 'escalate', reason: 'unrecoverable' }
  }
}
\`\`\`

### Dead Worker Detection

\`\`\`javascript
class WorkerRegistry {
  constructor() {
    this.workers = new Map()
    this.heartbeatInterval = 10_000 // 10 seconds
  }

  register(worker) {
    this.workers.set(worker.id, {
      ...worker,
      lastHeartbeat: Date.now(),
      status: 'active',
      tasksCompleted: 0,
      tasksFailed: 0,
    })
  }

  async monitorWorkers() {
    const now = Date.now()
    const staleThreshold = this.heartbeatInterval * 3 // 30 seconds

    for (const [id, worker] of this.workers) {
      const stale = now - worker.lastHeartbeat > staleThreshold

      if (stale && worker.status === 'active') {
        console.warn(\`Worker \${id} missed heartbeats — marking stale\`)

        // Reassign its tasks
        await this.reassignTasks(id)

        // Mark as unhealthy
        worker.status = 'stale'
      }
    }
  }

  async heartbeat(workerId) {
    const worker = this.workers.get(workerId)
    if (worker) {
      worker.lastHeartbeat = Date.now()
      if (worker.status === 'stale') {
        worker.status = 'active' // Recovered
      }
    }
  }
}
\`\`\`

### State Machine for Task Lifecycle

\`\`\`
PENDING → ASSIGNED → RUNNING → COMPLETED
               ↓            ↓
            FAILED ←──── ABORTED
               ↓
         RETRY (max 3) → RUNNING
               ↓
           ESCALATED → requires human review
\`\`\`

Every state transition should be logged with timestamp, previous state, next state, and trigger. This gives you full audit trail for debugging.`,
    estimated_minutes: 25,
  },
  {
    course_id: COURSES.multi, module: 5,
    title: 'Scaling Multi-Agent Architectures',
    content: `## Scaling Multi-Agent Architectures

A few agents is manageable. Hundreds require architectural patterns for load balancing, capacity planning, and failure isolation.

### Agent Pool Pattern

\`\`\`javascript
class AgentPool {
  constructor(factory, options = {}) {
    this.factory = factory
    this.minSize = options.minSize || 2
    this.maxSize = options.maxSize || 20
    this.idleTimeout = options.idleTimeout || 300_000 // 5 minutes

    this.available = new Queue()
    this.busy = new Set()
    this.all = new Map()

    // Pre-warm pool
    for (let i = 0; i < this.minSize; i++) this.addAgent()
  }

  async acquire(timeoutMs = 30_000) {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      // Try to get from available pool
      const agent = this.available.pop()
      if (agent) {
        this.busy.add(agent.id)
        return this.wrapAgent(agent)
      }

      // Scale up if under max
      if (this.all.size < this.maxSize) {
        const agent = this.addAgent()
        this.busy.add(agent.id)
        return this.wrapAgent(agent)
      }

      await sleep(100) // Wait and retry
    }

    throw new Error(\`Agent pool exhausted (max: \${this.maxSize})\`)
  }

  release(agentId) {
    this.busy.delete(agentId)
    const agent = this.all.get(agentId)
    if (agent) this.available.push(agent)
  }
}
\`\`\`

### Priority Queue with Backpressure

\`\`\`javascript
class PriorityTaskQueue {
  constructor(options = {}) {
    this.high = new Queue()    // Critical tasks
    this.medium = new Queue() // Normal tasks
    this.low = new Queue()    // Background tasks
    this.maxSize = options.maxSize || 1000
  }

  async enqueue(task, priority = 'medium') {
    if (this.size() >= this.maxSize) {
      // Backpressure: reject low-priority tasks first
      if (priority === 'low') {
        throw new Error(\`Queue full, rejecting low-priority task: \${task.id}\`)
      }
      // Wait for space for high/medium
      await this.waitForSpace()
    }
    this[priority].push(task)
  }

  async dequeue(timeoutMs = 5000) {
    // Priority order: high > medium > low
    for (const q of ['high', 'medium', 'low']) {
      if (!this[q].isEmpty()) return this[q].pop()
    }
    return null // Queue empty
  }
}
\`\`\`

### Capacity Planning

\`\`\`javascript
// Monitor agent pool health
async function getPoolMetrics(pool) {
  const metrics = {
    poolSize: pool.all.size,
    available: pool.available.length,
    busy: pool.busy.size,
    utilization: pool.busy.size / pool.all.size,

    // Queue depth
    queueDepth: await queueDepth(),

    // Latency
    avgTaskDuration: await getAvgDuration(),

    // Failure rate
    failureRate: await getFailureRate(),

    // Capacity recommendation
    scaleRecommendation: null,
  }

  // Auto-scale rules
  if (metrics.utilization > 0.8) {
    metrics.scaleRecommendation = 'scale_up'
  } else if (metrics.utilization < 0.2 && pool.all.size > pool.minSize) {
    metrics.scaleRecommendation = 'scale_down'
  } else {
    metrics.scaleRecommendation = 'stable'
  }

  return metrics
}
\`\`\`

### Isolation Boundaries

\`\`\`yaml
# Kubernetes: separate agent pools per concern
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-pool-config
data:
  parsing-pool: "5"     # Document parsing agents
  analysis-pool: "10"   # Data analysis agents
  writing-pool: "3"     # Report writing agents
---
# Each pool in its own namespace
apiVersion: v1
kind: Namespace
metadata:
  name: agent-pool-parsing
---
# Resource limits per agent pod
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
\`\`\`

The key insight: scale agents independently based on their workload, not as a monolithic system.`,
    estimated_minutes: 25,
  },
]

// ─── Quiz questions ──────────────────────────────────────────────
const QUIZZES: Record<string, Array<{
  question_id: string
  question: string
  question_type: string
  options: Array<{ key: string; label: string }>
  correct_answer: string
  explanation: string
}>> = {
  [COURSES.cron]: [
    { question_id: 'q1', question: 'What is the most dangerous property of cron jobs in production?', question_type: 'single', options: [{ key: 'A', label: 'They consume too much CPU' }, { key: 'B', label: 'They fail silently — no alerts, no logs' }, { key: 'C', label: 'They run too frequently' }, { key: 'D', label: 'They use too much memory' }], correct_answer: 'B', explanation: 'Cron jobs run outside application context. They don\'t share your logging, alerting, or health checks. Silent failures are the primary danger.' },
    { question_id: 'q2', question: 'What is the correct exponential backoff formula with jitter?', question_type: 'single', options: [{ key: 'A', label: 'delay = base * attempt (no cap, no jitter)' }, { key: 'B', label: 'delay = min(base * 2^attempt, 60s) + random(0, base)' }, { key: 'C', label: 'delay = random(1s, 10s) fixed' }, { key: 'D', label: 'delay = base * attempt (cap at 10s)' }], correct_answer: 'B', explanation: 'Exponential backoff with jitter: double delay each attempt, cap at 60s, add ±randomness to prevent synchronized retry storms.' },
    { question_id: 'q3', question: 'Why do you need a Dead Letter Queue?', question_type: 'single', options: [{ key: 'A', label: 'To store messages forever' }, { key: 'B', label: 'To prevent failed messages from blocking the queue and to allow inspection' }, { key: 'C', label: 'To retry messages automatically' }, { key: 'D', label: 'To speed up message processing' }], correct_answer: 'B', explanation: 'DLQ captures messages that fail repeatedly. This prevents blocking the main queue and allows you to inspect/debug failed messages.' },
    { question_id: 'q4', question: 'Which logging format enables alerting on cron job failures?', question_type: 'single', options: [{ key: 'A', label: 'console.log("Job completed")' }, { key: 'B', label: 'Structured JSON logs with status labels and duration metrics' }, { key: 'C', label: 'Plain text logs with timestamps' }, { key: 'D', label: 'Logs written to a file' }], correct_answer: 'B', explanation: 'Structured JSON logs with labels (job_name, status, duration_ms) can be queried in Prometheus/Datadog and used to build dashboards and alerts.' },
    { question_id: 'q5', question: 'A cron job that runs twice simultaneously produces duplicate data. What is the fix?', question_type: 'single', options: [{ key: 'A', label: 'Run the job less frequently' }, { key: 'B', label: 'Use INSERT ON CONFLICT (upsert) or distributed locking to ensure idempotency' }, { key: 'C', label: 'Add more logging' }, { key: 'D', label: 'Use a longer timeout' }], correct_answer: 'B', explanation: 'Idempotency: use upsert patterns (ON CONFLICT) and distributed locks (flock) so running the job twice produces the same result as running once.' },
  ],
  [COURSES.api]: [
    { question_id: 'q1', question: 'What does a Circuit Breaker do when in the OPEN state?', question_type: 'single', options: [{ key: 'A', label: 'Allows requests through and counts failures' }, { key: 'B', label: 'Fails requests immediately without calling the service' }, { key: 'C', label: 'Retries requests with longer delays' }, { key: 'D', label: 'Logs the error and continues' }], correct_answer: 'B', explanation: 'When OPEN, the circuit breaker fails fast — returns immediately without calling the failing service. This gives the service time to recover.' },
    { question_id: 'q2', question: 'What is the primary purpose of the Bulkhead pattern?', question_type: 'single', options: [{ key: 'A', label: 'Prevent unauthorized access' }, { key: 'B', label: 'Isolate failures so one service\'s problems don\'t exhaust resources shared by others' }, { key: 'C', label: 'Balance load across servers' }, { key: 'D', label: 'Cache frequently accessed data' }], correct_answer: 'B', explanation: 'Bulkhead isolates resource pools so that one failing service can\'t exhaust thread pools, connections, or memory needed by other services.' },
    { question_id: 'q3', question: 'What does "graceful degradation" mean?', question_type: 'single', options: [{ key: 'A', label: 'The system slowly shuts down' }, { key: 'B', label: 'When a dependency fails, the system serves reduced functionality instead of hard errors' }, { key: 'C', label: 'The system retries failed requests' }, { key: 'D', label: 'The system logs all errors' }], correct_answer: 'B', explanation: 'Graceful degradation means having fallbacks (stale cache, reduced feature set) so the system remains partially functional when dependencies fail.' },
    { question_id: 'q4', question: 'How should you handle a 429 Rate Limit response?', question_type: 'single', options: [{ key: 'A', label: 'Retry immediately with exponential backoff starting from 0' }, { key: 'B', label: 'Read the Retry-After header and wait that duration before retrying' }, { key: 'C', label: 'Ignore the rate limit and retry anyway' }, { key: 'D', label: 'Retry after a fixed 5 seconds' }], correct_answer: 'B', explanation: 'The Retry-After header tells you exactly how long to wait. Ignoring it or using fixed delays either violates the limit or is inefficient.' },
    { question_id: 'q5', question: 'What\'s the difference between liveness and readiness probes?', question_type: 'single', options: [{ key: 'A', label: 'They are the same thing' }, { key: 'B', label: 'Liveness checks if the process is alive; readiness checks if it can serve traffic' }, { key: 'C', label: 'Liveness checks dependencies; readiness checks process health' }, { key: 'D', label: 'Liveness is for databases; readiness is for web servers' }], correct_answer: 'B', explanation: 'Liveness = is the container alive (should it be restarted)? Readiness = can it receive traffic (should it be in the load balancer)?' },
  ],
  [COURSES.multi]: [
    { question_id: 'q1', question: 'When should you decompose a task into multiple agents?', question_type: 'single', options: [{ key: 'A', label: 'Always — more agents = better results' }, { key: 'B', label: 'When tasks have distinct skill requirements, can run in parallel, or have natural handoff points' }, { key: 'C', label: 'Never — single agents are always better' }, { key: 'D', label: 'Only when you have more than 10 agents' }], correct_answer: 'B', explanation: 'Decomposition adds coordination overhead. Use it when parallelism or specialization provides clear benefit. Don\'t decompose simple tasks.' },
    { question_id: 'q2', question: 'What is the best pattern for notifying multiple agents when an event occurs?', question_type: 'single', options: [{ key: 'A', label: 'Each agent polls the event system every second' }, { key: 'B', label: 'Publish/subscribe (event bus) — one publisher, multiple subscribers' }, { key: 'C', label: 'Sequential HTTP calls to each agent' }, { key: 'D', label: 'Store events in a database and email agents' }], correct_answer: 'B', explanation: 'Pub/sub decouples publishers from subscribers. The event producer doesn\'t need to know which agents care about the event.' },
    { question_id: 'q3', question: 'Two agents produce conflicting data for the same entity. How do you resolve it?', question_type: 'single', options: [{ key: 'A', label: 'Pick randomly' }, { key: 'B', label: 'Use a deterministic strategy: latest timestamp, highest confidence, or authoritative source priority' }, { key: 'C', label: 'Run both and return both' }, { key: 'D', label: 'Ask a third agent to decide' }], correct_answer: 'B', explanation: 'Random or ambiguous resolution creates nondeterministic bugs. Always use deterministic rules: last-write-wins, highest-confidence-wins, or authoritative-source priority.' },
    { question_id: 'q4', question: 'How does a supervisor agent handle a worker that times out?', question_type: 'single', options: [{ key: 'A', label: 'Give up and report failure immediately' }, { key: 'B', label: 'Retry the task with exponential backoff, reassign to a different worker after threshold' }, { key: 'C', label: 'Kill the worker and start over' }, { key: 'D', label: 'Log the error and continue' }], correct_answer: 'B', explanation: 'Supervisors retry with backoff, reassign to fallback workers, and escalate only after all retries are exhausted.' },
    { question_id: 'q5', question: 'What is the primary reason to use an Agent Pool pattern at scale?', question_type: 'single', options: [{ key: 'A', label: 'Agents get lonely without a pool' }, { key: 'B', label: 'Prevents resource exhaustion by limiting concurrent agents and providing backpressure' }, { key: 'C', label: 'Makes debugging easier' }, { key: 'D', label: 'Required by the A2A protocol' }], correct_answer: 'B', explanation: 'Agent pools bound resource usage, provide acquire/release semantics, and apply backpressure when capacity is exhausted.' },
  ],
}

// ─── Seed everything ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (new URL(req.url).searchParams.get('secret') !== 'migrate-now') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  const upsert = async (table: string, payload: Record<string, unknown>) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    return { ok: res.ok, text }
  }

  // Seed lessons
  for (const lesson of LESSONS) {
    try {
      const { ok } = await upsert('ai_school_lessons', {
        course_id: lesson.course_id,
        module_number: lesson.module,
        title: lesson.title,
        content: lesson.content,
        content_type: 'markdown',
        estimated_minutes: lesson.estimated_minutes,
      })
      results[`lesson_${lesson.course_id.slice(0, 8)}_${lesson.module}`] = ok ? 'ok' : 'fail'
    } catch (e: any) {
      results[`lesson_${lesson.course_id.slice(0, 8)}_${lesson.module}`] = e.message
    }
  }

  // Seed quizzes
  for (const [courseId, questions] of Object.entries(QUIZZES)) {
    // Get lesson IDs for this course
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const lesson = LESSONS.find(l => l.course_id === courseId && l.module === i + 1)
      if (!lesson) continue

      // Find the lesson in DB by course_id + module_number
      const lessonRes = await fetch(
        `${SUPABASE_URL}/rest/v1/ai_school_lessons?course_id=eq.${courseId}&module_number=eq.${i + 1}&select=id`,
        {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
          },
        }
      )
      const lessons = await lessonRes.json()
      if (!Array.isArray(lessons) || !lessons[0]) {
        results[`quiz_${courseId.slice(0, 8)}_${i + 1}`] = 'lesson_not_found'
        continue
      }
      const lessonDbId = lessons[0].id

      const { ok } = await upsert('ai_school_quizzes', {
        lesson_id: lessonDbId,
        question_id: q.question_id,
        question: q.question,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      })
      results[`quiz_${courseId.slice(0, 8)}_${i + 1}`] = ok ? 'ok' : 'fail'
    }
  }

  const okCount = Object.values(results).filter(v => v === 'ok').length
  return NextResponse.json({
    success: true,
    results,
    summary: `${okCount}/${Object.keys(results).length} records created`,
  })
}
