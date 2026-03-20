

# FlowPilot as a Core Module — Simplification Analysis

## Answer: Yes, significantly simpler

Making FlowPilot `core: true` eliminates **6 of the 13 planned changes** because there's no "off" state to handle.

## What gets removed

| Concern | Why it's gone |
|---|---|
| Cron teardown RPC | Never disabled → no teardown needed |
| Dashboard widget disabled states | Always active → always render |
| Copilot page disabled state | Always accessible |
| Proactive messages short-circuit | Always running |
| `agent-execute` module gate check | Always enabled |
| Activation banner in Skill Hub | Always active (replaced by onboarding wizard on first visit) |

## What remains (7 items)

1. **Register `flowpilot` in `useModules.tsx`** — `core: true`, category `system`, icon `Sparkles`
2. **Nav items get `moduleId: "flowpilot"`** — visible always since core modules can't be disabled, but provides proper registry linkage
3. **`useFlowPilotBootstrap` hook** — still needed to seed skills/objectives/cron on first activation (idempotent, called from multiple entry points)
4. **Generic seed data in `setup-flowpilot`** — template-agnostic objectives, automations, standard workflows
5. **Remove FlowPilot seeding from `useTemplateInstaller.ts`** — templates become visual-only
6. **Clean template definitions** — remove soul/objectives/automations from `src/data/templates/*.ts`
7. **Wire all entry points to bootstrap** — template install, copilot-scratch, copilot-migrate, CLI all call `useFlowPilotBootstrap` to ensure seeding happens

## The one remaining question: WHEN does seeding happen?

Since it's core and always-on, seeding should happen **at first admin login** (or first visit to any admin page). The `useFlowPilotBootstrap` hook checks if skills exist — if not, it seeds automatically. No banner, no button, no toggle. It just starts.

```text
Admin visits any page → useFlowPilotBootstrap checks skills.length
  → 0 skills? → call setup-flowpilot (generic) → fire heartbeat → done
  → >0 skills? → no-op
```

## Revised implementation plan

### 1. Add `flowpilot` to `useModules.tsx`
```typescript
flowpilot: {
  enabled: true,
  name: 'FlowPilot',
  description: 'Autonomous AI operator — skills, objectives, automations and workflows',
  icon: 'Sparkles',
  category: 'system',
  core: true,          // Cannot be disabled
  autonomy: 'agent-capable',
  adminUI: true,
}
```

### 2. Create `useFlowPilotBootstrap.ts`
Idempotent hook that auto-seeds on first admin session. Called from `AdminLayout` or a top-level provider. Checks skill count, seeds if zero, fires heartbeat.

### 3. Update `setup-flowpilot` edge function
Add `GENERIC_FLOWPILOT` config with template-agnostic objectives and standard automations. Fix `trigger_config` normalization.

### 4. Strip FlowPilot from templates
Remove `setup-flowpilot` calls from `useTemplateInstaller.ts`. Remove soul/objectives/automations from all 11 template files. Templates = pages + posts + products + branding only.

### 5. Onboarding wizard becomes the "personalization" layer
`FlowPilotOnboardingWizard.tsx` runs on first Skill Hub visit to let admin customize objectives beyond the generic defaults. Not required — generic objectives work without it.

## Summary

Core module = always on = no toggle UI, no teardown, no disabled states, no activation banner. Just auto-seed on first visit. The simplest possible path.

