from __future__ import annotations

import tempfile
import unittest

from research.g3_organic_flow_v1.history import (
    FrontRelationEpisodeManager,
    OrganicHistoryCommitter,
)
from research.g3_organic_flow_v1.test_organic_flow import Flow, build_core, execute
from research.oasis_core_v11.carla_domain_bundle_v1 import build_domain_bundle
from research.oasis_core_v12.process_archive import ProcessArchive
from research.oasis_core_v12.runtime import ExecutionJournal


class SharedClosureProvenanceTests(unittest.TestCase):
    def test_multiple_decisions_in_one_relation_share_one_closure_occurrence(self):
        core = build_core()
        journal = ExecutionJournal(":memory:")
        flow = Flow(epoch=300, tau=20.0)
        manager = FrontRelationEpisodeManager(
            build_domain_bundle().closure_evaluator,
            scope_id="ego/front-interaction",
        )

        first = execute(core, flow, journal, run_id="shared-closure")
        self.assertTrue(manager.begin(first))

        # Same continuing front relation, next Decision Epoch. No relation Closure yet.
        flow.epoch = 301
        flow.tau = 20.1
        second = execute(core, flow, journal, run_id="shared-closure")
        self.assertTrue(manager.begin(second))
        self.assertEqual(manager.pending_count, 2)

        completed = manager.observe_post(
            post_observation=flow.post_observation(front_present=False),
            post_tau=20.2,
        )
        self.assertEqual(len(completed), 2)
        self.assertEqual(
            completed[0].closure_occurrence_id,
            completed[1].closure_occurrence_id,
        )

        with tempfile.TemporaryDirectory() as tmp:
            archive = ProcessArchive(f"{tmp}/process.sqlite")
            committer = OrganicHistoryCommitter(core=core, archive=archive)
            admissions = tuple(
                committer.admit(item, known_at_tau=20.2) for item in completed
            )
            self.assertEqual(
                admissions[0].occurrence.occurrence_id,
                admissions[1].occurrence.occurrence_id,
            )
            self.assertEqual(len(core.history_envelopes()), 2)
            occurrence_refs = {
                envelope.occurrence_refs for envelope in core.history_envelopes()
            }
            self.assertEqual(len(occurrence_refs), 1)

            # The same physical Closure observation must not gain extra distribution
            # mass merely because two Decision Epochs closed at that one boundary.
            one_history_core = build_core()
            one_history_core.add_history(core.history_envelopes()[0])
            later = Flow(epoch=302, tau=21.0)
            frame = later.capture()
            full_view = core.open_current_epoch(frame)
            one_view = one_history_core.open_current_epoch(frame)
            self.assertEqual(
                full_view.possibility_distribution,
                one_view.possibility_distribution,
            )
            self.assertTrue(
                any(
                    len(measurement.source_links) == 2
                    for measurement in full_view.reconstructions
                )
            )
            archive.close()
        journal.close()


if __name__ == "__main__":
    unittest.main()
