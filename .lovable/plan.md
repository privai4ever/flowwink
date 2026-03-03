

# Skill Hub — Unified Agent Administration

## Vision

Inspired by how Claude Code exposes "tools" and OpenClaw defines "skills" as composable units, we evolve FlowPilot's current flat skill list into a **Skill Hub** — a single admin page where you manage, compose, and monitor everything the agents can do.

The key insight: your platform already has two parallel registries — **Module Registry** (14 frontend modules with Zod contracts) and **Agent Skills** (11 DB-driven tool definitions). These need to converge into one manageable surface.

## Concept: Three Layers

```text
+--------------------------------------------------+
|                   OBJECTIVES                      |
|  "Grow newsletter by 20% this quarter"            |
|  High-level goals that decompose into skill runs  |
+--------------------------------------------------+
          |
          v
+--------------------------------------------------+
|                    SKILLS                          |
|  Composable, scoped actions (what exists today)   |
|  + new: chains, conditions, schedules             |
+--------------------------------------------------+
          |
          v
+--------------------------------------------------+
|                   MODULES                         |
|  Data layer (blog, CRM, booking, etc.)            |
|  Already exists in module-registry                |
+--------------------------------------------------+
```

**Modules** = data and business logic (already built).
**Skills** = agent-callable actions that use modules (already built, needs admin UI).
**Objectives** = new concept — a goal that can trigger multiple skills over time.

## What We Build (Phase 1)

### 1. Skill Hub Page (`/admin/skills`)

A new admin page with three tabs:

**Skills Tab** — CRUD for `agent_skills` table
- Card grid showing all skills with name, category, scope badge, handler type
- Toggle enabled/disabled inline
- Click to edit: name, description, scope, handler, requires_approval, tool_definition (JSON editor)
- "New Skill" button to create custom skills
- Filter by category and scope

**Activity Tab** — Enhanced view of `agent_activity`
- Table with filters (agent type, status, skill, date range)
- Click to expand: full input/output JSON, duration, error details
- Bulk approve/reject for pending items

**Objectives Tab** (Phase 2 placeholder)
- Simple list of goals with status (draft/active/completed)
- Each objective links to related skill executions
- Placeholder UI that shows the concept

### 2. Sidebar Navigation Update

Add "Skill Hub" under FlowPilot in the Main navigation group, using a `Puzzle` or `Boxes` icon.

### 3. Skill Editor Dialog

A sheet/dialog for creating and editing skills:
- Name, description, category (dropdown), scope (radio: internal/external/both)
- Handler type picker (edge function, module, DB, webhook) with dynamic fields
- Tool definition editor — either form-based (name, params) or raw JSON toggle
- Approval toggle
- Test button that fires `agent-execute` and shows result inline

## Technical Details

### New Files
| File | Purpose |
|------|---------|
| `src/pages/admin/SkillHubPage.tsx` | Main page with tabs |
| `src/components/admin/skills/SkillCard.tsx` | Card for skill grid |
| `src/components/admin/skills/SkillEditorSheet.tsx` | Create/edit sheet |
| `src/components/admin/skills/ActivityTable.tsx` | Enhanced activity view |
| `src/hooks/useSkillHub.ts` | CRUD operations for skills |

### Database
No schema changes needed — `agent_skills`, `agent_activity`, and `agent_memory` tables already have the right structure and RLS policies.

### Route
Add `/admin/skills` to the router alongside existing admin routes.

### Sidebar
Add entry in the "Main" navigation group in `AdminSidebar.tsx`.

### PRD Update
Document Skill Hub as a new section in the PRD under FlowPilot.

## What This Enables

- **Self-service skill creation** — admins can wire up new edge functions or webhooks without code changes
- **Visibility** — see exactly what the agents are doing, approve/reject actions
- **Foundation for Objectives** — once the skill layer is manageable, we can layer goal-driven automation on top
- **Convergence** — Module Registry provides the "what's possible," Skill Hub provides the "what's enabled for agents"

## Out of Scope (Future Phases)
- Skill chaining / composition (multi-step workflows)
- Objective decomposition engine
- Scheduled/cron skill execution
- Skill marketplace or templates

