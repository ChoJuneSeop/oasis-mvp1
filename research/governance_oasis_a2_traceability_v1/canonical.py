from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_json(value: Any) -> str:
    """Deterministic JSON serialization used by all A2 evidence digests."""
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def domain_digest(domain: str, value: Any) -> str:
    """SHA-256 with explicit domain separation."""
    if not domain or "\x00" in domain:
        raise ValueError("domain must be a non-empty NUL-free string")
    payload = domain.encode("utf-8") + b"\x00" + canonical_json(value).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
