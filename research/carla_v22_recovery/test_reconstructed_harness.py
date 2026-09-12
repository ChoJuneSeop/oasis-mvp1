import copy
import unittest
from pathlib import Path

from research.carla_v22_recovery.reconstructed_harness import (
    ORIGINAL_CORE_SHA256,
    APPROVED_OBSERVATION_FIELDS,
    Intervention,
    matches_lost_original_core,
    validate_surviving_integrity_report,
)


def _decision(intervention: str, steer: float = 0.0):
    if intervention == "NO_REACTIVATION":
        throttle, brake, keys, units, responsibility = 0.34, 0.0, [], 6, [0.15, 0.2, 0.0, 0.0]
    elif intervention == "TIME_CENSORED":
        throttle, brake, keys, units, responsibility = 0.34, 0.0, ["E-mid-pedestrian", "E-recent-opening"], 10, [0.15, 0.2, 0.0, 0.0]
    elif intervention == "FIXED_RESPONSIBILITY":
        throttle, brake, keys, units, responsibility = 0.0, 0.3, ["E-old-neutral", "E-mid-pedestrian", "E-recent-opening", "E-old-closing"], 14, [0.5, 0.5, 0.5, 0.5]
    else:
        throttle, brake, keys, units, responsibility = 0.16, 0.0, ["E-old-neutral", "E-mid-pedestrian", "E-recent-opening", "E-old-closing"], 14, [0.15, 0.2, 0.0, 0.0]
    return {
        "control": {"throttle": throttle, "brake": brake, "steer": steer},
        "reactivated_keys": keys,
        "compute_units": units,
        "responsibility": responsibility,
    }


def _report_fixture():
    epochs = [
        (5, 0.6466980576558223, True, 0.0),
        (60, 2.1801287421887094, True, -0.00032999925315380096),
        (95, 2.5052155230792588, False, -0.00035328865051269536),
        (130, 2.501208413275625, False, -2.587474882602692e-05),
        (180, 2.491342456856554, False, 0.001407553255558014),
    ]
    fingerprint = "1d210d5251ebf44a4e5e9d868cd5c00a2f4156e0b6fa5d005b37ea615278dfdd"
    records = []
    for epoch, speed, dense, steer in epochs:
        observation = dict(zip(APPROVED_OBSERVATION_FIELDS, [
            epoch,
            speed,
            False,
            45.0,
            0.0,
            "none",
            0.0,
            int(dense),
        ]))
        probes = []
        for intervention in Intervention:
            probes.append({
                "intervention": intervention.value,
                "before_hash": fingerprint,
                "after_hash": fingerprint,
                "state_unchanged": True,
                "decision": _decision(intervention.value, steer),
            })
        records.append({"epoch": epoch, "observation": observation, "probes": probes})

    return {
        "protocol": "OASIS-CARLA Paper Validation Protocol v2.2",
        "harness": "OASIS-CARLA Paper Validation Harness v1.0",
        "carla_map": "Town10HD_Opt",
        "fixed_delta_seconds": 0.05,
        "replay_epochs": 220,
        "gates": {
            "G1": {"pass": True, "epochs": 220, "violations": 0},
            "G2": {
                "pass": True,
                "core_static_audit": {
                    "core_file_sha256": ORIGINAL_CORE_SHA256,
                    "prohibited_hits": [],
                    "pass": True,
                },
                "observation_schema_audit": {
                    "approved_exact_match": True,
                    "unexpected_fields": [],
                    "prohibited_fields_present": [],
                },
            },
            "G3": {"pass": True, "checks": 20, "violations": 0},
            "G4": {"pass": False},
        },
        "counterfactual_probe_records": records,
    }


class ReconstructionTests(unittest.TestCase):
    def test_surviving_evidence_contract_passes(self):
        result = validate_surviving_integrity_report(_report_fixture())
        self.assertTrue(result["pass"], result["errors"])
        self.assertEqual(result["probe_count"], 20)

    def test_probe_mutation_is_rejected(self):
        report = _report_fixture()
        report["counterfactual_probe_records"][0]["probes"][0]["after_hash"] = "changed"
        result = validate_surviving_integrity_report(report)
        self.assertFalse(result["pass"])

    def test_future_schema_expansion_is_not_silently_accepted(self):
        report = _report_fixture()
        report["counterfactual_probe_records"][0]["observation"]["scenario_label"] = "leak"
        result = validate_surviving_integrity_report(report)
        self.assertFalse(result["pass"])

    def test_g4_failure_cannot_be_rewritten_as_pass(self):
        report = _report_fixture()
        report["gates"]["G4"]["pass"] = True
        result = validate_surviving_integrity_report(report)
        self.assertFalse(result["pass"])

    def test_reconstruction_does_not_claim_original_hash_identity(self):
        path = Path(__file__).with_name("reconstructed_harness.py")
        self.assertFalse(matches_lost_original_core(path))

    def test_all_four_evidenced_interventions_are_required(self):
        report = _report_fixture()
        report["counterfactual_probe_records"][0]["probes"] = report["counterfactual_probe_records"][0]["probes"][:-1]
        report["gates"]["G3"]["checks"] = 19
        result = validate_surviving_integrity_report(report)
        self.assertFalse(result["pass"])


if __name__ == "__main__":
    unittest.main()
