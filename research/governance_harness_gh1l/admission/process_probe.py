from __future__ import annotations

import json
import os
import random
import sys


def main() -> None:
    arm = sys.argv[1]
    print(json.dumps({
        "arm": arm, "pid": os.getpid(), "before": [], "after": [arm],
        "environment_probe": random.Random(6101).random(),
        "core_probe": random.Random(6102).random(),
    }, sort_keys=True))


if __name__ == "__main__":
    main()
