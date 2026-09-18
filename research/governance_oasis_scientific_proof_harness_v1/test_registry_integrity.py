from __future__ import annotations

import json
from pathlib import Path
import subprocess
import unittest

from .models import AxisId, EvidenceLevel
from .registry import AXIS_CONTRACTS, CLAIM_AXIS_MAP


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


class ProofRegistryIntegrityTests(unittest.TestCase):
    def test_exactly_six_official_axes_are_registered(self):
        self.assertEqual(set(AXIS_CONTRACTS), set(AxisId))
        self.assertEqual(len(AXIS_CONTRACTS), 6)

    def test_each_axis_has_a_registered_scientific_claim(self):
        mapped = {axis for axis in CLAIM_AXIS_MAP.values() if axis is not None}
        self.assertEqual(mapped, set(AxisId))

    def test_evidence_registry_sources_exist_and_boundaries_are_nonempty(self):
        data = json.loads(
            (HERE / "PROGRAM_EVIDENCE_REGISTRY.json").read_text(encoding="utf-8")
        )
        for record in data["records"]:
            with self.subTest(evidence_id=record["evidence_id"]):
                self.assertTrue(record["claim_boundary"])
                for source in record["source_refs"]:
                    self.assertTrue((ROOT / source).exists(), source)

    def test_any_axis_closing_record_must_attest_all_axis_obligations(self):
        data = json.loads(
            (HERE / "PROGRAM_EVIDENCE_REGISTRY.json").read_text(encoding="utf-8")
        )
        for record in data["records"]:
            if not record["counts_toward_axis_proof"]:
                continue
            self.assertTrue(record["review_method"].strip())
            verified = set(record["verified_obligations"])
            for axis_name in record["axes"]:
                axis = AxisId(axis_name)
                required = set(AXIS_CONTRACTS[axis].mandatory_obligations)
                self.assertTrue(
                    required.issubset(verified),
                    (record["evidence_id"], sorted(required - verified)),
                )

    def test_every_record_declares_claim_outcome_and_result_rule(self):
        data = json.loads(
            (HERE / "PROGRAM_EVIDENCE_REGISTRY.json").read_text(encoding="utf-8")
        )
        allowed = {
            "UNTESTED",
            "SUPPORTS",
            "DOES_NOT_SUPPORT",
            "INCONCLUSIVE",
            "INVALID",
        }
        for record in data["records"]:
            with self.subTest(evidence_id=record["evidence_id"]):
                self.assertIn(record["claim_outcome"], allowed)
                self.assertTrue(record["result_rule_ref"].strip())

    def test_every_evidence_source_is_bound_to_its_exact_git_blob(self):
        data = json.loads(
            (HERE / "PROGRAM_EVIDENCE_REGISTRY.json").read_text(encoding="utf-8")
        )
        for record in data["records"]:
            anchors = dict(record["source_git_blobs"])
            self.assertEqual(set(anchors), set(record["source_refs"]))
            for source in record["source_refs"]:
                actual = subprocess.check_output(
                    ["git", "rev-parse", f"HEAD:{source}"],
                    cwd=ROOT,
                    text=True,
                ).strip()
                self.assertEqual(
                    actual,
                    anchors[source],
                    (record["evidence_id"], source, actual, anchors[source]),
                )

    def test_result_rule_file_is_among_anchored_sources(self):
        data = json.loads(
            (HERE / "PROGRAM_EVIDENCE_REGISTRY.json").read_text(encoding="utf-8")
        )
        for record in data["records"]:
            rule_path = record["result_rule_ref"].split("#", 1)[0]
            self.assertIn(
                rule_path,
                record["source_refs"],
                (record["evidence_id"], rule_path),
            )

    def test_nonconfirmatory_levels_cannot_be_marked_as_axis_proof(self):
        data = json.loads(
            (HERE / "PROGRAM_EVIDENCE_REGISTRY.json").read_text(encoding="utf-8")
        )
        for record in data["records"]:
            level = EvidenceLevel(record["level"])
            if level in {
                EvidenceLevel.DESIGN_ONLY,
                EvidenceLevel.STRUCTURAL_ONLY,
                EvidenceLevel.PILOT_ONLY,
            }:
                self.assertFalse(record["counts_toward_axis_proof"])

    def test_integrated_design_record_is_not_misreported_as_completed_evidence(self):
        data = json.loads(
            (HERE / "PROGRAM_EVIDENCE_REGISTRY.json").read_text(encoding="utf-8")
        )
        gh4 = next(x for x in data["records"] if x["evidence_id"] == "E-GH4-INTEGRATION-DESIGN")
        self.assertEqual(gh4["level"], "DESIGN_ONLY")
        self.assertNotEqual(gh4["result_status"], "COMPLETE")
        self.assertFalse(gh4["counts_toward_axis_proof"])


if __name__ == "__main__":
    unittest.main()
