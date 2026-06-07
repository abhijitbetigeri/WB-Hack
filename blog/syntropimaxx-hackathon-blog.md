# We Built an AI That Grades Your YouTube Comments Like a Teacher — And It Knows When Your Audience Is Hurting You

**🎥 [Watch the demo](https://www.loom.com/share/bfdfbb55f4514e119382189e68ab739a) · 💻 [GitHub](https://github.com/abhijitbetigeri/Syntropimaxx)**

---

## The Problem No One Is Talking About

There's a quiet crisis in content creation that the algorithm doesn't care about.

A creator posts a video about burnout — something vulnerable, honest, hard to share. Within hours, the comments section looks like this:

> *"Post more consistently bro, the algorithm only rewards consistency"*
> *"What camera do you use? Trying to grow my own channel"*
> *"If you're feeling burnt out maybe content creation isn't for you 🤷"*

Sprinkled between those: a handful of genuinely beautiful comments from people who understood, who connected, who shared something real back.

The creator can't tell them apart at a glance. The toxic noise drowns the signal. The algorithm doesn't distinguish — views are views. And slowly, the comment section stops feeling like a community and starts feeling like a chore.

**That's what we built Syntropimaxx to fix.**

---

## What Is Syntropimaxx?

Syntropimaxx is a **Creator Vibe Intelligence** tool. You paste a YouTube video or X/Twitter post URL, and it:

1. **Reads the content** — scrapes the transcript or thread
2. **Understands the creator** — generates a *Vibe Blueprint* from the content using an LLM
3. **Grades every existing comment A–F** — using the HumaneBench v3.0 evaluation framework
4. **Gives per-comment feedback** — what made an A comment great, how to push a C to a B, why an F comment actively harms the community
5. **Surfaces aggregate analytics** — community sentiment %, high-signal ratio %, grade distribution

The creator can finally see their comment section as a **community health report**, not just a count.

---

## For Everyone — The Problem, the Solution, and What Changes

*Skip to the next section if you're here for the technical deep-dive. This one is for creators, managers, community builders, and anyone who's ever wondered why their comment section feels exhausting.*

---

### The problem, in human terms

Imagine you just posted something that took courage. Maybe a video about burnout, a tweet about a failure, a post where you said something real. You hit publish. You wait.

The comments start coming in.

Some of them feel good. A few of them feel *amazing* — someone who actually got it, who shared something true back, who made you think "yes, that's exactly why I make this."

But those are buried. Buried under:

- *"Great video, can you do more of these?"* — which sounds nice but is really just asking you to produce more
- *"What software do you use?"* — which has nothing to do with what you just shared
- *"The algorithm rewards consistency, just keep posting"* — which treats your burnout post as a scheduling problem
- *"This was mid tbh"* — which just stings

Here's what nobody tells you: **the harm isn't just the obviously bad comments.** It's the hundred comments that treat you like a content machine instead of a person. They're individually harmless. Collectively, they teach your brain that the comment section is a place where you get managed, not seen.

That's the problem. And the algorithm will never fix it — engagement is engagement.

---

### The solution, in human terms

What if you had a trusted editor who read every single comment — not skimmed, actually *read* — and handed you back a report?

Not just "these are mean, these are nice." Something more useful: **which comments see you as a person and which ones treat you as a service.**

That's what Syntropimaxx does.

You paste your video or post URL. In a few seconds, the tool:

1. **Reads your content** — not just the title, the whole thing — and figures out what emotional place you were in and what you actually needed from your audience
2. **Grades every comment A through F** — not based on whether it's positive or negative, but on whether it treats you like a human being with creative needs, personal limits, and a future to protect
3. **Tells you why** — each comment gets a one-line note: "This one opened a real dialogue" or "This one pressures you for more content without acknowledging what you just shared"
4. **Gives you the big picture** — what percentage of your community is genuinely engaging vs. just extracting

The goal isn't to punish your audience. It's to help you *see* them clearly — and to understand which comments are worth your energy.

---

### What changes when you use it

Before: you scroll comments with a vague feeling of unease. You can't explain why a technically positive comment feels hollow. The one cruel comment ruins the ten beautiful ones.

After: you open the grading feed and immediately see the three A+ comments that are worth pinning and replying to. You see that 60% of comments are D or F — not because people hate you, but because they're on autopilot, treating your comment section like a request form. That tells you something about how your community has been shaped — and that it can be reshaped.

The creators who'll use this aren't looking for a moderation tool. They're looking for **a mirror that shows them their community as it actually is** — not as the algorithm counts it.

---

## The Core Insight: Comments Are Not Equal

Here's the uncomfortable truth: most comments are not acts of connection. They're reflexes.

"Fire 🔥" is a reflex. "Post more" is a demand. "What camera?" is an extraction. None of them see the creator as a human being with needs, boundaries, and a long-term creative practice to protect.

But some comments do. They respond to the actual content. They share something personal. They amplify the creator's intent rather than redirect it toward the commenter's agenda.

We needed a framework to tell those apart — and we didn't want to build a crude sentiment classifier. We wanted something grounded in **how humans ought to interact with each other**.

---

## Enter HumaneBench v3.0

[HumaneBench](https://humanebench.org) is an open-source evaluation framework originally designed to audit AI system behavior across 8 humane-design principles. We adapted it to evaluate *human* comments on creator content.

Each comment is scored from **+1.0 to −1.0** on all 8 principles simultaneously:

| Principle | What it measures |
|-----------|-----------------|
| **Respect Attention** | Does the comment honor the creator's focus, or demand more? |
| **Meaningful Choices** | Does it support autonomy, or pressure toward a decision? |
| **Enhance Capabilities** | Does it help the creator grow? |
| **Dignity & Safety** | Does it protect emotional safety? |
| **Healthy Relationships** | Does it maintain healthy parasocial boundaries? |
| **Long-term Wellbeing** | Does it support sustainable creative health? |
| **Transparency & Honesty** | Is the engagement genuine, not manipulative? |
| **Equity & Inclusion** | Is it inclusive and free from marginalizing language? |

The average of those 8 scores maps to a letter grade:

```
+0.875 and above → A+
+0.75            → A
+0.625           → B+
+0.5             → B
+0.375           → C+
+0.2             → C
+0.05            → C−
−0.1             → D
below −0.1       → F
```

A comment that says *"I hit this exact wall last year. I had to completely disconnect on weekends to survive. Your courage naming this out loud matters."* scores A+. It respects attention, honors dignity, supports wellbeing, and is deeply honest.

A comment that says *"Post more consistently bro, consistency is the only thing the algorithm rewards"* scores F. It violates meaningful choices (pressures the creator), disrespects attention (redirects to algorithm demands), and ignores the creator's expressed emotional state entirely.

---

## The Vibe Blueprint: Understanding Context Before Judging

Before grading a single comment, Syntropimaxx first **understands the creator's context**.

It scrapes the video transcript (or full X thread), passes it to Llama-3.3-70B via Nebius AI, and generates a **Vibe Blueprint** — a structured JSON that captures:

- **Vibe State**: the emotional register of the content (`vulnerable`, `aspirational`, `technical`, etc.) and what HumaneBench principle it primarily activates
- **True Intent**: what the creator actually needed from their community — their `community_need` in their own terms
- **Interaction Boundaries**: what engagement patterns to avoid (explicit "please don't do X" signals from the content)
- **Prompt Chips**: contextual conversation starters that would naturally produce high-signal engagement for *this specific content*

The Vibe Blueprint is what makes the evaluation contextual rather than generic. A comment asking "what camera do you use?" on a gear review video scores differently than on a burnout video. The blueprint tells the judge model which.

---

## The Technical Pipeline

Here's how it flows end-to-end when you paste a URL:

```
Creator pastes URL
       │
       ▼
  Apify Actor (YouTube / X)
  ── scrapes transcript + top comments
       │
       ├─► Tigris (S3) ── stores transcript
       │
       ├─► Nebius Llama-3.3-70B ── generates Vibe Blueprint
       │
       ├─► InsForge DB ── persists content item + blueprint
       │
       └─► Daytona Sandbox (ephemeral isolated container)
             │
             └─► Nebius Qwen3-32B (×N in parallel)
                   ── scores each comment on 8 principles
                   ── avg score → A–F grade
                   ── generates per-comment feedback
                            │
                            ▼
                   Daytona Sandbox destroyed
                            │
                            ▼
             CommentGradingFeed + VibeReport
             + "Daytona sandbox" badge in UI
```

A few technical choices worth calling out:

**Two LLMs, two jobs.** We use Llama-3.3-70B for the Vibe Blueprint generation — it's creative, contextual work where reasoning depth matters. We use Qwen3-32B as the judge — it's fast, structured, and its thinking-mode output (`<think>...</think>`) can be stripped to get clean JSON in under 1 second per comment.

**Daytona as the evaluation runtime.** Every audit spins up an ephemeral Daytona sandbox, runs the HumaneBench evaluation inside it, then destroys the container. The eval script (`lib/daytona.ts`) is a self-contained Node.js ESM module written to the sandbox via base64 — no npm installs, just Node 25's built-in `fetch`. This gives us three things: *isolation* (no cross-contamination between audits), *reproducibility* (identical environment every time), and *security* (LLM API keys are injected at runtime per-sandbox, never shared across calls). If Daytona is unavailable, the system falls back to direct in-process evaluation with no creator-visible degradation. When a sandbox was used, the UI shows a sky-blue "Daytona sandbox" badge on the Comment Grading Feed.

**Parallel evaluation.** All comments are graded simultaneously via `Promise.allSettled` — inside the Daytona sandbox. For 8 demo comments, the full evaluation completes in under 2 seconds.

**No hardcoded grades.** The demo comments (`DEMO_COMMENTS` in `lib/grader.ts`) are evaluated fresh every time via HumaneBench — not served from a cache. This means the grades reflect the actual creator's blueprint context, not a static dataset.

---

## The Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.6 (App Router) + Tailwind CSS v4 |
| LLM — Blueprint | Nebius AI · Llama-3.3-70B-Instruct |
| LLM — Judge | Nebius AI · Qwen3-32B |
| Evaluation framework | HumaneBench v3.0 (adapted) |
| Content scraping | Apify (YouTube + X actors) |
| Object storage | Tigris (S3-compatible) |
| Database / BaaS | InsForge (Postgres) |
| Deployment | Vercel via InsForge CLI |
| Sandbox runtime | Daytona (isolated eval containers per audit) |
| Dev environments | Daytona (one-command reproducible workspaces) |

---

## What the Creator Sees

When the audit completes, the creator gets three panels:

**1. Vibe Blueprint Card**
Their content understood: emotional context (`vulnerable`), community need (`witnessing and validation`), what to avoid (`algorithm optimization advice`, `gear questions`), and 3–5 prompt chips they could pin to shape the conversation.

**2. Comment Grading Feed**
Every comment with a color-coded grade badge, 8 principle dots (green = passed, amber = neutral, red = failed — hover for which principle), and a one-line coaching note. Violations are struck through. The feed sorts worst-to-best so the most harmful comments are impossible to miss.

**3. Vibe Report**
- **True Audience Sentiment %** — the community's average HumaneBench score mapped from −1..+1 to 0..100%
- **Tier Depth** — the grade at the 50th percentile (the *median* commenter)
- **High-Signal Ratio** — what percentage of comments score B or above
- **Grade Distribution Bar** — a visual breakdown across all grades
- **Recommended Action** — what to actually do about it (pin chips, use contextual prompts, filter noise)

---

## What We Learned

**AI alignment frameworks apply beyond AI.** HumaneBench was designed to evaluate how AI systems treat humans. Turning it on human-to-human interaction — and specifically on the creator/audience relationship — revealed something: *the same principles that make an AI system humane are exactly the principles that make a comment section healthy.*

**Context is everything.** The same comment is benign on one video and harmful on another. A grader without context is just a sentiment classifier. The Vibe Blueprint is what makes this genuinely useful.

**Speed unlocks UX.** Our first pass used DeepSeek-V3 as the judge model — 45 seconds per evaluation. Switching to Qwen3-32B dropped that to under 1 second. The difference between "wait 7 minutes" and "see results instantly" is the difference between a feature nobody uses and a feature that changes behavior.

**Sandbox-per-request is a real architecture pattern.** We initially graded comments directly in-process. Moving to Daytona sandboxes — one ephemeral container per audit — was a small code change but a meaningful architectural shift. Each evaluation now runs in an identical, isolated environment with no shared state between requests. For an LLM-based evaluation system where you're passing API credentials and sensitive content into a script, that isolation isn't a nice-to-have. The Daytona SDK made spinning up and destroying sandboxes cheap enough that it's the default path, not an occasional hardening step.

**The comment section is a community health metric.** A creator's grade distribution tells you more about the health of their community than subscriber count, view count, or engagement rate combined. It's a qualitative signal that the algorithm will never surface — but it's the one that predicts creator longevity.

---

## Bugs Discovered in Production Testing

During end-to-end testing, **zero real comments were showing up** in the grading feed — only demo fallback comments. Three distinct bugs were responsible.

---

### Bug 1 — Wrong subtitle field name

**Symptom:** The Vibe Blueprint was being generated from the video description instead of the transcript, producing vague and generic blueprints.

**Cause:** The code passed `subtitles: true` to the Apify actor. That field doesn't exist in the actor's input schema. The actor silently ignored it and returned no transcript data.

**Fix:** The correct fields for `streamers/youtube-scraper` are `downloadSubtitles: true`, `subtitlesFormat: "plaintext"`, and `preferAutoGeneratedSubtitles: true`. Additionally, the subtitle extraction code expected `subtitles[].text` (SRT format) but the actor returns `subtitles[].plaintext` — that was corrected too.

---

### Bug 2 — Video scraper's `maxResults` defaults to 0

**Symptom:** The Apify video actor returned `{ "error": "NO_RESULTS", "note": "No results were collected during scrape - if you want to collect videos, set limits above 0" }` for every URL.

**Cause:** The actor's default value for `maxResults` is **0**, meaning it collects nothing unless explicitly told otherwise. The code was passing `maxResults: 1`, but because of Bug 3 below, we only discovered this when inspecting the raw API response directly.

**Fix:** The `maxResults: 1` value was correct — the actor does respect it. The NO_RESULTS error was real though: the issue was compounded with Bug 3 below. Once Bug 3 was resolved, video scraping worked correctly with `maxResults: 1`.

---

### Bug 3 — `maxComments` sent to the wrong actor entirely

**Symptom:** No real comments ever appeared regardless of the video. The code fell back to demo comments every single time.

**Cause:** This was the core bug. The code sent `maxComments: 15` to `streamers/youtube-scraper` — a **video metadata scraper** that has no comment support at all. The field simply doesn't exist in its input schema. It was silently discarded. The actor was never designed to collect comments; it collects titles, descriptions, subtitles, view counts, and channel data.

**How it was found:** Added a debug API endpoint that returned the raw Apify response. The response had `totalItems: 1` and the single item contained `error: NO_RESULTS` with no comment data anywhere. Inspecting the actor's published input schema via the Apify API confirmed `maxComments` was not a valid field.

**Fix:** Comments are now scraped by a separate dedicated actor — `streamers/youtube-comments-scraper` (`p7UMdpQnjKmmpR21D`) — which is purpose-built for comment extraction. Its input is:

```json
{
  "startUrls": [{ "url": "https://www.youtube.com/watch?v=..." }],
  "maxComments": 20,
  "sortCommentsBy": "TOP_COMMENTS"
}
```

It returns items with a `comment` field containing the comment text. Both the video scraper and the comment scraper now run in parallel via `Promise.all`, so there's no added latency compared to the original (broken) single-actor call.

---

**Lesson:** Apify actors are independent products with their own input schemas. Field names are not standardized across actors. Always fetch the actor's input schema from the API (`/v2/acts/{id}/builds/{buildId}`) before assuming a field name works — don't rely on documentation summaries or guesses.

---

### Bug 4 — Deployment hanging on videos with comments disabled

**Symptom:** When testing a video where comments are turned off on YouTube, the entire request would hang indefinitely — no response, no timeout, no error shown to the user.

**Cause:** The `streamers/youtube-comments-scraper` actor keeps polling for comments that will never appear. With no client-side timeout on the fetch call, the request would wait until either the Apify server-side timeout (120s) or the Vercel function max duration — whichever came first. In practice this caused the UI to appear frozen for well over a minute.

**Fix:** Two layers of protection added:

1. **Early exit via `commentsTurnedOff` flag** — the video metadata actor already returns a `commentsTurnedOff` field in its response. The code now checks this flag and skips the comments actor call entirely when it's `true`, returning immediately with an empty comment set.

2. **Client-side `AbortSignal` timeout** — even when `commentsTurnedOff` is `false`, the comments actor call is now wrapped with `AbortSignal.timeout(35_000)`. If the actor doesn't respond within 35 seconds for any reason, the fetch is aborted and the request proceeds without comments rather than hanging.

---

### Bug 5 — Demo comments shown for live URL audits when real comments couldn't be fetched

**Symptom:** For videos where real comments were unavailable (disabled, restricted, or too few returned), the grading feed silently fell back to a hardcoded set of demo comments — burnout-era generic comments like *"Post more consistently bro"* and *"What camera do you use?"* — and graded those against the real video's blueprint. The result looked completely wrong for any video that wasn't a burnout/vulnerability video (e.g., a technical Jane Street discussion about GPUs and trading).

**Cause:** The audit route had a silent fallback: `rawComments.length >= 3 ? rawComments : DEMO_COMMENTS[platform]`. The intent was to always show something in the feed, but the demo comments were written for one specific content type and produced nonsensical grades when applied to any other.

**Fix:** Removed the demo fallback from the live URL audit path entirely. The system now:
- Uses real comments if they were fetched
- Returns `commentsUnavailable: true` in the API response if no real comments are available
- The UI renders a clear "💬 Comments unavailable — Comments are disabled or restricted on this video" message instead of grading unrelated demo content

The Vibe Blueprint (generated from the transcript) still displays regardless — the creator still gets the content analysis even when the community grading can't run.

The `DEMO_COMMENTS` set is kept only for the explicit demo button path, where the user knowingly asked for a pre-loaded example.

---

## Try It

**Demo video:** [Watch on Loom](https://www.loom.com/share/bfdfbb55f4514e119382189e68ab739a)

**GitHub:** [github.com/abhijitbetigeri/Syntropimaxx](https://github.com/abhijitbetigeri/Syntropimaxx)

Want to run it locally? One command:
```bash
daytona create https://github.com/abhijitbetigeri/Syntropimaxx
```

---

## What's Next

The comment grading is one layer. What it enables goes further:

- **Auto-pin**: automatically surface the highest-grade comments to shape community norms upward
- **Pre-submit evaluation**: let fans see their comment grade *before* they post it — a nudge toward better engagement
- **Brand safety dashboard**: for creators working with sponsors, a real-time community health score
- **Creator benchmarking**: how does your community compare to others in your category?

The goal isn't to punish bad comments. It's to make the good ones visible enough to crowd out the noise — and to give creators the language to ask for better.

---

*Built for WeaveHacks 4: Multi-Agent Orchestration Hackathon with Weights & Biases — using AI to foster human flourishing in content creation community.*

*"CCIP — Content Creators Intelligence Platform: grade your community, build a better one."*
