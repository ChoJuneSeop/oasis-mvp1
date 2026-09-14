import json
from pathlib import Path
from research.g3_rpfo_carla_01.protocol import PROTOCOL_ID


def record(output_root, flow_id, attempt, error):
    run_dir = Path(output_root) / PROTOCOL_ID / f"{flow_id}-A{int(attempt)}"
    run_dir.mkdir(parents=True, exist_ok=True)
    path = run_dir / "status.json"
    data = {}
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    if data.get("empirical_evidence") or int(data.get("empirical_ticks", 0) or 0) > 0:
        return
    data.update({
        "protocol_id": PROTOCOL_ID,
        "flow_id": flow_id,
        "attempt": int(attempt),
        "phase": "PRE_FIRST_TICK_FAIL",
        "empirical_evidence": False,
        "empirical_ticks": 0,
        "valid_complete": False,
        "error_type": type(error).__name__,
        "error": str(error),
    })
    path.write_text(json.dumps(data, sort_keys=True, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
