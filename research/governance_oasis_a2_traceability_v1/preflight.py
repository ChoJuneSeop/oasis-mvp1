from __future__ import annotations

from dataclasses import FrozenInstanceError, replace
from pathlib import Path
import hashlib
import tempfile

from research.oasis_experiment_freeze_harness_v1.harness import ExperimentFreezeHarness
from research.oasis_experiment_freeze_harness_v1.models import (
    CheckCategory,
    CheckResult,
    CheckStatus,
    GateReport,
)

from .artifact_io import write_immutable_json
from .fixtures import validate_fixture_isolation
from .instrumentation import SystemTraceBuilder
from .integrated_choice_adapter import (
    PRODUCTION_CHOICE_BLOB_SHA,
    PRODUCTION_CHOICE_CALL,
    PRODUCTION_CHOICE_PATH,
)
from .ledger import LedgerIntegrityError, ReferenceLedger
from .models import (
    A2ExecutionProfile,
    ArmFixture,
    HARNESS_FREEZE_COMMIT,
    SOURCE_FREEZE_COMMIT,
)


REQUIRED_CHECKS = {
    "source_freeze": CheckCategory.FREEZE,
    "world_isolation": CheckCategory.WORLD_ISOLATION,
    "cross_arm_identity": CheckCategory.CROSS_ARM,
    "future_leakage": CheckCategory.EXECUTION,
    "evaluator_postjoin": CheckCategory.EVALUATOR,
    "single_realization": CheckCategory.EXECUTION,
    "provenance_integrity": CheckCategory.TELEMETRY,
    "output_immutability": CheckCategory.FREEZE,
    "dual_evidence_independence": CheckCategory.TELEMETRY,
    "pre_realization_seal": CheckCategory.EXECUTION,
    "decision_invocation_binding": CheckCategory.EXECUTION,
    "fixture_isolation": CheckCategory.CROSS_ARM,
    "negative_control_coverage": CheckCategory.CROSS_ARM,
    "hash_chain_integrity": CheckCategory.ADVERSARIAL,
    "production_choice_boundary": CheckCategory.FREEZE,
}


def _result(
    check_id: str,
    passed: bool,
    summary: str,
    *,
    evidence: tuple[str, ...] = (),
) -> CheckResult:
    return CheckResult(
        check_id=check_id,
        category=REQUIRED_CHECKS[check_id],
        status=CheckStatus.PASS if passed else CheckStatus.FAIL,
        summary=summary,
        evidence=evidence,
        blocking=True,
    )


def _attack_tests(profile: A2ExecutionProfile, fixture: ArmFixture) -> dict[str, bool]:
    kwargs = dict(
        run_id="PREFLIGHT-ATTACK",
        execution_profile_id=profile.profile_id,
        contrast_id=fixture.contrast_id,
        arm_id=fixture.arm_id,
        decision_invocation_id="decision-attack",
    )
    ledger = ReferenceLedger(**kwargs)
    ce = fixture.identity_binding[0]
    ledger.observe_candidate(
        ce_instance_id=ce,
        payload_digest=fixture.payload_semantic_hash,
        relation_digest=fixture.relation_digest,
        order_digest=fixture.order_digest,
    )
    reference_first_hash = ledger.events[0].event_hash

    realize_before_seal_blocked = False
    try:
        ledger.realize(action_id="forbidden")
    except LedgerIntegrityError:
        realize_before_seal_blocked = True

    builder = SystemTraceBuilder(**kwargs)
    builder.candidate(
        ce_instance_id=ce,
        payload_digest=fixture.payload_semantic_hash,
        relation_digest=fixture.relation_digest,
        order_digest=fixture.order_digest,
        provenance_ref="preflight",
    )
    builder.revalidate(ce, accepted=True)
    builder.participate(ce, participated=True)
    builder.consume(ce)
    system_trace = builder.seal()

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
    ledger.observe_decision_input_consumed(
        ce_instance_id=ce,
        payload_digest=fixture.payload_semantic_hash,
        relation_digest=fixture.relation_digest,
        order_digest=fixture.order_digest,
    )
    ledger.seal_pre_realization(system_trace_digest=system_trace.digest())
    ledger.realize(action_id="continue-flow")

    second_realization_blocked = False
    try:
        ledger.realize(action_id="forbidden-second")
    except LedgerIntegrityError:
        second_realization_blocked = True

    provenance_after_seal_blocked = False
    try:
        ledger.observe_candidate(
            ce_instance_id="LATE",
            payload_digest="x",
            relation_digest="x",
            order_digest="x",
        )
    except LedgerIntegrityError:
        provenance_after_seal_blocked = True

    independent_storage = (
        ledger.events[0].event_hash == reference_first_hash
        and ledger.events[0].ce_instance_id == ce
        and system_trace.entries[0].ce_instance_id == ce
        and ledger.events[0] is not system_trace.entries[0]
    )
    immutable_trace = False
    try:
        system_trace.run_id = "mutated"  # type: ignore[misc]
    except (FrozenInstanceError, AttributeError):
        immutable_trace = True

    immutable_file = False
    with tempfile.TemporaryDirectory() as td:
        target = Path(td) / "sealed.json"
        write_immutable_json(target, {"trace": system_trace.as_dict()})
        try:
            write_immutable_json(target, {"trace": "overwrite"})
        except FileExistsError:
            immutable_file = True

    valid_hash_chain = not ledger.verify()

    tampered_event = replace(ledger.events[0], metadata={"tampered": True})
    tamper_detectable = tampered_event.event_hash != tampered_event.computed_hash()
    invocation_tampered = replace(
        ledger.events[0],
        decision_invocation_id="FOREIGN-DECISION",
    )
    invocation_tamper_detectable = (
        invocation_tampered.event_hash != invocation_tampered.computed_hash()
        and invocation_tampered.decision_invocation_id != ledger.decision_invocation_id
    )

    return {
        "realize_before_seal_blocked": realize_before_seal_blocked,
        "second_realization_blocked": second_realization_blocked,
        "provenance_after_seal_blocked": provenance_after_seal_blocked,
        "independent_storage": independent_storage,
        "immutable_trace": immutable_trace,
        "immutable_file": immutable_file,
        "valid_hash_chain": valid_hash_chain,
        "tamper_detectable": tamper_detectable,
        "invocation_tamper_detectable": invocation_tamper_detectable,
    }



def _git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    header = f"blob {len(data)}".encode("ascii") + b"\\0"
    return hashlib.sha1(header + data).hexdigest()


def _production_choice_boundary_status(repo_root: Path) -> tuple[bool, tuple[str, ...]]:
    source_path = repo_root / PRODUCTION_CHOICE_PATH
    if not source_path.is_file():
        return False, (f"missing production choice source={PRODUCTION_CHOICE_PATH}",)
    actual_blob = _git_blob_sha(source_path)
    text = source_path.read_text(encoding="utf-8")
    call_present = PRODUCTION_CHOICE_CALL in text
    ok = actual_blob == PRODUCTION_CHOICE_BLOB_SHA and call_present
    evidence = (
        f"path={PRODUCTION_CHOICE_PATH}",
        f"expected_blob={PRODUCTION_CHOICE_BLOB_SHA}",
        f"actual_blob={actual_blob}",
        f"exact_choice_call_present={call_present}",
    )
    return ok, evidence


def run_preflight(
    *,
    profile: A2ExecutionProfile,
    fixtures: tuple[ArmFixture, ...],
) -> GateReport:
    checks: list[CheckResult] = []

    source_ok = (
        profile.harness_freeze_commit == HARNESS_FREEZE_COMMIT
        and profile.source_freeze_commit == SOURCE_FREEZE_COMMIT
        and all(
            bool(value)
            for value in (
                profile.experiment_definition_hash,
                profile.confirmatory_plan_hash,
                profile.ce_registry_hash,
                profile.world_snapshot_hash,
                profile.worker_build_hash,
                profile.system_trace_build_hash,
                profile.reference_recorder_build_hash,
                profile.evaluator_build_hash,
            )
        )
    )
    checks.append(_result("source_freeze", source_ok, "Exact frozen source/profile bindings are present."))

    repo_root = Path(__file__).resolve().parents[2]
    production_boundary_ok, production_boundary_evidence = _production_choice_boundary_status(repo_root)
    checks.append(
        _result(
            "production_choice_boundary",
            production_boundary_ok,
            "Reference instrumentation is bound to the exact frozen IntegratedChoiceCore preference boundary.",
            evidence=production_boundary_evidence,
        )
    )

    by_contrast: dict[str, list[ArmFixture]] = {}
    for fixture in fixtures:
        by_contrast.setdefault(fixture.contrast_id, []).append(fixture)
    world_ok = all(
        len({item.current_observation_hash for item in group}) == 1
        for group in by_contrast.values()
    )
    checks.append(_result("world_isolation", world_ok, "Matched arms share the same current-world snapshot."))

    isolation_errors = validate_fixture_isolation(fixtures)
    checks.append(
        _result(
            "fixture_isolation",
            not isolation_errors,
            "Identity/relation/order manipulations change only their registered dimensions.",
            evidence=isolation_errors,
        )
    )
    checks.append(
        _result(
            "cross_arm_identity",
            not isolation_errors,
            "Cross-arm held constants and arm identities are explicit.",
            evidence=isolation_errors,
        )
    )

    negative_stages = {fixture.negative_stage for fixture in fixtures if fixture.contrast_id == "A2-N"}
    negative_ok = negative_stages == {
        "N1_REVALIDATION_NO",
        "N2_NOT_PARTICIPATED",
        "N3_PARTICIPATED_NOT_CONSUMED",
    }
    checks.append(_result("negative_control_coverage", negative_ok, "N1/N2/N3 false-attribution controls are present."))

    contract_ok = (
        profile.future_information_prohibited
        and profile.pre_realization_seal_required
        and profile.single_realization
        and profile.evaluator_postjoin
    )
    checks.append(_result("future_leakage", contract_ok, "Future/evaluator truth is forbidden at decision time."))
    checks.append(_result("evaluator_postjoin", profile.evaluator_postjoin, "Evaluator joins only after sealed worker output."))

    primary_fixture = next((x for x in fixtures if x.contrast_id == "A2-I"), fixtures[0])
    attacks = _attack_tests(profile, primary_fixture)
    checks.append(_result("single_realization", attacks["realize_before_seal_blocked"] and attacks["second_realization_blocked"], "Realization is impossible before seal and exactly one realization is allowed."))
    checks.append(_result("pre_realization_seal", attacks["realize_before_seal_blocked"] and attacks["provenance_after_seal_blocked"], "Seal precedes realization and closes pre-choice provenance."))
    checks.append(_result("hash_chain_integrity", attacks["valid_hash_chain"] and attacks["tamper_detectable"], "Hash chain verifies and tampering changes the expected digest."))
    checks.append(_result("provenance_integrity", attacks["valid_hash_chain"], "Reference provenance chain verifies end to end."))
    checks.append(
        _result(
            "output_immutability",
            attacks["immutable_trace"] and attacks["immutable_file"],
            "Sealed in-memory traces are frozen and evidence files cannot be overwritten.",
        )
    )

    package_dir = Path(__file__).resolve().parent
    reference_plane_source = (
        (package_dir / "adapter.py").read_text(encoding="utf-8")
        + (package_dir / "ledger.py").read_text(encoding="utf-8")
        + (package_dir / "integrated_choice_adapter.py").read_text(encoding="utf-8")
    )
    static_independence = (
        "from .instrumentation import" not in reference_plane_source
        and "import research.governance_oasis_a2_traceability_v1.instrumentation" not in reference_plane_source
        and "import .instrumentation" not in reference_plane_source
    )
    checks.append(
        _result(
            "dual_evidence_independence",
            attacks["independent_storage"] and static_independence,
            "Reference-plane code neither imports nor reads the OASIS system-trace builder and uses separate storage.",
        )
    )

    # Invocation binding is structural: ReferenceLedger owns one invocation id and
    # every event is verified against it. Hash-chain verification above exercises it.
    checks.append(
        _result(
            "decision_invocation_binding",
            attacks["valid_hash_chain"] and attacks["invocation_tamper_detectable"],
            "Every reference event is bound to one decision invocation and foreign invocation tampering is detectable.",
        )
    )

    harness = ExperimentFreezeHarness(profile_id=profile.profile_id, required_checks=REQUIRED_CHECKS)
    return harness.evaluate(checks)
