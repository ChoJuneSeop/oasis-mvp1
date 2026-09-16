from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parents[1]
MANIFEST_PATH = HERE / "design" / "FREEZE_MANIFEST.json"
DEFAULT_OUTPUT = HERE / "design" / "CONFIRMATORY_COUNT_FREEZE.json"


def _manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def derive_confirmatory_count(pilot: dict[str, Any], manifest: dict[str, Any]) -> dict[str, Any]:
    if pilot.get("experiment") != "GH-1L" or pilot.get("stage") != "pilot":
        raise RuntimeError("count freeze requires a GH-1L pilot result")
    if pilot.get("spec_version") != manifest["spec_version"]:
        raise RuntimeError("pilot spec version differs from frozen manifest")
    if not pilot.get("fresh_process_contract", {}).get("pass"):
        raise RuntimeError("pilot fresh-process contract did not pass")
    if int(pilot.get("block_count", -1)) != int(manifest["pilot_blocks"]):
        raise RuntimeError("pilot block count differs from frozen manifest")

    metric_name = manifest["primary_paired_metric"]
    values = pilot.get("paired_metrics", {}).get(metric_name)
    if not isinstance(values, list) or len(values) != int(manifest["pilot_blocks"]):
        raise RuntimeError("pilot does not contain the frozen paired metric for every block")
    paired = [float(value) for value in values]
    variance = statistics.variance(paired) if len(paired) > 1 else 0.0

    power = manifest["power_analysis"]
    z_alpha = float(power["alpha_z"])
    z_power = float(power["power_z"])
    target_delta = float(power["target_delta"])
    min_blocks = int(power["min_confirmatory_blocks"])
    calculated = math.ceil(((z_alpha + z_power) ** 2 * variance) / (target_delta ** 2))
    confirmatory_blocks = max(min_blocks, calculated)

    return {
        "status": "COUNT_FROZEN",
        "spec_version": manifest["spec_version"],
        "primary_paired_metric": metric_name,
        "paired_values": paired,
        "paired_variance": variance,
        "alpha_z": z_alpha,
        "power_z": z_power,
        "target_delta": target_delta,
        "min_confirmatory_blocks": min_blocks,
        "formula": power["formula"],
        "calculated_blocks": calculated,
        "confirmatory_blocks": confirmatory_blocks,
        "pilot_block_count": int(manifest["pilot_blocks"]),
        "pilot_excluded_from_confirmatory": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pilot", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if args.output.exists():
        raise RuntimeError("confirmatory count freeze already exists; overwrite is forbidden")
    raw = args.pilot.read_bytes()
    pilot = json.loads(raw.decode("utf-8"))
    manifest = _manifest()
    payload = derive_confirmatory_count(pilot, manifest)
    payload["pilot_result_sha256"] = hashlib.sha256(raw).hexdigest()
    payload["pilot_result_path"] = str(args.pilot.as_posix())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
