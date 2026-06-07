import weave
from redis_store.store import index_comments, update_comment_grade


@weave.op
async def index_and_store(url: str, platform: str, comments: list[str]) -> list[str]:
    """Embed comments and upsert into Redis VL indexed by URL + subject."""
    return index_comments(url, platform, comments)


def apply_grades(comment_ids: list[str], graded: list[dict]) -> None:
    """Write back grade + score to each comment's Redis hash."""
    for key, g in zip(comment_ids, graded):
        update_comment_grade(key, g.get("grade", ""), g.get("score", 0.0))
