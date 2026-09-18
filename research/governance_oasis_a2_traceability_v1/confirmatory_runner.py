from __future__ import annotations

import argparse
from dataclasses import asdict, is_dataclass
import json
import os
from pathlib import Path
from typing import Any, Mapping, Sequence

from research.carla_v22_harness_v11.canonical_harness import PresentObservation
from research.g3_2_sidecar.common import RelationElementRef
from research.oasis_core_v11.current_relational_core import (
    BoundContribution,
    CurrentRelation,
    EpochEvaluation,
    PastRelationSemanticView,
    PossibilityCandidate,
    RelationContribution,
    ResponsibilityVector,
)
from research.oasis_core_v12.contracts import CurrentFrame
from research.choice_responsibility_v01.integration import (
    ChoiceContext,
    CurrentContextChoice,
    DecisionInputs,
    ResponsibilityAssessment,
    VerificationReport,
)
from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design

from .artifact_io import write_immutable_json
from .canonical import domain_digest
from .design_spec import build_design
from .evaluator import aggregate_axis, aggregate_outcomes, evaluate_run
from .fixtures import load_frozen_fixtures
from .instrumentation import SystemTraceBuilder
from .integrated_choice_adapter import InstrumentedPreferenceOperator, extract_consumed_envelopes
from .ledger import ReferenceLedger
from .models import (
    ClaimOutcome,
    EXECUTION_PROFILE_ID,
    RunEvaluation,
)
from .preflight import run_preflight
from .profile_io import load_execution_profile, verify_execution_profile


CONTRAST_ORDER = ("A2-I", "A2-R", "A2-O", "A2-N")
ARM_ORDER = {
    "A2-I": ("I0", "I1"),
    "A2-R": ("R0", "R1"),
    "A2-O": ("O0", "O1"),
    "A2-N": ("N1", "N2", "N3"),
}


class ConfirmatoryExecutionError(RuntimeError):
    pass


class FrozenPreference:
    def choose(self, *, context: Any, eligible_ids: Sequence[str]) -> str:
        eligible = tuple(str(x) for x in eligible_ids)
        if "continue-flow" in eligible:
            return "continue-flow"
        if not eligible:
            raise ConfirmatoryExecutionError("no eligible possibility at frozen preference boundary")
        return eligible[0]


def _plain(value: Any) -> Any:
    if is_dataclass(value):
        return _plain(asdict(value))
    if isinstance(value, Mapping):
        return {str(k): _plain(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [_plain(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return repr(value)


def _arm_sources(arm_id: str) -> tuple[tuple[str, str, str], ...]:
    mapping = {
        "I0": (("CE-A", "rel-identity", "intact"),),
        "I1": (("CE-B", "rel-identity", "intact"),),
        "R0": (("CE-R", "rel-R", "intact"),),
        "R1": (("CE-R", "rel-R", "ablated"),),
        "O0": (
            ("CE-1", "rel-1", "intact"),
            ("CE-2", "rel-2", "intact"),
            ("CE-3", "rel-3", "intact"),
        ),
        "O1": (
            ("CE-2", "rel-2", "intact"),
            ("CE-1", "rel-1", "intact"),
            ("CE-3", "rel-3", "intact"),
        ),
        "N1": (),
        "N2": (),
        "N3": (),
    }
    try:
        return mapping[arm_id]
    except KeyError as exc:
        raise ConfirmatoryExecutionError(f"unknown arm={arm_id}") from exc


def _semantic() -> PastRelationSemanticView:
    return PastRelationSemanticView(
        subject_role="current-agent",
        object_role="front-agent",
        relation_type="approach",
        relation_state="closed",
        process_context=("matched-process",),
        environment_context={"scene": "matched-current-flow-v1"},
        historical_roles=("co-observer",),
        possibility_links=("continue-flow",),
    )


def _contribution(ce_id: str, relation_id: str, relation_variant: str) -> BoundContribution:
    source = RelationElementRef(
        experience_id=ce_id,
        relation_element_id=relation_id,
        completed_at_tau=10.0,
        relation_descriptor={
            "relation_variant": relation_variant,
            "slot": relation_id,
        },
    )
    contribution = RelationContribution(
        possibility_id="continue-flow",
        current_relation_ids=("current-front",),
        role_trace=("matched-current-role",),
        generated_possibilities=(),
        trace={
            "relation_variant": relation_variant,
            "slot": relation_id,
        },
    )
    return BoundContribution(
        source=source,
        semantic=_semantic(),
        contribution=contribution,
    )


def build_choice_context(arm_id: str) -> ChoiceContext:
    observation = PresentObservation(
        epoch=1,
        ego_speed_mps=8.0,
        front_present=True,
        front_gap_m=20.0,
        front_closing_mps=0.5,
        front_kind="vehicle",
        local_heading_error_deg=0.0,
        local_density=1,
    )
    frame = CurrentFrame(
        observation=observation,
        tau=100.0,
        revision="A2-CONTROLLED-REVISION-V1",
        evidence=(),
    )
    current_relation = CurrentRelation(
        relation_id="current-front",
        subject_role="current-agent",
        object_role="front-agent",
        relation_type="approach",
        relation_state="active",
        process_context=("matched-process",),
        environment_context={"scene": "matched-current-flow-v1"},
    )
    candidates = (
        PossibilityCandidate(
            "continue-flow",
            ("current:front-relation",),
            {"fixture": "A2"},
        ),
        PossibilityCandidate(
            "yield-space",
            ("current:front-relation",),
            {"fixture": "A2"},
        ),
    )
    contributions = tuple(
        _contribution(ce_id, relation_id, relation_variant)
        for ce_id, relation_id, relation_variant in _arm_sources(arm_id)
    )
    responsibilities = {
        candidate.possibility_id: ResponsibilityVector(
            uncertainty=0.0,
            impact=0.0,
            irreversibility=0.0,
            time_constraint=0.0,
            evidence={"fixture": "A2"},
        )
        for candidate in candidates
    }
    evaluation = EpochEvaluation(
        tau=100.0,
        observation=observation,
        current_relations=(current_relation,),
        candidates=candidates,
        contributions=contributions,
        possibility_distribution={"continue-flow": 0.5, "yield-space": 0.5},
        reconstructions=(),
        responsibilities=responsibilities,
    )
    inputs = DecisionInputs(
        frame=frame,
        evaluation=evaluation,
        reentered_unresolved=(),
    )
    assessment = ResponsibilityAssessment(
        requests=(),
        conditions=(),
        conflicts=(),
        scheduling_rationale="A2 preregistered controlled confirmatory fixture.",
    )
    verification = VerificationReport(
        required_work=0.0,
        available_work=0.0,
        allocated_work=0.0,
        executed_work=0.0,
        unit="controlled-work-units",
        findings=(),
        omega=(),
        additional_unverified_scope=(),
    )
    return ChoiceContext(inputs, assessment, verification)


def _system_plane_envelopes(context: ChoiceContext) -> tuple[dict[str, str], ...]:
    """Independent OASIS-plane encoder; never reads the reference ledger or tap."""
    evaluation = context.inputs.evaluation
    buckets: dict[str, dict[str, Any]] = {}
    ordered_relation_elements: list[str] = []
    first_seen: list[str] = []

    for bound in tuple(evaluation.contributions):
        source = bound.source
        ce_id = str(source.experience_id)
        relation_id = str(source.relation_element_id)
        if relation_id not in ordered_relation_elements:
            ordered_relation_elements.append(relation_id)
        if ce_id not in buckets:
            first_seen.append(ce_id)
            buckets[ce_id] = {
                "semantics": [],
                "relations": [],
                "reconstructions": [],
            }
        bucket = buckets[ce_id]
        bucket["semantics"].append(_plain(bound.semantic))
        bucket["relations"].append(
            {
                "relation_element_id": relation_id,
                "relation_descriptor": _plain(source.relation_descriptor),
                "possibility_id": str(bound.contribution.possibility_id),
                "current_relation_ids": list(bound.contribution.current_relation_ids),
                "role_trace": list(bound.contribution.role_trace),
                "generated_possibilities": list(bound.contribution.generated_possibilities),
                "trace": _plain(bound.contribution.trace),
            }
        )

    order_digest = domain_digest(
        "A2_INTEGRATED_CHOICE_ORDER_V1",
        ordered_relation_elements,
    )
    return tuple(
        {
            "ce_instance_id": ce_id,
            "payload_digest": domain_digest(
                "A2_INTEGRATED_CHOICE_PAYLOAD_V1",
                buckets[ce_id]["semantics"],
            ),
            "relation_digest": domain_digest(
                "A2_INTEGRATED_CHOICE_RELATION_V1",
                {
                    "relations": buckets[ce_id]["relations"],
                    "reconstructions": buckets[ce_id]["reconstructions"],
                },
            ),
            "order_digest": order_digest,
        }
        for ce_id in first_seen
    )


def validate_production_dimension_isolation() -> None:
    refs = {
        arm_id: extract_consumed_envelopes(build_choice_context(arm_id))
        for arm_id in ("I0", "I1", "R0", "R1", "O0", "O1")
    }

    i0, i1 = refs["I0"][0], refs["I1"][0]
    if not (
        i0.ce_instance_id != i1.ce_instance_id
        and i0.payload_digest == i1.payload_digest
        and i0.relation_digest == i1.relation_digest
        and i0.order_digest == i1.order_digest
    ):
        raise ConfirmatoryExecutionError("A2-I production representation is not identity-isolated")

    r0, r1 = refs["R0"][0], refs["R1"][0]
    if not (
        r0.ce_instance_id == r1.ce_instance_id
        and r0.payload_digest == r1.payload_digest
        and r0.relation_digest != r1.relation_digest
        and r0.order_digest == r1.order_digest
    ):
        raise ConfirmatoryExecutionError("A2-R production representation is not relation-isolated")

    o0 = {x.ce_instance_id: x for x in refs["O0"]}
    o1 = {x.ce_instance_id: x for x in refs["O1"]}
    if set(o0) != set(o1):
        raise ConfirmatoryExecutionError("A2-O changed CE identity set")
    for ce_id in o0:
        if not (
            o0[ce_id].payload_digest == o1[ce_id].payload_digest
            and o0[ce_id].relation_digest == o1[ce_id].relation_digest
        ):
            raise ConfirmatoryExecutionError(f"A2-O changed non-order provenance for {ce_id}")
    if {x.order_digest for x in refs["O0"]} == {x.order_digest for x in refs["O1"]}:
        raise ConfirmatoryExecutionError("A2-O failed to change order provenance")


def _readiness_snapshot() -> dict[str, Any]:
    profile = load_execution_profile()
    profile_errors = verify_execution_profile(profile)
    design = validate_design(build_design())
    preflight = run_preflight(profile=profile, fixtures=load_frozen_fixtures())
    if profile_errors:
        raise ConfirmatoryExecutionError(f"execution profile mismatch={profile_errors}")
    if not design.proof_ready:
        raise ConfirmatoryExecutionError(f"design gate unresolved={design.unresolved_check_ids}")
    if not preflight.freeze_ready:
        raise ConfirmatoryExecutionError(f"preflight unresolved={preflight.unresolved_check_ids}")
    validate_production_dimension_isolation()
    return {
        "profile_id": profile.profile_id,
        "proof_ready": design.proof_ready,
        "preflight_state": preflight.state.value,
        "freeze_ready": preflight.freeze_ready,
        "production_dimensions_isolated": True,
    }


def _record_upstream_positive(
    *,
    system: SystemTraceBuilder,
    ledger: ReferenceLedger,
    envelopes: tuple[dict[str, str], ...],
    arm_id: str,
) -> None:
    for item in envelopes:
        ce_id = item["ce_instance_id"]
        kwargs = dict(
            ce_instance_id=ce_id,
            payload_digest=item["payload_digest"],
            relation_digest=item["relation_digest"],
            order_digest=item["order_digest"],
        )
        system.candidate(**kwargs, provenance_ref=f"A2:{arm_id}:{ce_id}")
        system.revalidate(ce_id, accepted=True)
        system.participate(ce_id, participated=True)
        ledger.observe_candidate(**kwargs)
        ledger.observe_revalidation(**kwargs, accepted=True)
        ledger.observe_participation(**kwargs, participated=True)


def _record_upstream_negative(
    *,
    system: SystemTraceBuilder,
    ledger: ReferenceLedger,
    fixture: Any,
) -> None:
    ce_id = fixture.identity_binding[0]
    kwargs = dict(
        ce_instance_id=ce_id,
        payload_digest=fixture.payload_semantic_hash,
        relation_digest=fixture.relation_digest,
        order_digest=fixture.order_digest,
    )
    candidate, revalidated, participated, consumed = fixture.expected_negative_state()
    if not candidate or consumed:
        raise ConfirmatoryExecutionError("invalid preregistered A2-N state")
    system.candidate(**kwargs, provenance_ref=f"A2:{fixture.arm_id}:{ce_id}")
    system.revalidate(ce_id, accepted=revalidated)
    system.participate(ce_id, participated=participated)
    ledger.observe_candidate(**kwargs)
    ledger.observe_revalidation(**kwargs, accepted=revalidated)
    ledger.observe_participation(**kwargs, participated=participated)


def execute_arm(*, fixture: Any, batch_id: str) -> tuple[RunEvaluation, dict[str, Any]]:
    run_id = f"{batch_id}:{fixture.contrast_id}:{fixture.arm_id}"
    decision_invocation_id = f"decision:{run_id}"
    common = dict(
        run_id=run_id,
        execution_profile_id=EXECUTION_PROFILE_ID,
        contrast_id=fixture.contrast_id,
        arm_id=fixture.arm_id,
        decision_invocation_id=decision_invocation_id,
    )
    system = SystemTraceBuilder(**common)
    ledger = ReferenceLedger(**common)
    context = build_choice_context(fixture.arm_id)
    system_envelopes = _system_plane_envelopes(context)

    if fixture.contrast_id == "A2-N":
        _record_upstream_negative(system=system, ledger=ledger, fixture=fixture)
    else:
        if not system_envelopes:
            raise ConfirmatoryExecutionError(f"{fixture.arm_id} has no positive CE input")
        _record_upstream_positive(
            system=system,
            ledger=ledger,
            envelopes=system_envelopes,
            arm_id=fixture.arm_id,
        )

    production_choice = CurrentContextChoice(
        InstrumentedPreferenceOperator(FrozenPreference(), ledger)
    )
    decision = production_choice.choose(context)

    if fixture.contrast_id != "A2-N":
        for item in system_envelopes:
            system.consume(item["ce_instance_id"])

    system_trace = system.seal()
    ledger.seal_pre_realization(system_trace_digest=system_trace.digest())
    ledger.realize(action_id=decision.selected_id or "NO_SELECTION")
    ledger.post_outcome(observation_id="A2_TRACEABILITY_POST_REALIZATION_BOUNDARY")

    result = evaluate_run(
        fixture=fixture,
        system_trace=system_trace,
        reference_ledger=ledger,
    )
    raw = {
        "run_id": run_id,
        "contrast_id": fixture.contrast_id,
        "arm_id": fixture.arm_id,
        "fixture": fixture.scientific_fields(),
        "decision": asdict(decision),
        "system_trace": system_trace.as_dict(),
        "reference_events": [event.as_dict() for event in ledger.events],
        "evaluation": result.as_dict(),
    }
    return result, raw


def execute_contrast(*, contrast_id: str, batch_id: str, output: Path) -> dict[str, Any]:
    if contrast_id not in CONTRAST_ORDER:
        raise ConfirmatoryExecutionError(f"unknown contrast={contrast_id}")
    readiness = _readiness_snapshot()
    fixtures = {x.arm_id: x for x in load_frozen_fixtures()}
    results: list[RunEvaluation] = []
    raw_arms: list[dict[str, Any]] = []

    for arm_id in ARM_ORDER[contrast_id]:
        result, raw = execute_arm(
            fixture=fixtures[arm_id],
            batch_id=batch_id,
        )
        results.append(result)
        raw_arms.append(raw)

    outcome = aggregate_outcomes(results)
    payload = {
        "schema": "governance-oasis-a2-confirmatory-contrast-result-v1",
        "experiment_id": "GO_A2_RELATION_ORDER_TRACEABILITY_V1",
        "execution_mode": "CONFIRMATORY_CONTROLLED_PRODUCTION_CHOICE_BOUNDARY",
        "batch_id": batch_id,
        "github_sha": os.environ.get("GITHUB_SHA", ""),
        "contrast_id": contrast_id,
        "readiness": readiness,
        "arms": raw_arms,
        "contrast_outcome": outcome.value,
        "complete_not_equal_supports": True,
    }
    write_immutable_json(output, payload)
    return payload


def aggregate_files(*, directory: Path, output: Path) -> dict[str, Any]:
    all_results: list[RunEvaluation] = []
    contrast_outcomes: dict[str, str] = {}
    batch_ids: set[str] = set()
    github_shas: set[str] = set()

    for contrast_id in CONTRAST_ORDER:
        path = directory / f"{contrast_id}.json"
        raw = json.loads(path.read_text(encoding="utf-8"))
        if raw["contrast_id"] != contrast_id:
            raise ConfirmatoryExecutionError(f"contrast file mismatch={path}")
        batch_ids.add(str(raw["batch_id"]))
        github_shas.add(str(raw.get("github_sha", "")))
        contrast_outcomes[contrast_id] = str(raw["contrast_outcome"])
        for arm in raw["arms"]:
            value = arm["evaluation"]
            all_results.append(
                RunEvaluation(
                    run_id=str(value["run_id"]),
                    contrast_id=str(value["contrast_id"]),
                    arm_id=str(value["arm_id"]),
                    outcome=ClaimOutcome(str(value["outcome"])),
                    reasons=tuple(str(x) for x in value["reasons"]),
                    matched_entries=int(value["matched_entries"]),
                    reference_consumed_ids=tuple(str(x) for x in value["reference_consumed_ids"]),
                    system_consumed_ids=tuple(str(x) for x in value["system_consumed_ids"]),
                )
            )

    if len(batch_ids) != 1:
        raise ConfirmatoryExecutionError(f"mixed confirmatory batch ids={sorted(batch_ids)}")
    if len(github_shas) != 1:
        raise ConfirmatoryExecutionError(f"mixed execution SHAs={sorted(github_shas)}")

    axis_outcome = aggregate_axis(all_results)
    payload = {
        "schema": "governance-oasis-a2-confirmatory-axis-result-v1",
        "experiment_id": "GO_A2_RELATION_ORDER_TRACEABILITY_V1",
        "batch_id": next(iter(batch_ids)),
        "github_sha": next(iter(github_shas)),
        "sequence": list(CONTRAST_ORDER),
        "contrast_outcomes": contrast_outcomes,
        "axis_outcome": axis_outcome.value,
        "experiment_complete": True,
        "complete_not_equal_supports": True,
    }
    write_immutable_json(output, payload)
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contrast", choices=CONTRAST_ORDER)
    parser.add_argument("--batch-id")
    parser.add_argument("--output")
    parser.add_argument("--aggregate-dir")
    parser.add_argument("--aggregate-output")
    args = parser.parse_args()

    if args.contrast:
        if not args.batch_id or not args.output:
            raise SystemExit("--contrast requires --batch-id and --output")
        result = execute_contrast(
            contrast_id=args.contrast,
            batch_id=args.batch_id,
            output=Path(args.output),
        )
    else:
        if not args.aggregate_dir or not args.aggregate_output:
            raise SystemExit("aggregation requires --aggregate-dir and --aggregate-output")
        result = aggregate_files(
            directory=Path(args.aggregate_dir),
            output=Path(args.aggregate_output),
        )
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
