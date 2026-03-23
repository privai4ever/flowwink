# FlowPilot — Autonomous Engine

FlowPilot is the platform's autonomous operational engine. It replaces manual marketing, content, and CRM workflows with a goal-driven AI loop that runs continuously without human intervention.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  COCKPIT (UI)                   │
│  Chat · Objectives · Activity · Briefings       │
├─────────────────────────────────────────────────┤
│              AGENT-REASON (Core)                │
│  Prompt Compiler · Tool Router · Token Budget   │
│  Context Pruning · Self-Healing · Memory        │
├──────────┬──────────┬──────────┬────────────────┤
│ Heartbeat│ Briefing │  Learn   │  Dispatcher    │
│  (12h)   │  (daily) │ (nightly)│  (every min)   │
├──────────┴──────────┴──────────┴────────────────┤
│              SKILL REGISTRY (DB)                │
│  80+ skills · Edge Functions · Webhooks         │
├─────────────────────────────────────────────────┤
│              SUPABASE (Data Layer)              │
│  Memory · Objectives · Activity · Locks · CMS   │
└─────────────────────────────────────────────────┘
```

## The Autonomous Loop

FlowPilot operates on a **7-step proactive loop**, executed primarily during the 12-hour heartbeat:

### 1. Self-Heal
Scan for broken skills, orphaned automations, missing memory keys, and schema drift. Auto-fix what's possible, log what isn't.

### 2. Propose
Analyze site stats (page views, leads, subscribers, content gaps) and propose new objectives based on current business state.

### 3. Plan
Decompose active objectives into executable step-by-step plans using `decompose_objective`. Each plan is a sequence of skill invocations.

### 4. Advance
Execute the next pending step in each active plan. Uses server-side locking (`checkout_objective`) to prevent concurrent execution of the same objective.

### 5. Automate
Check and execute due automations from `agent_automations`. Supports cron, signal-triggered, and event-driven execution patterns.

### 6. Reflect
Evaluate outcomes of recent actions. Did the blog post get views? Did the lead score improve? Store learnings in semantic memory.

### 7. Remember
Persist insights, patterns, and decisions to `agent_memory` with optional vector embeddings for future semantic retrieval.

## Scheduled Jobs (pg_cron)

| Job | Schedule | Function | Purpose |
|-----|----------|----------|---------|
| `flowpilot-heartbeat` | `0 0,12 * * *` | `flowpilot-heartbeat` | Main autonomous loop |
| `automation-dispatcher-every-minute` | `* * * * *` | `automation-dispatcher` | Execute due automations |
| `publish-scheduled-pages` | `* * * * *` | `publish-scheduled-pages` | Publish pages at scheduled time |
| `flowpilot-learn` | `0 3 * * *` | `flowpilot-learn` | Nightly learning & skill evolution |
| `flowpilot-daily-briefing` | `0 7 * * *` | `flowpilot-briefing` | Morning summary for admin |

All jobs are registered idempotently via `register_flowpilot_cron()` during bootstrap.

## Core Components

### agent-reason (Shared Engine)
The brain of the system. Located in `supabase/functions/_shared/agent-reason.ts`.

**Responsibilities:**
- **Prompt Compiler**: Builds system prompts from soul, identity, memory, objectives, and site context
- **Tool Router**: Routes tool calls to built-in handlers or skill edge functions
- **Context Pruning**: Keeps conversation history within token limits
- **Token Budget**: Tracks usage per iteration, stops when budget is exceeded
- **Self-Healing**: Detects and repairs common issues (stale locks, broken skills)

**Built-in Tool Categories:**
- `memory` — Read/write/search agent memory
- `objectives` — Create, advance, complete objectives
- `planning` — Decompose objectives into plans
- `self-mod` — Create/modify skills autonomously
- `reflect` — Evaluate action outcomes
- `soul` — Update personality and rules
- `automations-exec` — Trigger automations
- `workflows` — Execute multi-step workflows
- `a2a` — Agent-to-agent communication
- `skill-packs` — Install/manage skill bundles

### Skill Registry
Skills are stored in `agent_skills` with:
- **name**: Unique identifier
- **tool_definition**: OpenAI function-calling schema (JSON)
- **instructions**: Markdown prompt (equivalent to a SKILL.md file)
- **handler**: Execution target (`edge-function`, `database`, `webhook`, `module`)
- **origin**: `bundled` | `managed` | `agent` | `user`
- **trust_level**: `system` | `elevated` | `standard` | `sandboxed`
- **scope**: `internal` (admin only) or `public` (visitor chat)

### Memory System
Uses `agent_memory` with categories: `preference`, `context`, `fact`.

**Special keys:**
- `soul` — Personality and behavioral rules
- `identity` — Business identity (name, industry, tone)
- `agents` — Operational document defining agent roles

**Semantic search:** pgvector embeddings enable retrieval-augmented memory via `search_memories_hybrid()`.

### Objective System
Objectives in `agent_objectives` represent high-level business goals:

```
Status: active → completed | paused | cancelled
Progress: { plan: [...steps], current_step: N }
Locking: locked_by + locked_at (30-min TTL)
```

Objectives can be created by:
- Admin (via UI)
- FlowPilot (autonomously during heartbeat)
- Templates (seeded during installation)

## Site Maturity Detection

FlowPilot adjusts its behavior based on site maturity:

| Condition | Classification | Effect |
|-----------|---------------|--------|
| ≤2 blog posts, 0 leads | **Fresh** | Day 1 Playbook: 80K token budget, 12 iterations |
| Otherwise | **Mature** | Standard: 50K token budget, 8 iterations |

The Day 1 Playbook prioritizes: industry research → SEO audit → content drafting → lead prospecting.

## Concurrency & Safety

- **Agent Locks**: `agent_locks` table with TTL-based expiry prevents concurrent heartbeats
- **Objective Checkout**: `checkout_objective()` function prevents two agents from working on the same goal
- **Token Budgets**: Hard limits prevent runaway AI costs
- **Integrity Gate**: Pre-flight validation before each heartbeat checks for schema issues

## Signal System

External events trigger autonomous responses via the signal pipeline:

```
Event (DB trigger) → dispatch_automation_event() → signal-dispatcher → skill execution
```

Supported signals: `lead_created`, `lead_score_updated`, `order_created`, `booking_created`, `form_submitted`, `blog_published`.

## Bootstrap Process

When `setup-flowpilot` runs (first admin session or re-bootstrap):

1. **Schema**: Creates all agentic tables if missing (idempotent)
2. **Skills**: Upserts 80+ default skills with instructions and tool definitions
3. **Soul**: Seeds personality, identity, and agents documents
4. **Objectives**: Creates default objectives (content strategy, lead gen, etc.)
5. **Automations**: Registers default automations (welcome emails, lead scoring, etc.)
6. **Workflows**: Seeds default multi-step workflows
7. **Cron Jobs**: Registers all pg_cron scheduled tasks
8. **Initial Heartbeat**: Fires first heartbeat for immediate value

## Key Tables

| Table | Purpose |
|-------|---------|
| `agent_skills` | Skill registry (73+ entries) |
| `agent_memory` | Persistent memory with embeddings |
| `agent_objectives` | Goal tracking with plans |
| `agent_activity` | Execution audit log |
| `agent_automations` | Scheduled/triggered automations |
| `agent_workflows` | Multi-step workflow definitions |
| `agent_locks` | Concurrency control |
| `agent_skill_packs` | Installable skill bundles |
| `agent_objective_activities` | Links activities to objectives |

## Evolution & Learning

The nightly `flowpilot-learn` job:
1. Reviews recent activity outcomes
2. Identifies patterns (what worked, what failed)
3. May create new skills (`origin: 'agent'`)
4. May refine existing skill instructions
5. Stores learnings in semantic memory

Skills created autonomously are tagged `origin: 'agent'` for transparency in the Engine Room UI.

## Test Coverage Mapping

Every documented behavior maps to a specific test layer in `run-autonomy-tests`:

| Documented Feature | Test Layer | Test Name |
|---|---|---|
| Token tracking | L1 | `extractTokenUsage`, `accumulateTokens`, `isOverBudget` |
| Soul/Identity → Prompt | L1 + L5 | `buildSoulPrompt`, `WIRE: Soul → Prompt pipeline` |
| 6-layer prompt ordering | L1 | `6-Layer: correct order in operate` |
| CMS schema injection | L1 + L5 | `buildSystemPrompt: CMS schema`, `WIRE: CMS schema → prompt` |
| Site Maturity Detection | L1 + L3 + L5 | `Day 1 Playbook for fresh site`, `detectSiteMaturity shape`, `WIRE: Site maturity → heartbeat prompt` |
| agent-execute API | L2 | `rejects missing skill`, `404 for nonexistent`, `objective_context accepted` |
| Heartbeat state persistence | L3 + L5 | `Heartbeat state round-trips`, `WIRE: Heartbeat state → prompt` |
| Atomic checkout / locking | L3 | `Atomic checkout prevents double-lock` |
| Stale lock recovery | L3 | `Stale locks (>30min) are recovered` |
| Agent Locks TTL | L3 | `Agent lock: acquire and release via try_acquire/release` |
| Memory isolation | L3 | `heartbeat_state excluded from general memories` |
| Skills seeded | L4 | `≥10 enabled skills` |
| Soul exists | L4 | `FlowPilot soul exists` |
| Cron registration | L4 | `pg_cron jobs registered` |
| Scope enforcement | L4 | `Scope isolation — internal vs public skill sets` |
| Bootstrap endpoint | L4 | `setup-flowpilot endpoint responds` |
| Signal system | L5 | `WIRE: signal-dispatcher endpoint responds` |
| Personality consistency | L6 | `BEHAVIOR: Personality consistency` |
| Idle discipline | L6 | `BEHAVIOR: Idle discipline` |
| Task completion | L6 | `BEHAVIOR: Task completion` |
| Grounding rules | L6 | `BEHAVIOR: Grounding rules prevent fabrication` |
| Trace ID forwarding | L7 | `ROBUST: trace_id forwarded to agent-execute activities` |
| Handler error propagation | L7 | `ROBUST: handler errors logged as failed status` |
| Cron field compatibility | L7 | `ROBUST: Dispatcher handles both cron field names` |
| Enum adherence | L7 | `ROBUST: outcome_status only uses valid enum values` |
| Bootstrap state | L7 | `ROBUST: agents memory key seeded by bootstrap` |
| Outcome evaluation query | L7 | `ROBUST: evaluate_outcomes picks up NULL outcome activities` |

## Deployment Checklist

For a fresh FlowWink deployment:

1. ✅ Run database migrations (`supabase db push`)
2. ✅ Deploy all edge functions (`supabase functions deploy`)
3. ✅ Deploy frontend (Vercel/Easypanel)
4. ✅ First admin login triggers `setup-flowpilot` bootstrap
5. ✅ Verify cron jobs are registered (check `cron.job` table)
6. ✅ Verify heartbeat fires successfully (check `agent_activity`)
