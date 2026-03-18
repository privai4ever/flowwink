

## Analys: Integrationer × Moduler — Nuläge och Förslag

### Nuläge — Två separata system utan koppling

```text
┌─────────────────────────┐     ┌──────────────────────────┐
│  MODULES (useModules)   │     │ INTEGRATIONS (useInteg.) │
│                         │     │                          │
│  newsletter  ──────────────?──── resend                  │
│  orders      ──────────────?──── stripe                  │
│  blog (AI)   ──────────────?──── openai / gemini         │
│  paidGrowth  ──────────────?──── meta_ads                │
│  salesIntel  ──────────────?──── hunter / jina / firecrawl│
│                         │     │                          │
│  (ingen koppling idag)  │     │  (flat lista, ej kopplad)│
└─────────────────────────┘     └──────────────────────────┘
```

**Problem:**
1. Moduler refererar till integrations-fält (t.ex. `stripe_checkout_id`) men kollar aldrig om integrationen är aktiv
2. `useIsIntegrationActive` definieras men **används inte** i någon modul
3. Integrationer som Resend servar **flera** moduler (Newsletter + Bookings + Orders) — att flytta in den i en modul bryter den relationen
4. Admingränssnittet visar moduler och integrationer som helt separata sidor utan korsreferens

### Delade integrationer — Varför de inte kan "ägas" av en modul

| Integration | Används av moduler |
|---|---|
| **Resend** | Newsletter, Bookings, Orders, Forms |
| **Stripe** | Orders, Products, Bookings |
| **OpenAI / Gemini** | Blog, Chat, Sales Intelligence, Landing Page Compose |
| **Hunter / Jina / Firecrawl** | Sales Intelligence (primär), men även Growth |
| **Slack** | Notifications tvärs alla moduler |
| **Google Analytics / Meta Pixel** | Analytics (global, ej modulbunden) |

### Förslag: `requiredIntegrations` + `optionalIntegrations` på ModuleConfig

Istället för att flytta integrationer *in i* moduler, deklarerar varje modul **vilka integrationer den behöver**:

```typescript
// Tillägg till ModuleConfig
export interface ModuleConfig {
  // ... befintliga fält
  requiredIntegrations?: (keyof IntegrationsSettings)[];  // Modul fungerar ej utan
  optionalIntegrations?: (keyof IntegrationsSettings)[];  // Extra funktionalitet
}
```

Exempel:
- `newsletter`: `required: ['resend']`
- `orders`: `required: ['stripe']`, `optional: ['resend']` (för orderbekräftelser)
- `paidGrowth`: `required: ['meta_ads']`
- `salesIntelligence`: `optional: ['hunter', 'jina', 'firecrawl']` (fungerar med minst en)
- `blog`: `optional: ['openai', 'gemini']` (AI-generering är en bonus)

### Vad detta ger i UI

1. **Modules-sidan** visar statusbadge per modul: "2/3 integrations active" eller en varningsikon om required saknas
2. **Integrations-sidan** visar vilka moduler som använder varje integration: "Used by: Newsletter, Bookings, Orders"
3. När en modul aktiveras och required integration saknas → inline-varning med "Configure" länk
4. `useIsIntegrationActive` får äntligen ett syfte — moduler kan kolla vid publish-time

### Tekniska ändringar

1. **`useModules.tsx`** — Lägg till `requiredIntegrations` och `optionalIntegrations` i `ModuleConfig` och fyll i `defaultModulesSettings`
2. **`ModulesPage.tsx`** — Visa integrationsstatus per modul (badge/ikon)
3. **`IntegrationsStatusPage.tsx`** — Visa "Used by modules: X, Y" under varje integration
4. **Modul `publish()`-funktioner** — Lägg till pre-flight check: om required integration saknas, returnera tydligt fel istället för att försöka och fallera
5. **Ny hook `useModuleReadiness(moduleId)`** — Returnerar `{ ready, missingRequired, missingOptional }` baserat på integrationsstatus

### Sammanfattning

Integrationer förblir **globala resurser** (de ägs inte av moduler), men moduler **deklarerar sina beroenden**. Det ger:
- Tydligt för admin vilka integrationer som behövs
- Inga brutna flöden — moduler kan göra pre-flight checks
- Flexibilitet — en integration kan serva många moduler
- Intuitivt UI med korsreferenser åt båda håll

