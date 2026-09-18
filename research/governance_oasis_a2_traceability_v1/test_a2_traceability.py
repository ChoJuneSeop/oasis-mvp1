from __future__ import annotations

from dataclasses import replace
import json
from pathlib import Path
import tempfile
import unittest

from research.governance_oasis_scientific_proof_harness_v1.design_gate import validate_design

from .adapter import DecisionBoundaryTap, DecisionInputEnvelope
from .artifact_io import write_immutable_json
from .design_spec import build_design
from .evaluator import aggregate_axis, evaluate_run
from .fixtures import build_default_fixtures, load_frozen_fixtures, validate_fixture_isolation
from .instrumentation import SystemTraceBuilder
from .confirmatory_runner import validate_production_dimension_isolation
from .ledger import LedgerIntegrityError, ReferenceLedger
from .models import (
    A2ExecutionProfile,
    ClaimOutcome,
    EXECUTION_PROFILE_ID,
    HARNESS_FREEZE_COMMIT,
    SOURCE_FREEZE_COMMIT,
)
from .preflight import run_preflight
from .profile_io import load_execution_profile, verify_execution_profile


def _profile() -> A2ExecutionProfile:
    h = "a" * 64
    return A2ExecutionProfile(
        profile_id=EXECUTION_PROFILE_ID,
        harness_freeze_commit=HARNESS_FREEZE_COMMIT,
        source_freeze_commit=SOURCE_FREEZE_COMMIT,
        experiment_definition_hash=h,
        confirmatory_plan_hash=h,
        ce_registry_hash=h,
        world_snapshot_hash=h,
        worker_build_hash=h,
        system_trace_build_hash=h,
        reference_recorder_build_hash=h,
        evaluator_build_hash=h,
    )


def _matched_run(fixture, suffix: str = "1"):
    run_id = f"RUN-{fixture.arm_id}-{suffix}"
    invocation = f"DEC-{fixture.arm_id}-{suffix}"
    common = dict(
        run_id=run_id,
        execution_profile_id=EXECUTION_PROFILE_ID,
        contrast_id=fixture.contrast_id,
        arm_id=fixture.arm_id,
        decision_invocation_id=invocation,
    )
    system = SystemTraceBuilder(**common)
    ledger = ReferenceLedger(**common)

    ce = fixture.identity_binding[0]
    payload = fixture.payload_semantic_hash
    relation = fixture.relation_digest
    order = fixture.order_digest

    system.candidate(
        ce_instance_id=ce,
        payload_digest=payload,
        relation_digest=relation,
        order_digest=order,
        provenance_ref=f"fixture:{fixture.arm_id}",
    )
    ledger.observe_candidate(
        ce_instance_id=ce,
        payload_digest=payload,
        relation_digest=relation,
        order_digest=order,
    )

    expected = fixture.expected_negative_state()
    if expected is None:
        accepted, participated, consumed = True, True, True
    else:
        _, accepted, participated, consumed = expected

    system.revalidate(ce, accepted=accepted)
    ledger.observe_revalidation(
        ce_instance_id=ce,
        accepted=accepted,
        payload_digest=payload,
        relation_digest=relation,
        order_digest=order,
    )
    system.participate(ce, participated=participated)
    ledger.observe_participation(
        ce_instance_id=ce,
        participated=participated,
        payload_digest=payload,
        relation_digest=relation,
        order_digest=order,
    )
    if consumed:
        system.consume(ce)
        ledger.observe_decision_input_consumed(
            ce_instance_id=ce,
            payload_digest=payload,
            relation_digest=relation,
            order_digest=order,
        )

    trace = system.seal()
    ledger.seal_pre_realization(system_trace_digest=trace.digest())
    ledger.realize(action_id="continue-flow")
    ledger.post_outcome(observation_id="post")
    return trace, ledger


class A2TraceabilityTests(unittest.TestCase):
    def test_frozen_scientific_harness_accepts_a2_design(self):
        report = validate_design(build_design())
        self.assertTrue(report.proof_ready, report.unresolved_check_ids)

    def test_fixture_isolation(self):
        generated = build_default_fixtures()
        frozen = load_frozen_fixtures()
        self.assertEqual(validate_fixture_isolation(generated), ())
        self.assertEqual(generated, frozen)

    def test_frozen_execution_profile_matches_artifacts(self):
        profile = load_execution_profile()
        self.assertEqual(verify_execution_profile(profile), ())

    def test_preflight_is_fail_closed_and_ready_for_valid_contract(self):
        report = run_preflight(profile=load_execution_profile(), fixtures=load_frozen_fixtures())
        self.assertTrue(report.freeze_ready, report.unresolved_check_ids)
        self.assertEqual(len(report.checks), len(report.required_check_ids))

    def test_production_dimension_isolation(self):
        validate_production_dimension_isolation()

    def test_consumption_digest_mismatch_is_invalid(self):
        fixture = next(x for x in build_default_fixtures() if x.arm_id == "I0")
        trace, ledger = _matched_run(fixture, suffix="digest-mismatch")
        consumed_index = next(
            i for i, event in enumerate(ledger._events)
            if event.event_type.value == "DECISION_INPUT_CONSUMED"
        )
        event = ledger._events[consumed_index]
        ledger._events[consumed_index] = replace(
            event,
            payload_digest="different-consumption-digest",
            event_hash="",
        )
        # Rebuild downstream chain hashes so the scientific evaluator sees an internally
        # hash-valid ledger whose candidate and consumption provenance disagree.
        rebuilt = []
        previous = ""
        for raw in ledger._events:
            updated = replace(raw, previous_event_hash=previous, event_hash="")
            updated = replace(updated, event_hash=updated.computed_hash())
            rebuilt.append(updated)
            previous = updated.event_hash
        ledger._events = rebuilt
        result = evaluate_run(fixture=fixture, system_trace=trace, reference_ledger=ledger)
        self.assertEqual(result.outcome, ClaimOutcome.INVALID)

    def test_all_default_arms_match_independent_reference_plane(self):
        results = []
        for fixture in build_default_fixtures():
            trace, ledger = _matched_run(fixture)
            result = evaluate_run(fixture=fixture, system_trace=trace, reference_ledger=ledger)
            self.assertEqual(result.outcome, ClaimOutcome.SUPPORTS, result.reasons)
            results.append(result)
        self.assertEqual(aggregate_axis(results), ClaimOutcome.SUPPORTS)

    def test_false_attribution_is_does_not_support(self):
        fixture = next(x for x in build_default_fixtures() if x.arm_id == "I0")
        trace, ledger = _matched_run(fixture)
        bad_entry = replace(trace.entries[0], ce_instance_id="CE-WRONG")
        bad_trace = replace(trace, entries=(bad_entry,))
        # Seal binding is intentionally refreshed so this tests scientific mismatch,
        # not integrity mismatch.
        common = dict(
            run_id=ledger.run_id,
            execution_profile_id=ledger.execution_profile_id,
            contrast_id=ledger.contrast_id,
            arm_id=ledger.arm_id,
            decision_invocation_id=ledger.decision_invocation_id,
        )
        rebuilt = ReferenceLedger(**common)
        for event in ledger.events:
            if event.event_type.value == "CANDIDATE_OBSERVED":
                rebuilt.observe_candidate(
                    ce_instance_id=event.ce_instance_id,
                    payload_digest=event.payload_digest,
                    relation_digest=event.relation_digest,
                    order_digest=event.order_digest,
                )
            elif event.event_type.value == "REVALIDATION_OBSERVED":
                rebuilt.observe_revalidation(
                    ce_instance_id=event.ce_instance_id,
                    accepted=event.metadata["accepted"],
                    payload_digest=event.payload_digest,
                    relation_digest=event.relation_digest,
                    order_digest=event.order_digest,
                )
            elif event.event_type.value == "PARTICIPATION_OBSERVED":
                rebuilt.observe_participation(
                    ce_instance_id=event.ce_instance_id,
                    participated=event.metadata["participated"],
                    payload_digest=event.payload_digest,
                    relation_digest=event.relation_digest,
                    order_digest=event.order_digest,
                )
            elif event.event_type.value == "DECISION_INPUT_CONSUMED":
                rebuilt.observe_decision_input_consumed(
                    ce_instance_id=event.ce_instance_id,
                    payload_digest=event.payload_digest,
                    relation_digest=event.relation_digest,
                    order_digest=event.order_digest,
                )
        rebuilt.seal_pre_realization(system_trace_digest=bad_trace.digest())
        rebuilt.realize(action_id="continue-flow")
        rebuilt.post_outcome(observation_id="post")

        result = evaluate_run(fixture=fixture, system_trace=bad_trace, reference_ledger=rebuilt)
        self.assertEqual(result.outcome, ClaimOutcome.DOES_NOT_SUPPORT)

    def test_hash_tamper_is_invalid(self):
        fixture = next(x for x in build_default_fixtures() if x.arm_id == "I0")
        trace, ledger = _matched_run(fixture)
        ledger._events[0] = replace(ledger._events[0], metadata={"tampered": True})  # attack test
        result = evaluate_run(fixture=fixture, system_trace=trace, reference_ledger=ledger)
        self.assertEqual(result.outcome, ClaimOutcome.INVALID)

    def test_decision_boundary_tap_records_reference_consumption(self):
        fixture = next(x for x in build_default_fixtures() if x.arm_id == "I0")
        ledger = ReferenceLedger(
            run_id="TAP",
            execution_profile_id=EXECUTION_PROFILE_ID,
            contrast_id=fixture.contrast_id,
            arm_id=fixture.arm_id,
            decision_invocation_id="D-TAP",
        )
        ce = fixture.identity_binding[0]
        ledger.observe_candidate(
            ce_instance_id=ce,
            payload_digest=fixture.payload_semantic_hash,
            relation_digest=fixture.relation_digest,
            order_digest=fixture.order_digest,
        )
        ledger.observe_revalidation(
            ce_instance_id=ce,
            accepted=True,
            payload_digest=fixture.payload_semantic_hash,
            relation_digest=fixture.relation_digest,
            order_digest=fixture.order_digest,
        )
        ledger.observe_participation(
            ce_instance_id=ce,
            participated=True,
            payload_digest=fixture.payload_semantic_hash,
            relation_digest=fixture.relation_digest,
            order_digest=fixture.order_digest,
        )
        envelope = DecisionInputEnvelope(
            ce_instance_id=ce,
            payload_digest=fixture.payload_semantic_hash,
            relation_digest=fixture.relation_digest,
            order_digest=fixture.order_digest,
        )
        result = DecisionBoundaryTap(ledger).invoke(lambda inputs: inputs[0].ce_instance_id, [envelope])
        self.assertEqual(result, ce)
        self.assertTrue(any(e.event_type.value == "DECISION_INPUT_CONSUMED" for e in ledger.events))

    def test_immutable_artifact_writer_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "result.json"
            write_immutable_json(path, {"v": 1})
            with self.assertRaises(FileExistsError):
                write_immutable_json(path, {"v": 2})

    def test_realization_before_seal_and_double_realization_are_blocked(self):
        fixture = next(x for x in build_default_fixtures() if x.arm_id == "I0")
        ledger = ReferenceLedger(
            run_id="X",
            execution_profile_id=EXECUTION_PROFILE_ID,
            contrast_id=fixture.contrast_id,
            arm_id=fixture.arm_id,
            decision_invocation_id="D",
        )
        with self.assertRaises(LedgerIntegrityError):
            ledger.realize(action_id="forbidden")

        trace, sealed = _matched_run(fixture, suffix="double")
        with self.assertRaises(LedgerIntegrityError):
            sealed.realize(action_id="forbidden-second")


if __name__ == "__main__":
    unittest.main()
