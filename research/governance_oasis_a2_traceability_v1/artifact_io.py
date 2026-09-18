from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def write_immutable_json(path: Path, payload: Any) -> None:
    """Create one JSON artifact exactly once.

    Existing paths are never overwritten. Confirmatory artifacts must be
    written to a fresh run directory and treated as append-only evidence.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False, sort_keys=True)
        handle.write("\n")
