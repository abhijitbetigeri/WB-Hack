# CCIP — Content Creators Intelligence Platform

**Grade your community comments A–F with HumaneBench v3.0 — powered by a multi-agent LangGraph pipeline**

Built for **WeaveHacks 4: Multi-Agent Orchestration Hackathon with Weights & Biases** · WandB Weave · Redis VL · CopilotKit · LangGraph · Apify

---

## Links

| | |
|--|--|
| 🚀 **Live Demo** | [ccip.streamlit.app](https://ccip.streamlit.app) |
| 📊 **Pitch Deck** | [View slides](https://htmlpreview.github.io/?https://github.com/abhijitbetigeri/WB-Hack/blob/main/pitch-deck.html) |
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
git clone https://github.com/abhijitbetigeri/Syntropimaxx.git
cd Syntropimaxx
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

## Hackathon

Built for the **Applied Intelligence Hackathon 2026** — using multi-agent AI to help content creators understand and grow their community.

> _"CCIP — Content Creators Intelligence Platform: grade your community, build a better one."_
