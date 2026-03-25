

## Plan: Baka in skill instructions i DEFAULT_SKILLS (Option B)

### Bakgrund — varför detta är rätt val

Du förstår helt rätt. Utmaningen med self-hosting utan ORM/Prisma:

1. **Bootstrap-logiken insertar bara NYA skills** (rad 2338: `filter(s => !existingNames.has(s.name))`). Re-run uppdaterar INTE befintliga skills.
2. **Ingen automatisk schema-sync** — ni förlitar er på edge functions + migrationer, inte Prisma-migrations som kan diffas.
3. **Integrity gate flaggar redan** att instructions saknas (integrity.ts rad 47-49) — men kan inte fixa det själv.
4. **Agent-driven approach (Option A)** kräver att heartbeat + AI-provider fungerar perfekt vid första start — en risk för nya installationer.

Med instructions i koden får varje ny kund **100% integrity score från dag 1**, utan beroende på att agenten hinner köra heartbeat först.

---

### Steg

#### 1. Lägg till `instructions`-fält på alla ~61 skills i DEFAULT_SKILLS
**Fil:** `supabase/functions/setup-flowpilot/index.ts`

Varje skill får en `instructions`-sträng i Markdown-format enligt LAW 1:
- **What**: Vad den gör
- **When to use**: Beslutstabell
- **Parameters**: Nyanser bortom JSON-schemat  
- **Edge cases**: Vanliga fallgropar
- **Provider notes**: Om relevant (t.ex. AI-beroende skills)

Exempel:
```typescript
{
  name: 'write_blog_post',
  instructions: `## write_blog_post
### What
Creates a draft blog post in the CMS.
### When to use
- User asks to write/create/draft a blog post
- Content pipeline workflow step
- NOT for updating existing posts (use update_page)
### Parameters
- **content**: Always provide full markdown. Never leave empty expecting AI generation inside the handler.
- **tone**: Defaults to 'professional' if omitted.
### Edge cases
- If no content provided, handler generates via AI — but quality is lower than agent-written content.
- Title must be unique; duplicates get a suffix.`,
  // ... rest of skill definition
}
```

#### 2. Ändra seeding-logik: backfill instructions på befintliga skills
**Fil:** `supabase/functions/setup-flowpilot/index.ts` (~rad 2330-2360)

Efter nya skills inserts, lägg till en **backfill-loop** som uppdaterar befintliga skills som saknar instructions:

```typescript
// Backfill instructions on existing skills that lack them
const skillsToBackfill = DEFAULT_SKILLS.filter(
  s => existingNames.has(s.name) && s.instructions
);
for (const skill of skillsToBackfill) {
  await supabase.from('agent_skills')
    .update({ instructions: skill.instructions })
    .eq('name', skill.name)
    .is('instructions', null);  // Only if currently empty
}
```

Detta säkerställer att:
- Nya installationer → instructions finns direkt
- Uppgraderingar → befintliga skills som saknar instructions fylls i
- Agent-modifierade instructions → bevaras (`.is('instructions', null)`)

#### 3. Uppdatera skill-hash beräkning
Automatiskt — `computeSkillHash()` inkluderar redan `instructions` (integrity.ts rad 18), så hashen blir korrekt efter backfill.

---

### Teknisk detalj

| Scenario | Före | Efter |
|----------|------|-------|
| Ny installation | 0/73 instructions → integrity ~60% | 73/73 → integrity 100% |
| Uppgradering (git pull + update-funcs) | 8/73 instructions | 73/73 (backfill via `.is(null)`) |
| Agent har modifierat | — | Bevaras (backfill skippar non-null) |

**Storleksuppskattning:** ~61 skills × ~15 rader instructions = ~900 rader ny kod i setup-flowpilot.

### Risker
- Filen är redan 2641 rader — blir ~3500. Acceptabelt för en seed-fil.
- Instructions skrivs av oss, inte agenten — men agenten kan förbättra dem via `skill_instruct` efteråt (hybrid-strategin).

