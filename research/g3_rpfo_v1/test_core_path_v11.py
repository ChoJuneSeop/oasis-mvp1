from dataclasses import replace
import unittest

from research.g3_2_sidecar.common import RelationElementRef
from research.g3_organic_flow_v1.operators import OrganicCurrentAssessment, OrganicCurrentVerifier, OrganicResponsibilityResourceAllocator
from research.g3_rpfo_v1.core import RPFOOrganicCore
from research.g3_rpfo_v1.rpfo import CurrentLineageAnchor, ParticipationDecision
from research.integration_checkpoint.selection import ParetoContextPreference
from research.oasis_core_v11.test_current_relational_core import make_core as legacy_core
from research.oasis_core_v12.test_supplement import envelope, frame


class CurrentOnlyLineage:
    def anchors(self, *, frame, current_relations):
        return (CurrentLineageAnchor("lineage:front", current_relations[0].relation_id, ("obs:front-relation",), frame.tau, "current observation lineage"),)


class ParticipateLocal:
    def resolve(self, *, frontier_records, active_records, **kwargs):
        keys = tuple(dict.fromkeys((*active_records, *frontier_records)))
        return ParticipationDecision(keys, ())


class Responsibility:
    def __init__(self, inner): self.inner = inner
    def evaluate(self, **kwargs):
        value = self.inner.evaluate(**kwargs)
        return replace(value, evidence={"domain_visibility": ("obs:front-relation",)})


class CorePathTests(unittest.TestCase):
    def test_action_path_uses_only_lineage_reached_history(self):
        base = legacy_core(())
        past = envelope()
        source = past.record.source
        source = RelationElementRef(source.experience_id, source.relation_element_id, source.completed_at_tau, {**source.relation_descriptor, "rpfo_lineage_refs": ("lineage:front",)})
        past = replace(past, record=replace(past.record, source=source))
        core = RPFOOrganicCore(
            participation_resolver=ParticipateLocal(), lineage_provider=CurrentOnlyLineage(), history=(past,),
            assessment_operator=OrganicCurrentAssessment(), verifier=OrganicCurrentVerifier(), preference_operator=ParetoContextPreference(), resource_allocator=OrganicResponsibilityResourceAllocator(),
            relation_builder=base.relation_builder, candidate_provider=base.candidate_provider, relation_operator=base.relation_operator, reconstruction_operator=base.reconstruction_operator,
            responsibility_operator=Responsibility(base.responsibility_operator), actuation_operator=base.actuation_operator,
        )
        view = core.open_current_epoch(frame())
        snap = core.rpfo_snapshot()
        self.assertEqual(snap.opened_keys, ((source.experience_id, source.relation_element_id),))
        self.assertEqual(len(view.relation_elements), 1)
        self.assertFalse(snap.global_history_scan)
        self.assertFalse(snap.recursive_history_fold)


if __name__ == "__main__": unittest.main()
