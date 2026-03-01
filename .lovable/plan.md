
# Template Revision: Upgrade All Templates with New Blocks

## Summary
Systematic upgrade of all 9 starter templates to incorporate the 4 new block types (Bento Grid, Featured Carousel, Section Divider, Parallax Section) where they add real design value. Plus documentation updates.

---

## Template-by-Template Analysis & Changes

### 1. FlowWink Platform (Primary -- needs most attention)

**Home page:**
- Replace the flat `features-modules` block (13 features in a 4-col grid) with a **Bento Grid** showcasing the 6 most important modules with icons, accent colors, and mixed span sizes (wide for CMS, large for AI Chat)
- Add a **Section Divider** (wave) between Hero+Chat section and the Stats section for visual separation
- Add a **Section Divider** (curved) before the Pricing section
- Replace or supplement `features-pillars` (Head/FlowWink/Headless) with a **Parallax Section** featuring a background image and the three pillars as overlay text

**Features page:**
- Add **Section Dividers** between major content sections (Editorial Workflow, Knowledge Base, etc.)
- Add a **Bento Grid** for the "Built for Every Role" section as an alternative visual to tabs

**Blocks showcase page (/blocks):**
- Add examples of all 4 new blocks: Bento Grid, Featured Carousel, Section Divider, Parallax Section
- Update stats from "43+" to "47+" block types

**Demo page:** No changes needed (functional demos, not design showcase)

---

### 2. Momentum (Single-page, dark YC-style)

- Replace `link-grid-1` (6 features) with a **Bento Grid** using `glass` variant -- perfect fit for dark, modern aesthetic with asymmetric layout
- Add a **Section Divider** (diagonal, using dark colors) between Hero and Stats for dramatic transition
- Add a **Parallax Section** between the two Two-Column blocks as a visual break with a dark tech image

---

### 3. LaunchPad (Startup SaaS)

- Add **Section Divider** (wave) between Hero and Stats for polished flow
- Replace the single `two-col-1` on the home page with a **Featured Carousel** showing 3 feature highlights with images and CTAs (Built for Speed, Security First, Scale Without Limits)
- Add a **Bento Grid** on the Product page to replace the 6-item features grid with a more visually interesting asymmetric layout

---

### 4. TrustCorp (Enterprise)

- Add **Section Divider** (curved) between Hero and Logos for premium feel
- Replace `link-grid-1` with a **Bento Grid** using `bordered` variant for the professional enterprise aesthetic
- Add a **Parallax Section** before the Certifications section with a corporate building/skyline image

---

### 5. SecureHealth (Healthcare/Compliance)

- Add **Section Divider** (wave, soft blue) between major sections for clinical, clean transitions
- Add a **Bento Grid** for compliance certifications/features as an upgrade from simple badge/feature blocks
- Keep overall conservative design -- minimal use of new blocks to maintain trust/credibility aesthetic

---

### 6. HelpCenter

- Add **Section Divider** (curved) between KB search and FAQ sections
- No Bento Grid or Carousel -- this template should stay focused and minimal for support UX

---

### 7. ServicePro (Service Business)

- Add a **Featured Carousel** for service showcases -- rotating slides showing different services with images and booking CTAs
- Add **Section Dividers** (wave) between major content sections
- Add a **Parallax Section** with team/workshop image before the testimonials

---

### 8. Digital Shop (E-commerce)

- Add a **Featured Carousel** as a hero-adjacent element -- rotating product category banners with "Shop Now" CTAs
- Add **Section Dividers** (gradient) between product sections and features
- Add a **Bento Grid** for "Why Choose Us" features to replace flat feature cards

---

### 9. FlowWink Agency

- Add a **Bento Grid** for agency benefits (White Label, Unlimited Sites, Zero Fees, Full API) with mixed spans
- Add **Section Dividers** between major sections
- Add a **Featured Carousel** for client case studies / portfolio slides

---

## Documentation Updates

### docs/TEMPLATE-AUTHORING.md
- Add block reference entries for all 4 new blocks:
  - `parallax-section` with backgroundImage, title, subtitle, height, overlayOpacity
  - `bento-grid` with items array, columns, variant, gap
  - `section-divider` with shape, color, bgColor, height, flip, invert
  - `featured-carousel` with slides array, autoPlay, interval, height, transition
- Update the "16 Modules" overview table (if block count reference exists)
- Update block count references from "43+" to "47+"

---

## Technical Details

### Files to modify:
1. **`src/data/starter-templates.ts`** -- All template page block arrays (bulk of work)
2. **`docs/TEMPLATE-AUTHORING.md`** -- Add 4 new block type references
3. **`src/data/starter-templates.ts`** -- Update any "43+" references to "47+"

### Block count references to update:
- FlowWink Platform: `stats-hero` item "43+ Block Types" -> "47+"
- FlowWink Platform: `stats-blocks` item "43+ Content Blocks" -> "47+"
- FlowWink Platform: Features tab "43+ Blocks" text references

### Design principles:
- Section Dividers: Use sparingly (1-3 per home page) to avoid visual noise
- Bento Grid: Best suited to replace flat feature grids with 4+ items
- Featured Carousel: Use for hero-adjacent showcases or service highlights
- Parallax Section: Maximum 1 per page for impact, never consecutive
- Respect each template's existing aesthetic (dark for Momentum, conservative for SecureHealth, etc.)
