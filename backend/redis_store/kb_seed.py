"""
Seed the HumaneBench v3.0 knowledge base into Redis VL.
Run once: python -m redis_store.kb_seed
"""
import numpy as np
from .store import get_kb_index, embed

PRINCIPLES = [
    {
        "principle": "respect_attention",
        "category": "rubric",
        "content": (
            "Respect Attention: Does the comment respect the creator's attention and the community's time? "
            "+1.0 Exemplary: Concise, focused, substantive — every word earns its place. "
            "+0.5 Acceptable: On-topic, genuine engagement. "
            "-0.5 Concerning: Overly generic ('great video!'), repetitive praise. "
            "-1.0 Violation: Spam, emoji-only, off-topic noise."
        ),
    },
    {
        "principle": "meaningful_choices",
        "category": "rubric",
        "content": (
            "Meaningful Choices: Does the comment open genuine dialogue vs. pushing an agenda? "
            "+1.0: Surfaces a new angle or constructive question. "
            "+0.5: Shares a relevant perspective without manipulating. "
            "-0.5: Subtly steers creator toward a specific decision. "
            "-1.0: Pressures, demands, or guilt-trips ('you should do X or I'll unsubscribe')."
        ),
    },
    {
        "principle": "enhance_capabilities",
        "category": "rubric",
        "content": (
            "Enhance Capabilities: Does the comment help the creator or community grow? "
            "+1.0: Shares lived insight, framework, or story that scaffolds growth. "
            "+0.5: Adds a genuine reference, clarifying question, or small experience. "
            "-0.5: Pure validation without substance; doesn't help creator grow. "
            "-1.0: Discourages creative risk-taking or creates dependency."
        ),
    },
    {
        "principle": "dignity_safety",
        "category": "rubric",
        "content": (
            "Dignity & Safety: Does the comment treat the creator with respect and safety? "
            "+1.0: Actively models respectful discourse; acknowledges vulnerability. "
            "+0.5: Respectful tone, no harmful content. "
            "-0.5: Tone-deaf, slightly dismissive, unsolicited criticism. "
            "-1.0: Harassment, toxicity, hate speech, shaming, personal attacks."
        ),
    },
    {
        "principle": "healthy_relationships",
        "category": "rubric",
        "content": (
            "Healthy Relationships: Does the comment maintain healthy creator-fan boundaries? "
            "+1.0: Warm appreciation within professional limits; no projection. "
            "+0.5: Appropriate warmth without implying personal bond. "
            "-0.5: Overly familiar; treats creator as a personal confidant. "
            "-1.0: Parasocial overreach — possessive, exclusive, or emotionally demanding."
        ),
    },
    {
        "principle": "longterm_wellbeing",
        "category": "rubric",
        "content": (
            "Long-term Wellbeing: Does the comment prioritize creator's sustainable wellbeing? "
            "+1.0: Encourages rest, boundaries, quality over quantity. "
            "+0.5: Neutral, no pressure for more output. "
            "-0.5: Implicitly pressures for more content. "
            "-1.0: Entitlement, demands, treating creator as a content machine."
        ),
    },
    {
        "principle": "transparency_honesty",
        "category": "rubric",
        "content": (
            "Transparency & Honesty: Is the comment genuine and authentic? "
            "+1.0: Clearly authentic; shares honest perspective even if nuanced. "
            "+0.5: Genuine engagement, says what it means. "
            "-0.5: Vague flattery, performative positivity, ambiguous sincerity. "
            "-1.0: Fake, bot-generated, copy-pasted, deliberately misleading."
        ),
    },
    {
        "principle": "equity_inclusion",
        "category": "rubric",
        "content": (
            "Equity & Inclusion: Is the comment inclusive and free of stereotyping? "
            "+1.0: Proactively considers diverse perspectives; challenges stereotypes. "
            "+0.5: Neutral, inclusive language; no biased assumptions. "
            "-0.5: Unnecessary assumptions about creator's identity or background. "
            "-1.0: Stereotyping, discriminatory content, marginalizing language."
        ),
    },
    # Global violation rules
    {
        "principle": "global",
        "category": "global_rules",
        "content": (
            "Global Rules: "
            "1. Emoji-only reactions earn -1.0 on respect_attention. "
            "2. Harassment or hate speech earns -1.0 on dignity_safety. "
            "3. Parasocial overreach earns -1.0 on healthy_relationships. "
            "4. Clearly fake or bot comments earn -1.0 on transparency_honesty."
        ),
    },
]


def seed() -> None:
    index = get_kb_index()
    records = []
    for i, p in enumerate(PRINCIPLES):
        emb = embed(p["content"]).astype(np.float32).tobytes()
        records.append({
            "id": f"kb:{i}",
            "principle": p["principle"],
            "category": p["category"],
            "content": p["content"],
            "embedding": emb,
        })
    index.load(records, id_field="id")
    print(f"Seeded {len(records)} HumaneBench KB entries into Redis.")


if __name__ == "__main__":
    seed()
