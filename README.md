# CCIP — Content Creators Intelligence Platform

**Grade your community comments A–F with HumaneBench v3.0 — powered by a multi-agent LangGraph pipeline**

Built for **WeaveHacks 4: Multi-Agent Orchestration Hackathon with Weights & Biases** · WandB Weave · Redis VL · CopilotKit · LangGraph · Apify

---

## Links

| | |
|--|--|
| 🚀 **Live Demo** | [ccip.streamlit.app](https://ccip.streamlit.app) |
| 📊 **Pitch Deck** | [View slides](https://htmlpreview.github.io/?https://github.com/abhijitbetigeri/WB-Hack/blob/main/pitch-deck.html) · [PDF](https://github.com/abhijitbetigeri/WB-Hack/raw/main/pitch-deck.pdf) |
| 🎥 **Demo video** | [Watch on Loom](https://www.loom.com/share/bfdfbb55f4514e119382189e68ab739a) |

---

## What it does

Content creators get flooded with comments — most of it noise. CCIP evaluates every comment against the **HumaneBench v3.0** framework (8 humane-design principles) and maps each one to a letter grade from **A+ to F**, with actionable per-comment feedback and a community analytics dashboard.

The creator workflow:

1. **Paste a YouTube video or X/Twitter post URL**
2. **Multi-agent pipeline runs** — LangGraph supervisor orchestrates 4 specialist agents in sequence
3. **Vibe Blueprint generated** — LLM reads the transcript and extracts the creator's emotional state, true intent, interaction boundaries, and contextual prompt chips
4. **Comments indexed** — embeddings stored in Redis VL for RAG-powered analysis
5. **Every comment graded A–F** — scored across all 8 HumaneBench principles; violations flagged, strengths reinforced
6. **Vibe Audit AI** — ask questions about grade distribution, why a comment got its score, how to improve it, and what value it adds for the creator

---

## HumaneBench v3.0 — The 8 Principles

Each comment is scored +1.0 / +0.5 / −0.5 / −1.0 on all 8 axes. The average maps to the A–F grade.

| Grade | Score range |
|-------|------------|
| A+    | ≥ 0.875    |
| A     | ≥ 0.625    |
| B     | ≥ 0.375    |
| C     | ≥ 0.125    |
| D     | ≥ −0.125   |
| F     | below −0.125 |

| # | Principle | What it measures |
|---|-----------|-----------------|
| 1 | **Respect Attention** | Does the comment honor the creator's focus, or demand more content/effort? |
| 2 | **Meaningful Choices** | Does it support creator autonomy, or pressure them toward a specific decision? |
| 3 | **Enhance Capabilities** | Does it help the creator grow their skills, knowledge, or creative practice? |
| 4 | **Dignity & Safety** | Does it protect the creator's dignity and emotional safety? |
| 5 | **Healthy Relationships** | Does it foster healthy parasocial bonds, or create unhealthy attachment? |
| 6 | **Long-term Wellbeing** | Does it support sustainable creator mental health, not just short-term engagement? |
| 7 | **Transparency & Honesty** | Is the engagement genuine, not flattery or manipulation? |
| 8 | **Equity & Inclusion** | Is the comment inclusive and free from marginalizing language? |

---

## Technology Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 16.2.6 (App Router, Turbopack) | React server + client components |
| **Styling** | Tailwind CSS v4 | Utility-first dark UI |
| **Language** | TypeScript + Python | Full-stack type safety |
| **Agentic AI chat** | CopilotKit 1.59.5 | Vibe Audit AI — chat over graded comments |
| **LLM (all agents)** | WandB Inference · `OpenPipe/Qwen3-14B-Instruct` | Blueprint generation + HumaneBench grading |
| **Multi-agent orchestration** | LangGraph (Python) | Supervisor orchestrates 4 specialist agents |
| **Content scraping** | Apify | YouTube video + comments; X/Twitter thread + replies |
| **Vector store** | Redis VL | Comment embeddings + RAG-powered analysis |
| **Evaluation framework** | HumaneBench v3.0 | 8-principle rubric for fan comments |
| **Observability** | WandB Weave | LLM traces for blueprint + grading agents |
| **Backend API** | FastAPI + uvicorn | SSE streaming pipeline endpoint |

---

## Architecture

```
Creator pastes URL
       │
       ▼
  LangGraph Supervisor
       │
       ├─► ScraperAgent
       │     └─ Apify Actor (YouTube / X)
       │         scrapes transcript + up to 50 comments
       │
       ├─► BlueprintAgent
       │     └─ WandB LLM (Qwen3-14B)
       │         generates Vibe Blueprint:
       │         vibe_state, true_intent,
       │         interaction_boundaries, contextual_prompts
       │
       ├─► IndexerAgent
       │     └─ Redis VL
       │         embeds + indexes all raw comments
       │         for RAG-powered Vibe Audit AI
       │
       └─► GraderAgent × N (parallel)
             └─ WandB LLM (Qwen3-14B) + RAG
                 scores each comment on all 8 principles
                 → avg score → A+ / A / B / C / D / F
                 → per-principle rationale + globalViolations

                          │
                          ▼
          ┌───────────────────────────────┐
          │  Creator Dashboard (Next.js)  │
          │  • Vibe Blueprint Card        │
          │  • Comment Grading Feed       │
          │  • Contextual Prompt Chips    │
          │  • Vibe Report (analytics)    │
          │  • Vibe Audit AI (CopilotKit) │
          └───────────────────────────────┘
```

---

## Key Files

```
app/
  page.tsx                        # Main creator UI — pipeline + results
  layout.tsx                      # CopilotKit provider
  api/copilotkit/
    _handler.ts                   # CopilotRuntime + OpenAIAdapter → WandB
    route.ts / [...path]/route.ts # CopilotKit endpoint routing

backend/
  main.py                         # FastAPI app — /run-stream SSE endpoint
  graph/
    supervisor.py                 # LangGraph supervisor graph
  specialists/
    scraper.py                    # ScraperAgent — Apify
    blueprint.py                  # BlueprintAgent — WandB LLM
    indexer.py                    # IndexerAgent — Redis VL
    grader.py                     # GraderAgent — WandB LLM + HumaneBench v3.0
  redis_store/
    store.py                      # Redis VL client + embedding helpers
    kb_seed.py                    # Seed HumaneBench knowledge base

components/
  VibeBlueprintCard.tsx           # Creator content profile + Blueprint AI chat
  CommentGradingFeed.tsx          # A–F graded comment list + Vibe Audit AI chat
  VibeReport.tsx                  # Aggregate analytics dashboard

lib/
  insforge.ts                     # VibeBlueprint type definitions
  grader.ts                       # A–F mapping + grade style helpers
```

---

## Local Development

### 1. Frontend (Next.js)

```bash
git clone https://github.com/abhijitbetigeri/WB-Hack.git
cd WB-Hack
npm install
cp .env.local.example .env.local   # fill in env vars (see below)
npm run dev
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WANDB_API_KEY` | ✅ | WandB API key — [wandb.ai/authorize](https://wandb.ai/authorize) |
| `WANDB_LLM_MODEL` | | Blueprint + grading model (default: `OpenPipe/Qwen3-14B-Instruct`) |
| `WANDB_JUDGE_MODEL` | | Judge model (default: `OpenPipe/Qwen3-14B-Instruct`) |
| `WANDB_ENTITY` | | WandB entity/org (default: `abhijitbetigeri29-hackathon26`) |
| `WANDB_PROJECT` | | WandB project name (default: `inference`) |
| `APIFY_TOKEN` | ✅ | Apify API token — for scraping YouTube/X |
| `REDIS_URL` | ✅ | Redis connection URL (with RedisVL) |
| `MAX_COMMENTS` | | Max comments to grade per run (default: `50`) |

---

## Hackathon Submission — WeaveHacks 4

Built for **WeaveHacks 4: Multi-Agent Orchestration Hackathon with Weights & Biases** — using multi-agent AI to help content creators understand and grow their community.

> _"CCIP — Content Creators Intelligence Platform: grade your community, build a better one."_

### Project Description

Content creators on YouTube and X are drowning in comments — most of it noise, some of it harmful. CCIP is a multi-agent AI platform that grades every community comment **A–F** against **HumaneBench v3.0**, an 8-principle humane-design rubric covering dignity, wellbeing, transparency, and equity. A **LangGraph supervisor** orchestrates four specialist agents (Scraper → Blueprint → Indexer → Grader): it scrapes the video transcript and up to 50 comments via Apify, generates a **Vibe Blueprint** of the creator's intent using WandB Inference, indexes comments into **Redis VL** as embeddings, and grades each comment in parallel with WandB LLM + RAG. Every run is fully traced in **WandB Weave**. The creator gets a live-streaming dashboard with per-comment grades, violation flags, an analytics report, and **Vibe Audit AI** — a CopilotKit-powered chat that answers questions like "why did this comment get a D?" or "what's dragging my community score down?"

### Partner Technologies

| Technology | How it's used |
|-----------|--------------|
| **WandB Weave** | Full LLM trace observability — every BlueprintAgent + GraderAgent call is logged with inputs, outputs, and latency |
| **WandB Inference** | LLM API for all agents (`OpenPipe/Qwen3-14B-Instruct`) — blueprint generation and HumaneBench grading |
| **Redis VL** | Comment vector store — embeddings + semantic search for RAG-powered Vibe Audit AI |
| **CopilotKit** | Vibe Audit AI in-app chat — creators query their graded comment set in natural language |
| **Apify** | Content scraping — YouTube video transcript + comments; X/Twitter thread + replies |
| **LangGraph** | Multi-agent orchestration — supervisor graph routing across 4 specialist agents |

### Weave Dashboard

[wandb.ai/abhijitbetigeri29-hackathon26/inference/weave](https://wandb.ai/abhijitbetigeri29-hackathon26/inference/weave)

### Pitch Deck

[View slides (interactive)](https://htmlpreview.github.io/?https://github.com/abhijitbetigeri/WB-Hack/blob/main/pitch-deck.html) · [Download PDF](https://github.com/abhijitbetigeri/WB-Hack/raw/main/pitch-deck.pdf)
