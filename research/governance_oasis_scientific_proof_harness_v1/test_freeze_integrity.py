from __future__ import annotations

import json
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "HARNESS_FREEZE_MANIFEST.json"


class ScientificProofHarnessFreezeIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(MANIFEST.read_text(encoding="utf-8"))

    def _blob(self, ref: str, path: str) -> str:
        return subprocess.check_output(
            ["git", "rev-parse", f"{ref}:{path}"],
            cwd=ROOT,
            text=True,
        ).strip()

    def test_manifest_declares_scientific_not_governance_proof(self):
        self.assertEqual(
            self.data["status"],
            "FROZEN_AFTER_MULTI_ROUND_SELF_AUDIT",
        )
        self.assertFalse(self.data["current_program_state"]["proof_complete"])
        boundary = " ".join(self.data["claim_boundary"]).lower()
        self.assertIn("not governance oasis itself", boundary)
        self.assertIn("cannot close an axis", boundary)

    def test_source_freeze_commit_is_ancestor_of_head(self):
        code = subprocess.run(
            [
                "git",
                "merge-base",
                "--is-ancestor",
                self.data["source_freeze_commit"],
                "HEAD",
            ],
            cwd=ROOT,
        ).returncode
        self.assertEqual(code, 0)

    def test_every_frozen_source_matches_source_commit_and_head(self):
        source_commit = self.data["source_freeze_commit"]
        for path, expected in self.data["frozen_source_git_blobs"].items():
            with self.subTest(path=path):
                at_source = self._blob(source_commit, path)
                at_head = self._blob("HEAD", path)
                self.assertEqual(expected, at_source)
                self.assertEqual(expected, at_head)

    def test_official_axis_sequence_and_current_next_axis_are_frozen(self):
        self.assertEqual(
            self.data["official_sequence"],
            "A1→A2→A3→A4→A5→A6",
        )
        self.assertEqual(
            self.data["current_program_state"]["next_required_axis"],
            "A2_EXPERIENCE_CONTRIBUTION_TRACEABILITY",
        )

    def test_freeze_covers_lower_execution_harness_contract(self):
        frozen = self.data["frozen_source_git_blobs"]
        self.assertIn(
            "research/oasis_experiment_freeze_harness_v1/models.py",
            frozen,
        )
        self.assertIn(
            "research/oasis_experiment_freeze_harness_v1/harness.py",
            frozen,
        )
        self.assertIn(
            "research/oasis_experiment_freeze_harness_v1/HARNESS_SPEC.md",
            frozen,
        )

    def test_freeze_covers_scientific_ci_workflow(self):
        self.assertIn(
            ".github/workflows/governance-oasis-scientific-proof-harness-v1.yml",
            self.data["frozen_source_git_blobs"],
        )


if __name__ == "__main__":
    unittest.main()
