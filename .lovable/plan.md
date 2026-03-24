

# Plan: OpenClaw Core Refaktor — `_shared/pilot/`

## Namnval

`_shared/pilot/` — kort, rent, produktneutralt nog för återanvändning men tydligt kopplat till FlowPilot-varumärket. "openclaw" är standarden vi följer, inte mappnamnet.

## Struktur

```text
supabase/functions/
├── _shared/
│   ├── pilot/                    ← GENERISK KÄRNA
│   │   ├── reason.ts             (LLM-loop, tool-calling)
│   │   ├── prompt-compiler.ts    (6-lagers arkitektur)
│   │   ├── concurrency.ts
│   │   ├── token-tracking.ts
│   │   ├── trace.ts
│   │   ├── types.ts
│   │   ├── ai-config.ts
│   │   ├── integrity.ts
│   │   └── built-in-tools.ts     (memory, objectives, skills, A2A, chain)
│   │
│   ├── domains/                   ← DOMÄNMODULER
│   │   ├── cms-context.ts         (loadCMSSchema, CMS-instruktioner)
│   │   └── cms-playbook.ts        (DAY_1_PLAYBOOK)
│   │
│   └── agent-reason.ts           ← SLIM RE-EXPORT (bakåtkompatibilitet)
```

## Steg

### 1. Skapa `_shared/pilot/` och flytta generisk logik
Flytta alla domänagnostiska delar från `agent-reason.ts` till `pilot/`-submoduler. `CORE_INSTRUCTIONS` generaliseras — CMS-specifik text tas bort och injiceras via `domainContext`-parameter.

### 2. Skapa `_shared/domains/cms-context.ts`
Samla `loadCMSSchema()`, `DAY_1_PLAYBOOK`, och CMS-specifika instruktioner. Exportera en `cmsDomainPack` som heartbeat/operate importerar.

### 3. Bakåtkompatibel re-export i `_shared/agent-reason.ts`
```typescript
export * from './pilot/reason.ts';
```
Så befintliga imports inte bryts direkt.

### 4. Uppdatera imports i heartbeat, operate, setup
```typescript
import { reason } from '../_shared/pilot/reason.ts';
import { cmsDomainPack } from '../_shared/domains/cms-context.ts';
```

### 5. Lägg till konfigurationsnycklar i setup-flowpilot
Seeda `domain_pack` och `reasoning_config` i `agent_memory` vid bootstrap.

### 6. Uppdatera `docs/OPENCLAW-LAW.md`
Dokumentera den nya mappstrukturen och domänpack-konceptet.

## Omfattning
- 1 ny subfolder: `_shared/pilot/` (refaktorerad kod)
- 1 ny fil: `_shared/domains/cms-context.ts`
- 1 re-export-fil uppdaterad
- 4-5 filer med import-uppdateringar
- ~200 rader ny kod, ~300 rader flyttad

