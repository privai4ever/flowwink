

## Plan: Länka varningen i ModuleCard till integrations-sidan

### Vad ändras

I `src/components/admin/modules/ModuleCard.tsx`, rad 246-250 — den amber-färgade "Missing: resend, stripe"-varningen blir klickbar och navigerar till `/admin/integrations`.

### Tekniska ändringar

**`src/components/admin/modules/ModuleCard.tsx`**
- Importera `useNavigate` från `react-router-dom`
- Wrappa varningsraden (rad 247-250) i en klickbar `button` eller använd `Link` som navigerar till `/admin/integrations`
- Lägg till en liten pil-ikon (`ExternalLink` eller `ArrowRight`) för att signalera klickbarhet
- Cursor-pointer + hover-effekt för tydlighet

Ändringen är ca 5 rader kod — varningen går från statisk text till en länk.

