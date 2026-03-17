

## Problem

The FlowWink home page currently links to `/demo` and `/pricing` via CTAs, but there's no natural pathway guiding visitors to the **Features** (`/features`) or **FlowPilot** (`/flowpilot`) pages. Visitors who scroll the home page never get nudged toward the deep-dive content.

## Current Home Page Link Audit

| Block | Links to |
|-------|----------|
| Announcement bar | `/features` |
| Hero CTA | `#chat-hero-usp` (anchor) |
| Hero secondary | GitHub |
| CTA Final | `/demo` + `/pricing` |
| Floating CTA | `/demo` |

**Missing**: No inline links to `/features`, `/flowpilot`, or `/blocks` within the flow itself.

## Plan: Add Contextual Cross-Links

Insert `quick-links` blocks and update existing blocks to weave visitors toward the right page at the right moment in the scroll journey:

### 1. After the Timeline ("How FlowPilot Works") — link to Features + FlowPilot

Add a **quick-links** block after `timeline-how` (around line 144) with links like:
- "Deep Dive: Features" → `/features`
- "Meet FlowPilot" → `/flowpilot`
- "Try It Live" → `/demo`

This is the natural moment: the visitor just learned the 3-step loop and wants to go deeper.

### 2. After the Bento Grid ("The Autonomous Loop") — link to FlowPilot page

Add a **quick-links** block after `bento-agent-brain` (around line 166) with:
- "Explore FlowPilot" → `/flowpilot`
- "See the A2A Protocol" → `/flowpilot#a2a` (or `/flowpilot`)
- "View All 58+ Blocks" → `/blocks`

The bento grid talks about skills, memory, and A2A — the FlowPilot page goes deeper on all of these.

### 3. After Testimonials / Social Proof — link to Pricing + Features

Add a **quick-links** block after `badge-trust` (around line 260) with:
- "Compare Features" → `/features`
- "View Pricing" → `/pricing`
- "Self-Host Free" → GitHub

This is the trust/conversion zone — visitors are ready to evaluate seriously.

### 4. Update the Parallax block CTA text

The parallax block ("Not a Chatbot. An Operator.") currently has no button. This is a missed opportunity. However, `parallax-section` blocks may not support buttons, so the quick-links block placed after the bento grid (point 2) serves this purpose instead.

### Summary of Changes

**File**: `src/data/templates/flowwink-platform.ts`

Insert 3 new `quick-links` blocks into the home page's `blocks` array:
1. After `timeline-how` — "Explore deeper" links to Features, FlowPilot, Demo
2. After `bento-agent-brain` — "Go deeper on the agent" links to FlowPilot, Blocks
3. After `badge-trust` — "Evaluate" links to Features, Pricing, GitHub

Each uses variant `dark` or `muted` with `split` layout for visual contrast. No new components needed — `QuickLinksBlock` already exists and renders correctly.

