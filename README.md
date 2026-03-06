# FlowWink

**Your Website Runs Itself** — The first autonomous agentic CMS powered by FlowPilot.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker Image](https://img.shields.io/badge/Docker-ghcr.io-blue)](https://github.com/magnusfroste/flowwink/pkgs/container/flowwink)

## What is FlowWink?

FlowWink is the first autonomous agentic CMS — an open-source platform where an AI agent called **FlowPilot** operates your entire online presence. You set objectives. FlowPilot executes.

- ✅ **Autonomous Operations** — FlowPilot writes content, qualifies leads, sends campaigns, and books meetings
- ✅ **Self-Hosted & Private** — Your agent, your data, your AI — on your infrastructure
- ✅ **Replaces 4 Products** — CMS + Chatbot + CRM + Marketing Automation in one
- ✅ **GDPR by Architecture** — Private LLM support, no third-party data transfers
- ✅ **Self-Evolving** — FlowPilot learns from every interaction and creates new skills

### The Autonomous Loop

FlowPilot operates in a continuous cycle — no manual intervention required:

```
┌───────────────────────────────────────────────────────┐
│                  THE AUTONOMOUS LOOP                   │
│                                                       │
│  Heartbeat → Reflect → Plan → Execute → Log → Learn  │
│       ↑                                        │      │
│       └────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────┘
```

**Every 12 hours**, FlowPilot reviews what happened, evaluates performance against your objectives, plans next actions, and executes — logging everything for your review.

### Six Core Capabilities

| Capability | Description |
|-----------|-------------|
| **Skill Engine** | 20+ registered tools, self-creating new ones |
| **Persistent Memory** | Learns preferences, remembers context, stores brand guidelines |
| **Objectives** | Goal-driven operations with progress tracking |
| **Autonomous Heartbeat** | 12-hour reflection cycles |
| **Signal Automations** | Event-driven reactions (form → qualify lead → send email) |
| **Self-Evolution** | Modifies own instructions, proposes new skills |

### Six Channels, One Agent

```
FlowPilot operates across all channels natively:

Content & Blog ──── writes, schedules, publishes, optimizes
Visitor Chat ────── answers questions, qualifies leads, escalates
CRM ─────────────── captures, scores, enriches, manages leads
Email ───────────── newsletters, drip sequences, confirmations
Bookings ────────── schedules, confirms, follows up
E-Commerce ──────── products, orders, recommendations
```

## Features

### Content Management
- **46+ block types** — Text, images, galleries, accordions, CTAs, booking, and more
- **Drag & drop** — Reorder blocks visually
- **Rich text editor** — Powered by Tiptap with AI Text Assistant (Cmd+J)
- **Media library** — With automatic WebP optimization

### FlowPilot Agent
- **Skill Engine** — 20+ skills with approval gating and scope control
- **Persistent Memory** — Brand guidelines, preferences, learned patterns
- **Objectives** — Goal-driven autonomous operations
- **Signal Automations** — Event-driven skill execution
- **Activity Feed** — Complete audit trail of all autonomous actions

### Blog Module
- **Full blog engine** — Posts, categories, tags, and author profiles
- **SEO optimized** — Meta tags, reading time, featured images
- **Editorial workflow** — Draft → Review → Published with scheduling
- **RSS feed** — Auto-generated feed for subscribers

### CRM & Lead Management
- **Lead scoring** — Automatic scoring based on behavior
- **AI qualification** — FlowPilot qualifies leads 24/7
- **Deal pipeline** — Kanban board with stage tracking
- **Company enrichment** — AI-powered data enrichment from domain

### Newsletter
- **Subscriber management** — Double opt-in, GDPR-compliant
- **Email campaigns** — Create and send newsletters
- **Analytics** — Open rates, click tracking, engagement metrics
- **Signal automations** — Welcome sequences triggered automatically

### Integration Module
- **Webhook system** — Trigger on page, blog, form, and newsletter events
- **N8N templates** — Pre-built workflows for common automations
- **Content API** — REST and GraphQL for multi-channel delivery
- **Delivery logs** — Track webhook success/failure with retry support

### Editorial Workflow
- **Roles** — Writer, Approver, Admin
- **Approval flow** — Draft → Review → Published (FlowPilot respects this)
- **Version history** — Track and restore changes (manual and autonomous)
- **Scheduled publishing** — Set it and forget it

### AI Features
- **FlowPilot** — Autonomous agent with skills, memory, and objectives
- **AI Chat** — Multi-provider support (OpenAI, Gemini, Local LLM, N8N)
- **AI Text Assistant** — Generate, improve, translate content inline
- **AI Brand Analysis** — Extract colors and fonts from any URL
- **Knowledge Base** — Your content becomes AI context

### Compliance & Security
- **GDPR** — Audit logging, cookie consent, privacy by design
- **WCAG 2.1 AA** — Accessibility built into every component
- **Row Level Security** — Powered by Supabase RLS
- **Approval Gating** — Human oversight for sensitive autonomous actions
- **Private AI** — Self-hosted LLM support for complete data sovereignty

### Content API
- **REST API** — `/content-api/pages`, `/content-api/page/:slug`
- **GraphQL** — Full schema for flexible queries
- **Edge caching** — Fast responses worldwide

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Editor | Tiptap |
| State | TanStack Query |
| AI | OpenAI, Gemini, Local LLM (Ollama/LM Studio/vLLM), N8N |

## Self-Hosting

FlowWink is **free to self-host**. Deploy on your own Supabase instance with full control over your data and AI.

### Quick Start

```bash
# Clone the repository
git clone https://github.com/magnusfroste/flowwink.git
cd flowwink

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations (see docs/SETUP.md)

# Start development server (migrations run automatically)
npm run dev
```

**✨ Auto-Migrations:** Database migrations run automatically when you start the dev server or build for production. No manual migration steps needed!

### Connecting to Your Own Supabase

The entire purpose of this project is to allow you to clone it from GitHub and connect it to **your own Supabase instance**. Here's how:

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com/) and create a new project
   - Note your **project ref** (e.g., `trpejhoieysrwiuhskkm`) from the URL

2. **Get Your Credentials**
   - Go to Supabase Dashboard → Settings → API
   - Copy these three values:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **Anon/Public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
     - **Project ref** → `VITE_SUPABASE_PROJECT_ID`

3. **Set Environment Variables**
   - For local development: Edit `.env` file
   - For deployment: Pass as build arguments (see DEPLOYMENT.md)

4. **Run Setup Script** (optional but recommended)
   ```bash
   ./scripts/setup-supabase.sh
   ```
   This deploys edge functions and runs initial migrations.

**Auto-Migrations:** After initial setup, migrations run automatically when you:
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Pull latest Docker image: migrations included in build

### Detailed Setup

See **[docs/SETUP.md](docs/SETUP.md)** for complete self-hosting instructions including:

- Supabase project setup
- Database migrations
- Edge Functions deployment
- Production deployment

### Database Schema

A complete SQL schema is available at **[supabase/schema.sql](supabase/schema.sql)** — run it in your Supabase SQL Editor to set up a new instance.

## Deployment Options

### Option 1: Docker (Recommended for Self-Hosting)

Deploy with Docker on any platform for complete control and easy upgrades:

```bash
# Pull the latest image
docker pull ghcr.io/magnusfroste/flowwink:latest

# Or use docker-compose (see docs/DEPLOYMENT.md)
docker-compose up -d
```

**What you get:**
- ✅ Easy upgrades (`docker pull` for new versions)
- ✅ Works with Supabase Cloud OR Self-Hosted Supabase
- ✅ Deploy on Easypanel, Railway, Fly.io, or any VPS
- ✅ Your data, your AI, your infrastructure

**Platforms:**
- **Easypanel** — One-click Docker deployment with auto-HTTPS ([Guide](docs/DEPLOYMENT.md))
- **Railway** — Git-based deployment with automatic builds
- **Fly.io** — Global edge deployment
- **VPS** — Any server with Docker (Hetzner, DigitalOcean, etc.)

### Option 2: Static Hosting (Alternative)

Deploy on static hosting platforms with your own Supabase backend:

| Component | Your Choice |
|-----------|-------------|
| **Frontend** | Vercel, Netlify, Cloudflare Pages, or any static host |
| **Backend** | Your own Supabase project (Cloud or Self-Hosted) |
| **AI** | Private LLM (OpenAI, Gemini, Ollama, LM Studio, etc.) |

**Note:** When deploying to Vercel/Netlify, run migrations manually before deployment:
```bash
npx supabase db push
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for complete deployment guides.

**AI Features:** When self-hosting, configure your AI provider (OpenAI, Gemini, Ollama, LM Studio, or N8N) in the admin panel. FlowPilot operates with the same autonomous capabilities regardless of provider.

## Documentation

- **[docs/flowpilot.md](docs/flowpilot.md)** — FlowPilot autonomous agent documentation
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Docker deployment guide (Easypanel, Railway, Fly.io)
- **[docs/SETUP.md](docs/SETUP.md)** — Supabase setup guide
- **[docs/PRD.md](docs/PRD.md)** — Full product documentation

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Made in Sweden 🇸🇪**
