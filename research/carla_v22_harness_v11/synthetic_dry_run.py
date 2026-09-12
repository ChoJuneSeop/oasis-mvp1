from __future__ import annotations

from dataclasses import asdict

from research.carla_v22_harness_v11.canonical_harness import (
    CanonicalHarnessV11,
    CoreEpochView,
    PresentObservation,
    Realization,
    VehicleActuation,
)
from research.g3_2_sidecar.common import RelationElementRef
from research.g3_2_sidecar.reconstruction import (
    AxisObservation,
    ProvenanceLink,
    ReconstructionMeasurement,
)


class SyntheticFlow:
    """Dry-run host only. This is not CARLA and is never paper evidence."""

    def __init__(self):
        self.tau = 10.0
        self.fingerprint = "flow@10.0"
        self.apply_count = 0

    def current_tau(self) -> float:
        return self.tau

    def present_observation(self):
        return {
            "epoch": 200,
            "ego_speed_mps": 2.0,
            "front_present": True,
            "front_gap_m": 12.0,
            "front_closing_mps": 0.8,
            "front_kind": "vehicle",
            "local_heading_error_deg": 0.2,
            "local_density": 2,
        }

    def current_reality(self):
        return {"flow_phase": "approach", "visibility": "clear"}

    def flow_fingerprint(self) -> str:
        return self.fingerprint

    def apply_single_actuation(self, actuation: VehicleActuation) -> str:
        self.apply_count += 1
        if self.apply_count != 1:
            raise RuntimeError("more than one actuation in an epoch")
        self.fingerprint = "flow@10.05"
        return "synthetic-realization-1"


class SyntheticCore:
    """Synthetic contract exerciser only; not the experimental OASIS Core."""

    def __init__(self):
        self.r1 = RelationElementRef(
            "E-old-yield",
            "rel-approach-gap",
            2.0,
            {"process": "approach", "relation": "space-closing"},
        )
        self.r2 = RelationElementRef(
            "E-mid-merge",
            "rel-yield-opening",
            6.0,
            {"process": "merge", "relation": "yield-opening"},
        )

    def open_epoch(self, observation: PresentObservation) -> CoreEpochView:
        links = (
            ProvenanceLink(
                source=self.r1,
                distribution_effect=0.0,
                participation_roles=("recognition", "generation"),
                generated_possibilities=("yield",),
                contribution_trace={"use": "gap relation"},
            ),
            ProvenanceLink(
                source=self.r2,
                distribution_effect=0.15,
                participation_roles=("constraint",),
                generated_possibilities=("yield",),
                contribution_trace={"use": "opening relation"},
            ),
        )
        reconstruction = ReconstructionMeasurement(
            possibility_id="yield",
            observed_at_tau=10.0,
            source_links=links,
            recombination=AxisObservation(
                0.7, "trace-derived-edge-recombination", {"source_count": 2}
            ),
            role_transformation=AxisObservation(
                0.4, "trace-derived-role-change", {"changed_roles": 1}
            ),
            structural_transformation=AxisObservation(
                0.5, "trace-derived-graph-delta", {"added_edges": 1}
            ),
            relation_graph_before={"sources": 2},
            relation_graph_after={"possibility": "yield"},
        )
        return CoreEpochView(
            relation_elements=(self.r1, self.r2),
            possibility_distribution={"proceed": 0.6, "yield": 0.4},
            role_trace_by_relation={
                ("E-old-yield", "rel-approach-gap"): ("recognition", "generation"),
                ("E-mid-merge", "rel-yield-opening"): ("constraint",),
            },
            generated_by_relation={
                ("E-old-yield", "rel-approach-gap"): ("yield",),
                ("E-mid-merge", "rel-yield-opening"): ("yield",),
            },
            reconstructions=(reconstruction,),
        )

    def ablate_relation(self, observation, relation):
        if relation == self.r1:
            # Deliberate zero individual distribution effect despite structural participation.
            return {"proceed": 0.6, "yield": 0.4}
        return {"proceed": 0.45, "yield": 0.55}

    def ablate_relation_group(self, observation, relations):
        return {"proceed": 0.2, "yield": 0.8}

    def realize(self, observation):
        return Realization("yield", VehicleActuation(throttle=0.15, brake=0.0, steer=0.01))


def run_dry_run():
    flow = SyntheticFlow()
    harness = CanonicalHarnessV11(SyntheticCore())
    execution = harness.execute_decision_epoch(flow)

    assert flow.apply_count == 1
    assert execution.before_fingerprint == "flow@10.0"
    assert execution.after_realization_fingerprint == "flow@10.05"
    assert len(execution.recorder.participation) == 2
    assert len(execution.recorder.group_participation) == 1
    assert len(execution.recorder.reconstruction) == 1

    first = execution.recorder.participation[0]
    assert first.distribution_effect == 0.0
    assert first.has_structural_participation

    joint = execution.recorder.group_participation[0]
    assert joint.joint_distribution_effect > first.distribution_effect

    history = execution.recorder.complete_history_entry(
        entry_id="synthetic-history-1",
        realized_tau=10.05,
        outcome_tau=10.10,
        relation_end_tau=10.20,
        selected_possibility_id=execution.realization.selected_possibility_id,
        realization_ref=execution.realization_ref,
        realization_count=1,
        outcome_description="relation process closed after a single synthetic realization",
        closure_method="synthetic relational process closure",
        closure_evidence={"closed": True},
    )
    assert len(history.provenance) == 2
    assert len(history.group_participation) == 1

    return {
        "dry_run": "PASS",
        "experimental_evidence": False,
        "apply_count": flow.apply_count,
        "decision_record": execution.recorder.decision_record(),
        "history": asdict(history),
    }


if __name__ == "__main__":
    result = run_dry_run()
    print(result["dry_run"])
    print("experimental_evidence=", result["experimental_evidence"])
