

# Plan: OpenClaw Core Refaktor — `_shared/pilot/`

## Status: Phase 1 Complete ✅

### Completed
1. **Created `_shared/pilot/prompt-compiler.ts`** — Generalized prompt compiler with no CMS references. Identity defaults changed from 'FlowPilot'/'CMS operator' to 'Agent'/'autonomous operator'. Added `freshSitePlaybook` parameter for domain-injected playbooks.

2. **Created `_shared/pilot/built-in-tools.ts`** — All 30+ built-in tool definitions extracted. Clean separation with `getBuiltInTools()` and `BUILT_IN_TOOL_NAMES` exports.

3. **Created `_shared/domains/cms-context.ts`** — All CMS-specific logic extracted:
   - `loadCMSSchema()` — data counts, modules, integrations
   - `loadCrossModuleInsights()` — deals, leads, bookings, page views
   - `detectSiteMaturity()` — fresh site detection
   - `CMS_DAY_1_PLAYBOOK` — fresh site playbook
   - `cmsDomainPack` aggregate export

4. **Created `_shared/pilot/index.ts`** — Barrel file re-exporting all pilot modules.

5. **Updated `_shared/types.ts`** — Added `freshSitePlaybook` field to `PromptCompilerInput`.

### Phase 2 (Next)
- **Move handler functions into `pilot/reason.ts`** — The 2500+ lines of handler logic (memory, objectives, workflows, A2A, skill CRUD, reflection, outcome evaluation, reason loop) still live in `agent-reason.ts`. Extract into `pilot/reason.ts`.
- **Update `agent-reason.ts`** to be a slim re-export facade.
- **Update imports** in heartbeat, operate, chat-completion, setup-flowpilot.
- **Seed `domain_pack` and `reasoning_config`** in setup-flowpilot bootstrap.
- **Update `docs/OPENCLAW-LAW.md`** with new architecture.

## Architecture (Current)

```text
supabase/functions/
├── _shared/
│   ├── pilot/                          ← GENERIC CORE
│   │   ├── index.ts                    (barrel re-exports)
│   │   ├── prompt-compiler.ts          (6-layer prompt, workspace files) ✅
│   │   └── built-in-tools.ts           (tool definitions) ✅
│   │
│   ├── domains/                         ← DOMAIN PACKS
│   │   └── cms-context.ts              (CMS schema, insights, maturity) ✅
│   │
│   ├── agent-reason.ts                 ← MONOLITH (to be split in Phase 2)
│   ├── types.ts                        ✅ updated
│   ├── ai-config.ts                    (already modular)
│   ├── concurrency.ts                  (already modular)
│   ├── token-tracking.ts              (already modular)
│   ├── trace.ts                        (already modular)
│   └── integrity.ts                    (already modular)
```
