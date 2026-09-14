from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path

PACKAGE = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE.parents[1]
PREREGISTRATION_PATH = PACKAGE / "G3_RPFO_ORGANIC_CARLA_01_PREREGISTRATION.json"
EXPERIMENT_MANIFEST_PATH = PACKAGE / "EXPERIMENT_SOURCE_MANIFEST.json"
PROTOCOL_ID = "G3-RPFO-ORGANIC-CARLA-01"


def file_sha256(path):
    return sha256(Path(path).read_bytes()).hexdigest()


def load_preregistration():
    data = json.loads(PREREGISTRATION_PATH.read_text(encoding="utf-8"))
    if data.get("protocol_id") != PROTOCOL_ID:
        raise ValueError("unexpected RPFO CARLA protocol id")
    return data


def preregistration_sha256():
    return file_sha256(PREREGISTRATION_PATH)


def experiment_manifest_sha256():
    return file_sha256(EXPERIMENT_MANIFEST_PATH)


def flow_spec(protocol, flow_id):
    matches = [item for item in protocol["flows"] if item["flow_id"] == flow_id]
    if len(matches) != 1:
        raise ValueError("unknown or duplicated flow id")
    return matches[0]


def verify_experiment_manifest():
    manifest = json.loads(EXPERIMENT_MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("protocol_id") != PROTOCOL_ID:
        raise ValueError("unexpected experiment manifest protocol id")
    if manifest.get("no_post_result_retuning") is not True:
        raise ValueError("no-retuning guard missing")
    if manifest.get("experimental_evidence") is not False:
        raise ValueError("source manifest cannot be empirical evidence")
    expected = manifest.get("source_sha256", {})
    for relative, digest in sorted(expected.items()):
        path = REPO_ROOT / relative
        if not path.is_file() or file_sha256(path) != str(digest):
            raise ValueError("experiment source mismatch: %s" % relative)
    if preregistration_sha256() != str(manifest["preregistration_sha256"]):
        raise ValueError("preregistration bytes changed after freeze")
    return manifest
