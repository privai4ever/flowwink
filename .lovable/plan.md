

# Dubbelkoll efter FlowPilot Core Module-refaktorn

## Status: Nästan rent — 2 småsaker att fixa

### ✅ Redan korrekt
- **`useModules.tsx`**: `flowpilot` registrerad med `core: true`, `SIDEBAR_TO_MODULE` inkluderar `/admin/copilot` och `/admin/skills`
- **`adminNavigation.ts`**: Båda nav-items har `moduleId: "flowpilot"`
- **`useFlowPilotBootstrap.ts`**: Idempotent hook, kontrollerar skill count, seedar generiskt, fires heartbeat
- **`AdminLayout.tsx`**: Hook anropas globalt
- **Template types**: `flowpilot`-property borttagen från `StarterTemplate`
- **Template-filer**: Alla 11 mallar saknar `soul`, `objectives`, `automations`, `workflows` — rent
- **`useTemplateInstaller.ts`**: `setup-flowpilot`-anrop borttaget, kommentar på plats (rad 602-603)
- **Edge function**: Fortfarande accepterar `template_flowpilot` från bootstrap-hooken — fungerar

### ⚠️ Sak att fixa

**1. Missvisande toast i template installer (rad 637)**
```
description += '. FlowPilot initialized.';
```
Templates seedar inte längre FlowPilot — denna text är felaktig. Bör tas bort eller ändras till något som reflekterar att FlowPilot bootstrappas separat.

### 📋 Icke-blockerande observationer

**2. Edge function har kvar `STARTER_FLOWPILOT` (rad 1773-1801)**
`setup-flowpilot` har fortfarande en inbäddad `STARTER_FLOWPILOT`-konfiguration och `template_id`-parameter. Dessa kodvägar anropas aldrig längre (bootstrap-hooken skickar `template_flowpilot` direkt, templates anropar inte edge function). Inte trasigt, men dead code — kan städas vid tillfälle.

## Åtgärd

Enda nödvändiga fix: ta bort `'. FlowPilot initialized.'` från toast-meddelandet i `useTemplateInstaller.ts` rad 637.

