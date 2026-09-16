from __future__ import annotations

import json
import os
import random
import sys

_PROCESS_LOCAL_SENTINEL: list[str] = []


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in {"G1", "G2", "G3"}:
        raise SystemExit("usage: gh1_process_probe.py G1|G2|G3")
    arm = sys.argv[1]
    before = tuple(_PROCESS_LOCAL_SENTINEL)
    _PROCESS_LOCAL_SENTINEL.append(arm)
    rng = random.Random(1701)
    print(json.dumps({
        "arm": arm,
        "pid": os.getpid(),
        "before": before,
        "after": tuple(_PROCESS_LOCAL_SENTINEL),
        "probe": [rng.random(), rng.random()],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
