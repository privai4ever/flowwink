# FlowPilot Agentic Architecture

## Phase 1: Skill Registry + Unified Tool Engine ✅ DONE

### Completed
- **Database tables**: `agent_skills`, `agent_memory`, `agent_activity` with RLS policies
- **Enums**: `agent_scope`, `agent_skill_category`, `agent_activity_status`, `agent_type`, `agent_memory_category`
- **11 built-in skills** seeded: migrate_url, create_page_block, write_blog_post, send_newsletter, create_campaign, add_lead, search_web, book_appointment, check_order, update_settings, analyze_analytics
- **`agent-execute` edge function**: Unified skill executor with scope validation, approval checks, handler routing (edge/module/db/webhook), and activity logging
- **TypeScript types**: `src/types/agent.ts` with full type coverage

### Verified
- Direct execution works (analyze_analytics returns real page view data)
- Scope validation works (internal skills blocked from chat agent)
- Approval gating works (send_newsletter returns 202 pending_approval)

## Phase 2: FlowPilot "Operate" Mode ✅ DONE

### Completed
- Mode switcher (Operate | Migrate) in CopilotPage header using Tabs
- OperateChat component — chat with quick actions, skill badges, and inline results
- ActivityFeed sidebar — shows recent actions with status, duration, approve button
- `agent-operate` edge function — AI router that picks skills via tool calling, executes via agent-execute, summarizes results
- `useAgentOperate` hook — manages messages, skills, activity, and approval flow

### TODO (refinement)
- [ ] Refactor copilot-action to load tool definitions from agent_skills table

## Phase 2.5: Active Memory ✅ DONE

### Completed
- **agent-operate** loads all `agent_memory` entries into system prompt before each AI call
- **memory_write** built-in tool — FlowPilot saves preferences, facts, context to DB
- **memory_read** built-in tool — FlowPilot searches memory by key/category
- Memory tools handled locally in agent-operate (no round-trip to agent-execute)
- Two new skills registered in `agent_skills` table (memory_write, memory_read)
- FlowPilot proactively saves useful info when it learns something new

## Phase 3.5: Skill Hub Admin UI ✅ DONE

### Completed
- **SkillHubPage** (`/admin/skills`) with Skills, Activity, and Objectives (placeholder) tabs
- **SkillCard** — card grid with inline enable/disable toggle, scope/category/handler badges
- **SkillEditorSheet** — full CRUD sheet with JSON tool definition editor (CodeMirror)
- **ActivityTable** — filterable activity log with expand for input/output JSON, approve/reject
- **useSkillHub** hook — CRUD for skills, activity queries, approval mutations
- **Sidebar** — "Skill Hub" added to Main group with Bot icon

## Phase 3: Public Chat Gets Skills ✅ DONE

### Completed
- **chat-completion** loads external/both skills from `agent_skills` table as OpenAI-compatible tools
- Skills are routed through `agent-execute` edge function (scope validation, approval gating, activity logging)
- `agentSkillNames` map tracks which tool calls are agent skills vs built-in tools
- System prompt dynamically extended with skill usage instructions
- Works for both OpenAI and local AI providers (when tool calling is supported)
- Approval-gated skills return friendly "pending approval" messages to visitors

## Phase 4: Automation Layer ✅ DONE

### Completed
- **agent_automations table** with cron/event/signal trigger types and RLS policies
- **AutomationsPanel** — full CRUD UI with trigger-type badges, skill linking, JSON config editor
- **ObjectivesPanel** — full CRUD UI with status management, progress tracking, constraint/criteria JSON
- **FlowPilot skills**: `create_objective` and `create_automation` registered in agent_skills
- **agent-execute** updated with `module:objectives` and `module:automations` handlers
- **5 seed automations** and **4 seed objectives** for onboarding

### Runtime
- **`automation-dispatcher` edge function** — reads due cron automations, executes via agent-execute, updates run metadata
- **pg_cron** runs dispatcher every minute via pg_net HTTP POST
- Simple cron parser calculates `next_run_at` for common patterns (*/N, daily, weekly)

- **Event-trigger dispatch** — `send-webhook` now also checks `agent_automations` with matching `event_name` and executes their skills via `agent-execute`, merging event data into arguments

## Phase 5: Autonomy Unlocks ✅ DONE

### Completed
- **Multi-tool loop** — up to 6 iterations, all tool_calls processed in parallel per round
- **Approval re-execution** — approved pending actions auto-re-execute with original args
- **Conversation persistence** — sessions saved to chat_conversations/chat_messages
- **Markdown rendering** — assistant messages rendered with react-markdown

## Phase 6: Agent Self-Improvement ✅ DONE

### Completed
- **skill_create** — FlowPilot can register new skills with handler routing and tool definitions
- **skill_update** — Modify existing skill metadata (description, handler, scope, approval)
- **skill_list** — Enumerate all registered skills with filtering
- **skill_disable** — Turn off problematic or unused skills
- **automation_create** — Create automations (cron/event/signal) linked to skills, disabled by default
- **automation_list** — View all automations with run counts and status
- **reflect** — Introspection tool that analyzes 7-day activity patterns, calculates error rates, identifies unused skills, and generates actionable improvement suggestions

### Completed
- **Multi-tool loop** — `agent-operate` now iterates up to 6 rounds, processing ALL tool_calls in parallel per round, allowing the agent to chain steps autonomously (e.g., search → analyze → write)
- **Approval re-execution** — When admin approves a `pending_approval` activity, the original skill is automatically re-executed with its original arguments
- **Conversation persistence** — FlowPilot sessions are saved to `chat_conversations` + `chat_messages`, surviving page refreshes and browser restarts
- **Markdown rendering** — Assistant messages now render with `react-markdown` for proper formatting (headers, lists, code blocks, bold, etc.)
- **Multi-skill result tracking** — Response format supports `skill_results[]` array for showing multiple tool executions per turn

## Architecture Reference

```
skill.handler routing:
  edge:function-name  →  supabase.functions.invoke()
  module:name         →  Direct DB operations (blog, crm, booking, etc.)
  db:table            →  DB read/write (settings, analytics)
  webhook:n8n         →  External webhook POST
```

## Key Files
| File | Purpose |
|------|---------|
| `supabase/functions/agent-execute/index.ts` | Unified skill executor |
| `src/types/agent.ts` | TypeScript types for skill engine |
| `src/lib/module-registry.ts` | Existing module registry (14 modules) |
| `supabase/functions/copilot-action/index.ts` | Current FlowPilot (to be refactored) |
| `supabase/functions/chat-completion/index.ts` | Current public chat (to integrate skills) |
