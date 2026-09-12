import unittest
from pathlib import Path

from research.carla_v22_recovery.reconstructed_harness import (
    ORIGINAL_CORE_SHA256,
    APPROVED_OBSERVATION_FIELDS,
    Intervention,
    matches_lost_original_core,
    validate_surviving_integrity_report,
)


ALL_KEYS = [
    "E-old-neutral",
    "E-mid-pedestrian",
    "E-recent-opening",
    "E-old-closing",
]
TIME_KEYS = ["E-mid-pedestrian", "E-recent-opening"]
FINGERPRINT = "1d210d5251ebf44a4e5e9d868cd5c00a2f4156e0b6fa5d005b37ea615278dfdd"


REFERENCE_EPOCHS = [
    {
        "observation": [5, 0.6466980576558223, False, 45.0, 0.0, "none", 0.0, 1],
        "steer": 0.0,
        "full_throttle": 0.34,
        "responsibility": [0.3040788598837154, 0.0626230712599013, 0.0, 0.0],
    },
    {
        "observation": [60, 2.1801287421887094, False, 45.0, 0.0, "none", -0.013199970126152039, 1],
        "steer": -0.00032999925315380096,
        "full_throttle": 0.16,
        "responsibility": [0.3040788598837154, 0.19588491075373626, 0.0, 0.0],
    },
    {
        "observation": [95, 2.5052155230792588, False, 45.0, 0.0, "none", -0.014131546020507812, 0],
        "steer": -0.00035328865051269536,
        "full_throttle": 0.16,
        "responsibility": [0.15, 0.22160529636938076, 0.0, 0.0],
    },
    {
        "observation": [130, 2.501208413275625, False, 45.0, 0.0, "none", -0.0010349899530410767, 0],
        "steer": -2.587474882602692e-05,
        "full_throttle": 0.16,
        "responsibility": [0.15, 0.22129332256308876, 0.0, 0.0],
    },
    {
        "observation": [180, 2.491342456856554, False, 45.0, 0.0, "none", 0.05630213022232056, 0],
        "steer": 0.001407553255558014,
        "full_throttle": 0.16,
        "responsibility": [0.15, 0.22052467483890648, 0.0, 0.0],
    },
]


def _decision(intervention: str, *, steer: float, full_throttle: float, responsibility):
    if intervention == "FULL":
        throttle, brake, keys, units, resp = full_throttle, 0.0, ALL_KEYS, 14, responsibility
    elif intervention == "NO_REACTIVATION":
        throttle, brake, keys, units, resp = 0.34, 0.0, [], 6, responsibility
    elif intervention == "TIME_CENSORED":
        throttle, brake, keys, units, resp = 0.34, 0.0, TIME_KEYS, 10, responsibility
    elif intervention == "FIXED_RESPONSIBILITY":
        throttle, brake, keys, units, resp = 0.0, 0.3, ALL_KEYS, 14, [0.5, 0.5, 0.5, 0.5]
    else:
        raise AssertionError(intervention)
    return {
        "control": {"throttle": throttle, "brake": brake, "steer": steer},
        "reactivated_keys": list(keys),
        "compute_units": units,
        "responsibility": list(resp),
    }


def _report_fixture():
    records = []
    for ref in REFERENCE_EPOCHS:
        observation = dict(zip(APPROVED_OBSERVATION_FIELDS, ref["observation"]))
        probes = []
        for intervention in Intervention:
            probes.append({
                "intervention": intervention.value,
                "before_hash": FINGERPRINT,
                "after_hash": FINGERPRINT,
                "state_unchanged": True,
                "decision": _decision(
                    intervention.value,
                    steer=ref["steer"],
                    full_throttle=ref["full_throttle"],
                    responsibility=ref["responsibility"],
                ),
            })
        records.append({"epoch": observation["epoch"], "observation": observation, "probes": probes})

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
            "G4": {
                "pass": False,
                "tolerances": {"trajectory_m": 0.03, "speed_mps": 0.03, "control": 1e-12},
                "max_position_delta_m": 0.3633367528593651,
                "max_speed_delta_mps": 0.3158935148856876,
                "max_control_delta": 0.412489764764905,
            },
        },
        "counterfactual_probe_records": records,
    }


class ReconstructionTests(unittest.TestCase):
    def test_exact_surviving_probe_contract_passes(self):
        result = validate_surviving_integrity_report(_report_fixture())
        self.assertTrue(result["pass"], result["errors"])
        self.assertEqual(result["probe_count"], 20)

    def test_reference_epoch5_full_control_matches_report(self):
        report = _report_fixture()
        full = report["counterfactual_probe_records"][0]["probes"][0]["decision"]
        self.assertEqual(full["control"], {"throttle": 0.34, "brake": 0.0, "steer": 0.0})
        self.assertEqual(full["responsibility"], [0.3040788598837154, 0.0626230712599013, 0.0, 0.0])

    def test_probe_mutation_is_rejected(self):
        report = _report_fixture()
        report["counterfactual_probe_records"][0]["probes"][0]["after_hash"] = "changed"
        result = validate_surviving_integrity_report(report)
        self.assertFalse(result["pass"])

    def test_schema_expansion_is_not_silently_accepted(self):
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
        for item in report["counterfactual_probe_records"]:
            item["probes"] = [p for p in item["probes"] if p["intervention"] != "FIXED_RESPONSIBILITY"]
        report["gates"]["G3"]["checks"] = 15
        result = validate_surviving_integrity_report(report)
        self.assertFalse(result["pass"])


if __name__ == "__main__":
    unittest.main()
