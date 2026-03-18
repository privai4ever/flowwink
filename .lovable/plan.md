

## Fas 1: Paid Growth — skill-kategori + 4 skills

### Vad som behövs

**1. Database migration** — Lägg till `'growth'` i `agent_skill_category` enum:
```sql
ALTER TYPE public.agent_skill_category ADD VALUE IF NOT EXISTS 'growth';
```

**2. TypeScript-typ** — Uppdatera `AgentSkillCategory` i `src/types/agent.ts`:
```
'content' | 'crm' | 'communication' | 'automation' | 'search' | 'analytics' | 'growth'
```

**3. Skill Hub UI** — Lägg till `<SelectItem value="growth">Growth</SelectItem>` i category-filtret i `SkillHubPage.tsx`.

**4. Fyra nya default skills** i `setup-flowpilot/index.ts` DEFAULT_SKILLS-arrayen:

| Skill | Handler | Approval | Beskrivning |
|-------|---------|----------|-------------|
| `ad_campaign_create` | `edge:ad-campaign-create` | **Ja** (budget-gate) | Skapa kampanj med mål, budget, målgrupp, plattform |
| `ad_creative_generate` | `edge:ad-creative-generate` | Nej | AI-genererad annonstext + bild via Lovable AI |
| `ad_performance_check` | `edge:ad-performance-check` | Nej | Hämta metrics: spend, impressions, clicks, CTR, CPC |
| `ad_optimize` | `edge:ad-optimize` | **Ja** | Pausa underpresterare, skala vinnare, justera budget |

**5. Två nya databas-tabeller** (migration):

**`ad_campaigns`**:
- id, name, platform (meta/google/linkedin), objective, status (draft/active/paused/completed)
- budget_cents, spent_cents, currency
- target_audience JSONB, metrics JSONB (impressions, clicks, ctr, cpc, conversions)
- start_date, end_date, created_by, created_at, updated_at
- RLS: admin full access, system insert/update

**`ad_creatives`**:
- id, campaign_id (FK), type (image/video/text/carousel), headline, body, cta_text
- image_url, performance JSONB (impressions, clicks, ctr)
- status (draft/active/paused), created_at, updated_at
- RLS: admin full access, system insert/update

**6. Fyra edge functions** (stub-implementationer som loggar till ad_campaigns/ad_creatives — redo för Meta Ads API-koppling i Fas 2):

- `supabase/functions/ad-campaign-create/index.ts` — Validerar input, skapar kampanj i `ad_campaigns` med status `draft`
- `supabase/functions/ad-creative-generate/index.ts` — Använder Lovable AI (gemini-2.5-flash) för att generera annonstext baserat på kampanjmål/målgrupp, sparar i `ad_creatives`
- `supabase/functions/ad-performance-check/index.ts` — Läser metrics från `ad_campaigns` + `ad_creatives` (i Fas 2 synkas dessa från Meta API)
- `supabase/functions/ad-optimize/index.ts` — Analyserar performance, returnerar rekommendationer (pausa/skala), uppdaterar status

### Summering av filer som ändras/skapas

| Fil | Åtgärd |
|-----|--------|
| Migration (ny) | Enum + 2 tabeller + RLS |
| `src/types/agent.ts` | Lägg till `'growth'` |
| `src/pages/admin/SkillHubPage.tsx` | Lägg till Growth i filter |
| `supabase/functions/setup-flowpilot/index.ts` | 4 nya skills i DEFAULT_SKILLS |
| `supabase/functions/ad-campaign-create/index.ts` | Ny edge function |
| `supabase/functions/ad-creative-generate/index.ts` | Ny edge function |
| `supabase/functions/ad-performance-check/index.ts` | Ny edge function |
| `supabase/functions/ad-optimize/index.ts` | Ny edge function |

### Notering
Edge functions i Fas 1 arbetar mot de lokala tabellerna. Meta Ads API-integration (connector + API-proxy) läggs till i Fas 2 när grundstrukturen är verifierad.

