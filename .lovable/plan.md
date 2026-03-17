

## Problem

The `/demo` page promises "Experience FlowPilot Live" but shows mostly empty states — no booking services, empty cart, no webinars. It feels hollow instead of creating a "wow" effect. The page needs visual proof of what FlowPilot looks like from the inside.

## Recommendation

**Combine both: a hero walkthrough video + annotated screenshot gallery.** Here is why:

- A **YouTube embed** (or Loom) right after the hero gives an immediate "show don't tell" moment — a 2-3 min screen recording of the admin dashboard, FlowPilot operating, leads flowing in, etc.
- A **gallery/bento grid** with annotated screenshots of key admin views (Copilot chat, Lead pipeline, Skill Hub, Objectives, Activity feed) provides scannable proof for people who won't watch a video.
- The existing interactive blocks (booking, products, chat) can stay below as a secondary "try it yourself" section, but they need the visual context first.

## Plan

### 1. Add a product walkthrough video block after the hero

Insert a `youtube` block right after `hero-demo` with a placeholder URL (you'll replace with a real Loom/YouTube recording of FlowPilot in action).

### 2. Add an annotated screenshot gallery

Insert a `gallery` block (or `bento-grid`) with 4-6 images showing:
- FlowPilot Copilot chat in action
- Lead pipeline with AI enrichment
- Skill Hub / Automations dashboard  
- Objectives decomposition view
- Activity feed with autonomous actions

These would use placeholder image URLs that you replace with real screenshots.

### 3. Add a features/stats block as social proof bridge

Before the interactive modules, add a `stats` block with key numbers (e.g. "22 Modules", "15+ Skills", "7-Step Reasoning Loop", "Zero Manual Steps") to bridge the visual proof into the hands-on section.

### 4. Restructure the page flow

New block order:
1. **Hero** (keep, tighten copy)
2. **YouTube video** — "See FlowPilot operate in 3 minutes" (NEW)
3. **Gallery/Bento** — Admin screenshots with captions (NEW)
4. **Stats** — Key numbers (NEW)
5. **Separator** — "Try It Yourself"
6. **Existing interactive blocks** (booking, products, chat, KB, etc.)
7. **Info-box** (autonomous pipeline)
8. **CTA** (keep)

### 5. File changes

Only one file: `src/data/templates/flowwink-platform.ts` — insert 3 new blocks into the demo page's `blocks` array after the hero block.

### Content you'll need to provide

- A screen recording (YouTube/Loom URL) of the admin dashboard and FlowPilot in action
- 4-6 screenshots of key admin views (upload via chat or provide URLs)

I can set up the blocks with placeholder content now and you swap in real media afterward.

