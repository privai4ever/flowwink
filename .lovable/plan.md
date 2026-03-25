

## JSON5 Raw Mode Editor for FlowPilot Config

### Vad vi bygger
En "Raw Mode"-editor i FlowPilot-panelen (ModuleDetailSheet) som visar alla `agent_memory`-nycklar med `category = 'config'` som en redigerbar JSON5-blob. Inkluderar Form/Raw toggle, validering, och snapshot-backup.

### Varför
- Pilot kan ändra sin hela konfiguration i en enda `memory_upsert` istället för individuella anrop
- JSON5 tillåter kommentarer (`//`) och relaxed syntax — säkrare för LLM-generering
- Admin kan snabbt inspektera och bulk-editera config utan att navigera formulär

---

### Teknisk plan

#### 1. Installera dependencies
- `json5` — parse/stringify med kommentarer och trailing commas
- `@codemirror/lang-json` — syntax highlighting för JSON i CodeMirror (redan har `@uiw/react-codemirror`)

#### 2. Ny komponent: `ConfigRawEditor.tsx`
Placeras i `src/components/admin/modules/`

Funktionalitet:
- **Laddar** alla `agent_memory` rader med `category = 'config'` 
- **Konverterar** till en samlad JSON5-blob: `{ reasoning_config: {...}, tool_policy: {...}, ... }`
- **Form/Raw toggle** — Form-vy visar readonly key-cards med expand/collapse; Raw-vy visar CodeMirror-editor
- **Validering vid spara** — parsar med `JSON5.parse()`, visar fel inline om ogiltig syntax
- **Snapshot-backup** — innan överskrivning, sparar nuvarande state som `config_snapshot_<timestamp>` i `agent_memory` med `category = 'snapshot'`
- **Spara** — upsert:ar varje top-level nyckel tillbaka till individuella `agent_memory`-rader

#### 3. Integrera i FlowPilotDetails
Lägg till `ConfigRawEditor` som en ny sektion i `FlowPilotDetails.tsx`, mellan Bootstrap Status och Instance Health.

#### 4. CodeMirror-konfiguration
Återanvänd den befintliga `theme` från `CodeEditor.tsx` men med `json()`-language extension istället för `html()`.

---

### Filändringar

| Fil | Ändring |
|-----|---------|
| `package.json` | Lägg till `json5`, `@codemirror/lang-json` |
| `src/components/admin/modules/ConfigRawEditor.tsx` | **Ny fil** — hela editorn |
| `src/components/admin/modules/FlowPilotDetails.tsx` | Importera och rendera `ConfigRawEditor` |
