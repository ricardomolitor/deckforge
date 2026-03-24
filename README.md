# 🎯 DeckForge

**AI-powered presentation platform — 7 creative agents craft killer slide decks from a simple briefing.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ What is DeckForge?

DeckForge is an AI presentation platform that turns a simple briefing into a professional slide deck. Instead of a single AI call, it uses a **pipeline of 7 specialized agents** — each with a vivid persona — that collaborate to produce slides that rival top consulting firms.

**Inspired by** [Gamma.app](https://gamma.app) (50M+ users), Beautiful.ai, and Slidebean — but with the power of multi-agent orchestration.

---

## 🤖 The 7 Agents

| # | Agent | Persona | Role |
|---|-------|---------|------|
| 1 | **Content Planner** 📋 | Senior McKinsey Consultant | Decides slide structure creatively — splits, expands, adds section breaks |
| 2 | **Researcher** 🔍 | Obsessive Data Analyst | Finds specific stats, benchmarks, and trends with sources |
| 3 | **Copywriter** ✍️ | Premium Writer (Apple/Nike quality) | Punchy titles, compelling narratives, zero filler text |
| 4 | **Designer** 🎨 | Senior Designer (Pentagram/IDEO) | Visual hierarchy, design system, color palettes |
| 5 | **Storyteller** 🎭 | TED Talk Coach | Speaker notes with dramatic pauses, audience engagement cues |
| 6 | **Quality Reviewer** 🔎 | Implacable QA Director | Catches inconsistencies, gives specific fix instructions |
| 7 | **Finalizer** 🏁 | Executive Producer | Merges all outputs into a polished, consistent final deck |

---

## 🚀 Features

- **🎯 Smart Briefing** — Describe your presentation goal, audience, tone, and duration
- **📊 10+ Templates** — Quick-start with pre-configured categories (Executive Report, Sprint Review, Sales Pitch, etc.)
- **📎 Reference Materials** — Upload documents to enrich AI context
- **📄 PPTX Template Upload** — Upload an existing PowerPoint as inspiration (AI will expand and improve it)
- **⚡ Real-time Pipeline** — Watch each agent work in sequence with live progress
- **📥 PPTX Export** — Download as PowerPoint (template-based clone or programmatic generation)
- **🎨 Slide Preview** — Visual preview of all slides before export

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.4 |
| Styling | Tailwind CSS 3.4 |
| State | Zustand 4.5 |
| PPTX Export | pptxgenjs + JSZip (template cloning) |
| PPTX Import | JSZip (client-side parsing) |
| AI Backend | Cockpit BR MCP (JSON-RPC 2.0) |
| Icons | Lucide React |

---

## 📦 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** or **yarn**
- Access to **Cockpit BR MCP** (for AI agent execution)

### Installation

```bash
# Clone the repository
git clone https://github.com/ricardomolitor/deckforge.git
cd deckforge

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local` with your credentials:

```env
# Cockpit BR MCP Server
COCKPIT_MCP_URL=https://mcp-agent.br.avanade.ai/mcp
COCKPIT_MCP_API_KEY=your-mcp-api-key
COCKPIT_API_KEY=your-cockpit-api-key
COCKPIT_LICENSE_ID=your-license-id
COCKPIT_NAMESPACE_ID=your-namespace-id
COCKPIT_UTILITY_AGENT_ID=your-utility-agent-id

# App
NEXT_PUBLIC_APP_NAME=DeckForge
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Running

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

The app will be available at **http://localhost:3002**.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing / redirect
│   ├── dashboard/page.tsx    # Dashboard with templates & agent showcase
│   ├── forge/page.tsx        # Main forge — briefing → agents → slides
│   └── api/
│       ├── agents/
│       │   ├── run/route.ts      # Run single agent via MCP
│       │   └── health/route.ts   # Health check
│       └── export/
│           ├── pptx/route.ts           # Programmatic PPTX export
│           └── pptx-template/route.ts  # Template-based PPTX export
├── components/
│   ├── layout/AppLayout.tsx  # App shell with sidebar
│   └── ui/index.tsx          # Reusable UI components
└── lib/
    ├── agents.ts             # 7 agent definitions, prompts, personas
    ├── mcp-client.ts         # Cockpit BR MCP client (JSON-RPC 2.0)
    ├── forge-store.ts        # Zustand store
    ├── export-pptx.ts        # Client-side export helpers
    ├── parse-pptx.ts         # Client-side PPTX parser
    └── types.ts              # Shared TypeScript types
```

---

## 🔄 How the Pipeline Works

```
Briefing + References + Template (optional)
    │
    ▼
┌─────────────────┐
│ Content Planner  │ → Decides slide structure, titles, flow
└────────┬────────┘
         ▼
┌─────────────────┐
│   Researcher     │ → Enriches with data, stats, benchmarks
└────────┬────────┘
         ▼
┌─────────────────┐
│   Copywriter     │ → Writes compelling copy for each slide
└────────┬────────┘
         ▼
┌─────────────────┐
│    Designer      │ → Defines visual system, layouts, colors
└────────┬────────┘
         ▼
┌─────────────────┐
│   Storyteller    │ → Adds speaker notes, narrative arc
└────────┬────────┘
         ▼
┌─────────────────┐
│ Quality Reviewer │ → Reviews everything, gives fix instructions
└────────┬────────┘
         ▼
┌─────────────────┐
│    Finalizer     │ → Merges all into final polished deck
└────────┬────────┘
         ▼
    Final Slides → Preview → PPTX Export
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Ricardo Molitor da Silva** — [@ricardomolitor](https://github.com/ricardomolitor)

---

<p align="center">
  <strong>DeckForge</strong> — Powered by 7 AI Agents 🤖✨
</p>
