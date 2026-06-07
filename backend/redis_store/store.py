import os
import json
import hashlib
import numpy as np
import redis as redis_lib
from redisvl.index import SearchIndex
from redisvl.schema import IndexSchema
from redisvl.query import VectorQuery
from redisvl.query.filter import Tag
from sentence_transformers import SentenceTransformer

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMS = 384
TTL_SECONDS = 86400  # 24 h

_model: SentenceTransformer | None = None
_redis: redis_lib.Redis | None = None
_comment_index: SearchIndex | None = None
_kb_index: SearchIndex | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _get_redis() -> redis_lib.Redis:
    global _redis
    if _redis is None:
        _redis = redis_lib.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    return _redis


def embed(text: str) -> np.ndarray:
    return _get_model().encode(text, normalize_embeddings=True)


def embed_batch(texts: list[str]) -> np.ndarray:
    return _get_model().encode(texts, normalize_embeddings=True)


# ── Index schemas ──────────────────────────────────────────────────────────────

COMMENT_SCHEMA = IndexSchema.from_dict({
    "index": {"name": "comments", "prefix": "comment:"},
    "fields": [
        {"name": "url_hash", "type": "tag"},
        {"name": "text", "type": "text"},
        {"name": "platform", "type": "tag"},
        {"name": "grade", "type": "tag"},
        {"name": "score", "type": "numeric"},
        {"name": "embedding", "type": "vector", "attrs": {
            "dims": EMBEDDING_DIMS,
            "distance_metric": "cosine",
            "algorithm": "hnsw",
            "datatype": "float32",
        }},
    ],
})

KB_SCHEMA = IndexSchema.from_dict({
    "index": {"name": "humanebench_kb", "prefix": "kb:"},
    "fields": [
        {"name": "content", "type": "text"},
        {"name": "principle", "type": "tag"},
        {"name": "category", "type": "tag"},
        {"name": "embedding", "type": "vector", "attrs": {
            "dims": EMBEDDING_DIMS,
            "distance_metric": "cosine",
            "algorithm": "hnsw",
            "datatype": "float32",
        }},
    ],
})


def _get_comment_index() -> SearchIndex:
    global _comment_index
    if _comment_index is None:
        _comment_index = SearchIndex(COMMENT_SCHEMA, redis_client=_get_redis())
        _comment_index.create(overwrite=False)
    return _comment_index


def get_kb_index() -> SearchIndex:
    global _kb_index
    if _kb_index is None:
        _kb_index = SearchIndex(KB_SCHEMA, redis_client=_get_redis())
        _kb_index.create(overwrite=False)
    return _kb_index


# ── Helpers ────────────────────────────────────────────────────────────────────

def url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:12]


def index_comments(url: str, platform: str, comments: list[str]) -> list[str]:
    """Embed and store comments. Returns Redis key list."""
    h = url_hash(url)
    texts = [c.strip() for c in comments if c.strip()]
    if not texts:
        return []
    embeddings = embed_batch(texts)
    index = _get_comment_index()
    records = []
    for i, (text, emb) in enumerate(zip(texts, embeddings)):
        records.append({
            "id": f"comment:{h}:{i}",
            "url_hash": h,
            "text": text,
            "platform": platform,
            "grade": "",
            "score": 0.0,
            "embedding": emb.astype(np.float32).tobytes(),
        })
    index.load(records, id_field="id")
    return [r["id"] for r in records]


def update_comment_grade(key: str, grade: str, score: float) -> None:
    _get_redis().hset(key, mapping={"grade": grade, "score": str(score)})


def search_similar_comments(url: str, query: str, top_k: int = 5) -> list[dict]:
    """Semantic search within a video's indexed comments."""
    h = url_hash(url)
    q_emb = embed(query).astype(np.float32).tobytes()
    index = _get_comment_index()
    q = VectorQuery(
        vector=q_emb,
        vector_field_name="embedding",
        return_fields=["text", "grade", "score"],
        num_results=top_k,
        filter_expression=Tag("url_hash") == h,
    )
    return index.query(q)


def search_kb(query: str, top_k: int = 3) -> list[dict]:
    """Retrieve relevant HumaneBench KB entries for a query."""
    q_emb = embed(query).astype(np.float32).tobytes()
    index = get_kb_index()
    q = VectorQuery(
        vector=q_emb,
        vector_field_name="embedding",
        return_fields=["content", "principle", "category"],
        num_results=top_k,
    )
    return index.query(q)


def store_audit_result(url: str, result: dict) -> None:
    _get_redis().set(f"audit:{url_hash(url)}", json.dumps(result), ex=TTL_SECONDS)


def get_audit_result(url: str) -> dict | None:
    raw = _get_redis().get(f"audit:{url_hash(url)}")
    return json.loads(raw) if raw else None
