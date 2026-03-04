

## Create `docs/flowpilot.md` — Agentic Framework Documentation

### Purpose
A single comprehensive document describing FlowPilot's agentic architecture, its USP positioning, and mapping to OpenClaw concepts. This becomes the definitive reference for the platform's AI-driven operational intelligence.

### Document Structure

1. **Executive Summary** — FlowPilot as the "helicopter brain" for CMS operations; dual-agent architecture (internal FlowPilot + public visitor chat) sharing a unified skill engine

2. **Value Proposition** — Three pillars:
   - **For Visitors**: Public chat grounded in all site content (pages, blogs, KB articles) + agent skills (booking, orders, search) = intelligent business concierge
   - **For Admin/Employees**: FlowPilot Operate mode = autonomous CMS operator with memory, objectives, self-improvement, and approval gating
   - **For the Business**: Automation layer (cron/event/signal triggers) keeps the platform running autonomously while maintaining human-in-the-loop control

3. **OpenClaw Mapping** — Direct comparison table:
   - OpenClaw Skill Registry → `agent_skills` table (DB-driven, OpenAI function-calling format)
   - OpenClaw Tool Router → `agent-execute` edge function (handler routing: edge/module/db/webhook)
   - OpenClaw Memory → `agent_memory` (persistent key-value with categories)
   - OpenClaw Objectives → `agent_objectives` (goal tracking with progress + success criteria)
   - OpenClaw Activity Log → `agent_activity` (full audit trail with duration, I/O, status)
   - OpenClaw Automations → `agent_automations` (cron/event/signal triggers)
   - OpenClaw Self-Modification → skill_create/update/disable + automation_create + reflect

4. **Architecture Diagram** — ASCII flow showing:
   - Visitor Chat → chat-completion → skill engine → agent-execute
   - Admin FlowPilot → agent-operate (multi-tool loop, up to 6 iterations) → agent-execute
   - Signal sources (webhooks, Gmail, qualify-lead) → signal-dispatcher → automations
   - Cron → automation-dispatcher → agent-execute

5. **Skill Engine Deep Dive** — Handler types, scope model, approval gating, activity logging

6. **Autonomous Capabilities** — Memory, objectives, reflection, self-modification (skill CRUD), multi-tool chaining

7. **Signal & Automation Layer** — Cron dispatcher, event triggers (via send-webhook), signal conditions (score_threshold, status_change, field_match, compound), Gmail integration

8. **Content as Knowledge** — How pages, blogs, KB articles feed into public chat context; the `buildKnowledgeBase` function; configurable context windows

9. **Key Files Reference** — Table mapping each edge function and component to its role

### File
- `docs/flowpilot.md` — new, ~300 lines

### Sources
All content derived from existing codebase: `agent-execute`, `agent-operate`, `chat-completion`, `signal-dispatcher`, `automation-dispatcher`, `gmail-inbox-scan`, types in `src/types/agent.ts`, and the plan in `.lovable/plan.md`.

