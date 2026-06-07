import os
import json
import requests
import streamlit as st

BACKEND_URL = os.getenv("BACKEND_URL", "https://filling-declared-deflation.ngrok-free.dev")

st.set_page_config(
    page_title="CCIP — Content Creators Intelligence Platform",
    page_icon="⚡",
    layout="wide",
)

st.markdown("""
<style>
  .main-header { font-size: 2.2rem; font-weight: 900; color: #7c3aed; }
  .sub-header  { color: #64748b; font-size: 1rem; margin-top: -12px; }
  .grade-badge { display: inline-block; padding: 2px 10px; border-radius: 6px; font-weight: 800; font-size: 0.85rem; }
  .tag { display: inline-block; background: #f3f0ff; color: #6d28d9; border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; margin: 2px; }
  .stat-box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
  .stat-val { font-size: 2rem; font-weight: 900; color: #7c3aed; }
  .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
  div[data-testid="stMetric"] { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 12px; }
</style>
""", unsafe_allow_html=True)

# ── Header ──────────────────────────────────────────────────────────────────
col_logo, col_title, col_tags = st.columns([1, 6, 4])
with col_logo:
    st.markdown('<div style="width:52px;height:52px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:white;margin-top:4px;">C</div>', unsafe_allow_html=True)
with col_title:
    st.markdown('<div class="main-header">CCIP</div><div class="sub-header">Content Creators Intelligence Platform · WeaveHacks 4</div>', unsafe_allow_html=True)
with col_tags:
    st.markdown('<br><span class="tag">LangGraph</span><span class="tag">WandB Weave</span><span class="tag">Redis VL</span><span class="tag">HumaneBench v3.0</span>', unsafe_allow_html=True)

st.divider()

# ── URL Input ────────────────────────────────────────────────────────────────
url = st.text_input(
    "YouTube or X/Twitter URL",
    placeholder="https://youtu.be/...  or  https://x.com/user/status/...",
    label_visibility="collapsed",
)

run = st.button("⚡  Analyse", type="primary", disabled=not url.strip())

GRADE_COLORS = {
    "A+": "#059669", "A": "#10b981", "B": "#3b82f6",
    "C": "#f59e0b", "D": "#f97316", "F": "#ef4444",
}

STAGE_LABELS = {
    "scraping":  "🔍 Scraping content via Apify…",
    "blueprint": "🎭 Generating Vibe Blueprint via WandB LLM…",
    "indexing":  "🧠 Embedding & indexing comments in Redis VL…",
    "grading":   "📊 Grading comments with HumaneBench v3.0…",
    "done":      "✅ Done",
    "error":     "❌ Error",
}

if run and url.strip():
    state: dict = {}

    progress_bar = st.progress(0, text="Connecting to backend…")
    status_text  = st.empty()

    blueprint_ph = st.empty()
    comments_ph  = st.empty()
    report_ph    = st.empty()

    stage_order = ["scraping", "blueprint", "indexing", "grading", "done"]

    try:
        with requests.get(
            f"{BACKEND_URL}/run-stream",
            params={"url": url.strip()},
            stream=True,
            timeout=180,
            headers={"ngrok-skip-browser-warning": "true"},
        ) as resp:
            resp.raise_for_status()
            buf = ""
            for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
                buf += chunk
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    if not line.startswith("data: "):
                        continue
                    try:
                        state = json.loads(line[6:])
                    except Exception:
                        continue

                    stage = state.get("stage", "")
                    pct = max(5, (stage_order.index(stage) + 1) * 20) if stage in stage_order else 5
                    progress_bar.progress(pct, text=STAGE_LABELS.get(stage, "Running…"))
                    if state.get("progress"):
                        status_text.caption(state["progress"])

                    # Blueprint card
                    if state.get("blueprint"):
                        bp = state["blueprint"]
                        vs = bp.get("vibe_state", {})
                        ti = bp.get("true_intent", {})
                        ib = bp.get("interaction_boundaries", {})
                        chips = bp.get("contextual_prompts", {}).get("prompt_chips", [])
                        with blueprint_ph.container():
                            st.subheader("🎭 Vibe Blueprint")
                            c1, c2 = st.columns(2)
                            with c1:
                                st.markdown(f"**Creator:** `{state.get('creator_handle','')}`")
                                st.markdown(f"**Vibe State:** {vs.get('emotional_context','').title()}")
                                st.caption(vs.get("description", ""))
                                st.markdown(f"**True Intent:** {ti.get('community_need','').title()}")
                                st.caption(ti.get("description", ""))
                            with c2:
                                avoids = ib.get("avoid", [])
                                if avoids:
                                    st.markdown("**Avoid:**")
                                    for a in avoids:
                                        st.markdown(f"- ✕ {a}")
                                if chips:
                                    st.markdown("**Prompt Chips:**")
                                    st.markdown(" ".join(f'`{c}`' for c in chips))

                    # Comment feed
                    graded = state.get("graded_comments", [])
                    if graded:
                        with comments_ph.container():
                            st.subheader(f"📊 Comment Grading Feed — {len(graded)} graded")
                            sorted_comments = sorted(graded, key=lambda c: c.get("score", 0))
                            for c in sorted_comments:
                                grade = c.get("grade", "?")
                                score = c.get("score", 0)
                                color = GRADE_COLORS.get(grade[0] if grade else "F", "#94a3b8")
                                score_str = f"+{score:.2f}" if score >= 0 else f"{score:.2f}"
                                with st.expander(f"**{grade}** ({score_str})  —  {c.get('text','')[:80]}…"):
                                    st.write(c.get("feedback", ""))
                                    principles = c.get("principles", [])
                                    if principles:
                                        cols = st.columns(min(4, len(principles)))
                                        for i, p in enumerate(principles):
                                            with cols[i % 4]:
                                                st.metric(
                                                    p.get("name","").replace("_"," ").title(),
                                                    f"+{p['score']}" if p.get('score',0) >= 0 else str(p.get('score',0)),
                                                )

                    # Vibe Report
                    if state.get("analytics") and state.get("stage") == "done":
                        an = state["analytics"]
                        with report_ph.container():
                            st.subheader("📈 Vibe Report — Monetizable Retention State")
                            m1, m2, m3, m4 = st.columns(4)
                            avg = an.get("avgScore", 0)
                            m1.metric("Avg HumaneBench Score", f"+{avg:.3f}" if avg >= 0 else f"{avg:.3f}")
                            m2.metric("Community Alignment", f"{an.get('communityAlignmentPct',0)}%")
                            m3.metric("Tier Depth", an.get("tierDepth", "—"))
                            m4.metric("High-Signal Ratio", f"{an.get('depthVectorPct',0)}%")

                            dist = an.get("gradeDistribution", {})
                            total = an.get("totalGraded", 1)
                            if dist:
                                st.markdown("**Grade Distribution**")
                                bar_data = {g: dist.get(g, 0) for g in ["A+","A","B","C","D","F"] if dist.get(g,0) > 0}
                                st.bar_chart(bar_data)

    except Exception as e:
        st.error(f"Pipeline error: {e}")
        st.info("Make sure the backend is running and ngrok is active.")

    if state.get("stage") == "done":
        progress_bar.progress(100, text="✅ Analysis complete!")
        status_text.empty()
    elif state.get("stage") == "error":
        st.error(state.get("error", "Unknown error"))

st.divider()
st.caption("CCIP · WeaveHacks 4 · LangGraph · WandB Weave · Redis VL · Apify · HumaneBench v3.0")
