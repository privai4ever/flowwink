

# Instance Health API & Drift Detection

## What We're Building

A proactive monitoring system that automatically detects when a deployed FlowPilot instance has drifted from its expected state — without requiring manual test runs.

## Architecture

```text
┌─────────────────────┐     ┌──────────────────────┐
│  instance-health    │     │  setup-flowpilot      │
│  (Edge Function)    │     │  (stores expected     │
│                     │     │   skill_hash on       │
│  - Skill hash check │     │   bootstrap)          │
│  - Memory keys      │     └──────────────────────┘
│  - Heartbeat age    │
│  - Cron jobs        │     ┌──────────────────────┐
│  - Edge fn ping     │     │  pg_cron (6h)        │
│                     │◄────│  instance-health-chk │
└────────┬────────────┘     └──────────────────────┘
         │
         ▼
┌─────────────────────┐     ┌──────────────────────┐
│  agent_activity     │     │  FlowPilotDetails.tsx │
│  (logged result)    │     │  Health Status Card   │
└─────────────────────┘     └──────────────────────┘
```

## Implementation Steps

### Step 1: Create `_shared/integrity.ts`
Extract the integrity check logic from `setup-flowpilot` (lines 2432-2513) into a shared module. Add a `computeSkillHash()` function that creates a SHA256 of sorted skill names + instruction snippets.

### Step 2: Create `instance-health` Edge Function
Lightweight endpoint (~2s execution) that checks:
- **Skill hash** vs expected baseline (from `agent_memory` key `expected_skill_hash`)
- **Memory keys** present (soul, identity, agents)
- **Heartbeat freshness** (last `agent_activity` with skill_name containing "heartbeat")
- **Edge function reachability** (self-ping `agent-execute`)
- **Skill count** + enabled ratio

Returns `{ status: "healthy" | "degraded" | "unhealthy", version: {...}, checks: [...] }`.

No JWT required — no sensitive data exposed (just counts and status).

### Step 3: Store `expected_skill_hash` in bootstrap
At end of `setup-flowpilot`, after skill seeding, compute hash and upsert into `agent_memory` with key `expected_skill_hash`. This becomes the drift detection baseline.

### Step 4: Register health check cron job
Add `instance-health-check` to `register_flowpilot_cron` — runs every 6 hours (`0 */6 * * *`). Calls the `instance-health` endpoint. If unhealthy, logs to `agent_activity` with status `failed`.

### Step 5: Admin UI — Health Status Card
Add a new card in `FlowPilotDetails.tsx` between Bootstrap Status and Scheduled Jobs:
- Status badge (Healthy/Degraded/Unhealthy)
- Last check timestamp
- Drift warnings (skill hash mismatch, stale heartbeat)
- "Run Health Check" button

### Step 6: Add L4 test in `run-autonomy-tests`
Add a test that calls `instance-health` and verifies the response shape and that status is not "unhealthy".

## Files

| File | Action |
|------|--------|
| `supabase/functions/_shared/integrity.ts` | Create |
| `supabase/functions/instance-health/index.ts` | Create |
| `supabase/functions/setup-flowpilot/index.ts` | Edit — use shared integrity, store skill hash |
| `supabase/functions/run-autonomy-tests/index.ts` | Edit — add L4 health test |
| `src/components/admin/modules/FlowPilotDetails.tsx` | Edit — add health card |

## Deployment Order
1. Shared integrity module
2. `instance-health` edge function
3. Update `setup-flowpilot` (store hash + register cron)
4. Deploy all affected edge functions
5. UI update

