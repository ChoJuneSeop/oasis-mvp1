from __future__ import annotations

import ast
import json
from pathlib import Path
import subprocess
from typing import Iterable

from .git_utils import git_blob, git_text, is_ancestor
from .harness import ExperimentFreezeHarness
from .models import CheckCategory, CheckResult, CheckStatus, GateReport


PROFILE_ID = "GOVERNANCE_CBRA_CARLA_RUN5_PREEXEC_V1"

REQUIRED_CHECKS = {
    "definition_matrix_contract": CheckCategory.DEFINITION,
    "causal_predecision_leakage": CheckCategory.CAUSAL,
    "execution_world_isolation": CheckCategory.WORLD_ISOLATION,
    "cross_arm_scene_identity": CheckCategory.CROSS_ARM,
    "scope_ambient_contamination": CheckCategory.EXECUTION,
    "topology_spawn_binding": CheckCategory.EXECUTION,
    "evaluator_boundary": CheckCategory.EVALUATOR,
    "closure_integrity": CheckCategory.EXECUTION,
    "cbra_lifecycle": CheckCategory.CBRA,
    "telemetry_window": CheckCategory.TELEMETRY,
    "freeze_triple_integrity": CheckCategory.FREEZE,
    "immutable_execution_ref": CheckCategory.FREEZE,
    "adversarial_recheck": CheckCategory.ADVERSARIAL,
}

RUN5_DIR = "research/governance_cbra_carla_pilot_v1"
MANIFEST_PATH = f"{RUN5_DIR}/RUN5_FREEZE_MANIFEST.json"
MATRIX_PATH = f"{RUN5_DIR}/PILOT_MATRIX.json"
RUNTIME_PATH = f"{RUN5_DIR}/pilot_runtime.py"
RUNNER_PATH = f"{RUN5_DIR}/pilot_runner.py"
PREEXEC_TEST_PATH = f"{RUN5_DIR}/test_pilot_preexec.py"


def _source(root: Path, ref: str, path: str) -> str:
    return subprocess.check_output(
        ["git", "show", f"{ref}:{path}"],
        cwd=root,
        text=True,
        encoding="utf-8",
    )


def _exists(root: Path, ref: str, path: str) -> bool:
    return subprocess.run(
        ["git", "cat-file", "-e", f"{ref}:{path}"],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0


def _node_source(source: str, *, class_name: str | None = None, function_name: str | None = None) -> str:
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if class_name and isinstance(node, ast.ClassDef) and node.name == class_name:
            return ast.get_source_segment(source, node) or ""
        if function_name and isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == function_name:
            return ast.get_source_segment(source, node) or ""
    return ""


def _result(
    check_id: str,
    category: CheckCategory,
    passed: bool | None,
    summary: str,
    *evidence: str,
) -> CheckResult:
    status = (
        CheckStatus.PASS
        if passed is True
        else CheckStatus.FAIL
        if passed is False
        else CheckStatus.UNVERIFIED
    )
    return CheckResult(
        check_id=check_id,
        category=category,
        status=status,
        summary=summary,
        evidence=tuple(evidence),
        blocking=True,
    )


def _definition_matrix_contract(root: Path, ref: str) -> CheckResult:
    matrix = json.loads(_source(root, ref, MATRIX_PATH))
    arms = tuple(matrix.get("arms", ()))
    failures = tuple(matrix.get("failure_classes", ()))
    contexts = tuple(matrix.get("reentry_contexts", ()))
    units = tuple(matrix.get("units", ()))
    expected = {(a, f, c) for a in arms for f in failures for c in contexts}
    actual = {(u["arm"], u["failure_class"], u["reentry_context"]) for u in units}
    shared_seed = True
    for f in failures:
        for c in contexts:
            group = [u for u in units if u["failure_class"] == f and u["reentry_context"] == c]
            if len(group) != len(arms) or len({u["seed"] for u in group}) != 1:
                shared_seed = False
                break
    passed = (
        len(arms) == 3
        and len(failures) == 6
        and len(contexts) == 3
        and len(units) == 54
        and matrix.get("unit_count") == 54
        and actual == expected
        and shared_seed
    )
    return _result(
        "definition_matrix_contract",
        CheckCategory.DEFINITION,
        passed,
        "54-unit Cartesian matrix and shared scenario seeds are exact" if passed else "matrix cardinality/product/seed pairing drifted",
        f"arms={len(arms)} failures={len(failures)} contexts={len(contexts)} units={len(units)}",
        f"shared_seed_per_triplet={shared_seed}",
    )


def _causal_predecision_leakage(root: Path, ref: str) -> CheckResult:
    runtime = _source(root, ref, RUNTIME_PATH)
    runner = _source(root, ref, RUNNER_PATH)
    participation = _node_source(runtime, class_name="PilotParticipation")
    responsibility = _node_source(runtime, class_name="PilotResponsibility")
    spawn = _node_source(runtime, function_name="_spawn_ego")
    admission = _node_source(runtime, function_name="admit_relation_cycle")
    stage_gap = _node_source(runner, function_name="_stage_gap")
    protected = "\n".join((participation, responsibility, spawn, admission, stage_gap))
    forbidden = (
        "failure_class",
        "SUCCESS_CONTROL",
        "PARTICIPATION_COMMISSION_FAILURE",
        "PARTICIPATION_OMISSION_FAILURE",
        "RESPONSIBILITY_AXIS_FAILURE",
        "EXOGENOUS_FAILURE",
        "DELAYED_FAILURE",
    )
    hits = tuple(token for token in forbidden if token in protected)
    passed = not hits
    return _result(
        "causal_predecision_leakage",
        CheckCategory.CAUSAL,
        passed,
        "No matrix failure label enters scene admission or Governance decision operators" if passed else "Failure-label leakage reached a protected predecision component",
        f"forbidden_hits={list(hits)}",
    )


def _execution_world_isolation(root: Path, ref: str) -> CheckResult:
    runtime = _source(root, ref, RUNTIME_PATH)
    runner = _source(root, ref, RUNNER_PATH)
    has_contract = (
        "WORLD_ISOLATION" in runner
        and "verify_world_isolation" in (runtime + runner)
        and "before_unit" in (runtime + runner)
        and "after_unit" in (runtime + runner)
    )
    return _result(
        "execution_world_isolation",
        CheckCategory.WORLD_ISOLATION,
        has_contract,
        "Each unit proves a clean pre-state and clean post-state" if has_contract else "No fail-closed before/after unit world-isolation attestation exists",
        "PilotScene explicitly runs without world reload",
        "cleanup destroys owned ego/counterpart but does not attest absence of residual experimental actors or equivalent world fingerprint",
    )


def _cross_arm_scene_identity(root: Path, ref: str) -> CheckResult:
    runner = _source(root, ref, RUNNER_PATH)
    required_tokens = (
        "SCENARIO_IDENTITY.json",
        "spawn_index",
        "topology",
        "baseline",
        "triplet",
    )
    missing = tuple(token for token in required_tokens if token not in runner)
    passed = not missing
    return _result(
        "cross_arm_scene_identity",
        CheckCategory.CROSS_ARM,
        passed,
        "Three arms are fail-closed on an identical realized scenario identity" if passed else "Shared seed is present, but realized cross-arm scene identity is not enforced",
        f"missing_contract_tokens={list(missing)}",
        "A seed fixes candidate ordering but is not itself proof that the live CARLA state realized identically across subprocesses",
    )


def _scope_ambient_contamination(root: Path, ref: str) -> CheckResult:
    runtime = _source(root, ref, RUNTIME_PATH)
    scope = _node_source(runtime, function_name="scope_signature")
    spawn = _node_source(runtime, function_name="_spawn_ego")
    admission = _node_source(runtime, function_name="admit_relation_cycle")
    density_in_scope = "local_density" in scope

    def has_density_guard(source: str) -> bool:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.If):
                test = ast.get_source_segment(source, node.test) or ""
                if "local_density" in test:
                    return True
        return False

    density_gated = has_density_guard(spawn) or has_density_guard(admission)
    passed = (not density_in_scope) or density_gated
    return _result(
        "scope_ambient_contamination",
        CheckCategory.EXECUTION,
        passed,
        "Every scope-signature field that can be ambient is controlled at admission" if passed else "local_density participates in scope identity but admission does not fail closed on ambient density",
        f"local_density_in_scope_signature={density_in_scope}",
        f"local_density_admission_gate={density_gated}",
    )


def _topology_spawn_binding(root: Path, ref: str) -> CheckResult:
    runtime = _source(root, ref, RUNTIME_PATH)
    spawn_ego = _node_source(runtime, function_name="_spawn_ego")
    spawn_counterpart = _node_source(runtime, function_name="spawn_counterpart")
    # Strong contract: pre-admission must persist an approved topology candidate
    # and the actual counterpart spawn must consume/verify that identity rather
    # than merely recompute an independent nxt[0] traversal.
    persisted = "admitted_topology" in spawn_ego
    consumed = (
        "admitted_topology" in spawn_counterpart
        and (
            "road_id" in spawn_counterpart
            and "lane_id" in spawn_counterpart
        )
    )
    passed = persisted and consumed
    return _result(
        "topology_spawn_binding",
        CheckCategory.EXECUTION,
        passed,
        "Actual counterpart construction is bound to the topology admitted before execution" if passed else "Topology admission and actual counterpart construction are separate waypoint traversals without an explicit identity binding",
        f"pre_admission_persisted={persisted}",
        f"actual_spawn_consumes_binding={consumed}",
    )


def _evaluator_boundary(root: Path, ref: str) -> CheckResult:
    runner = _source(root, ref, RUNNER_PATH)
    run_unit = _node_source(runner, function_name="run_unit")
    # This Pilot is explicitly structural. Matrix failure_class may drive the
    # controlled post-Closure intervention, but it may not be fed into the Core.
    post_closure_event = "POST_CLOSURE_EVALUATOR_EVENT" in run_unit
    no_feed = '"fed_to_core": False' in run_unit or "'fed_to_core': False" in run_unit
    structural_boundary = '"structural_only": True' in run_unit or "'structural_only': True" in run_unit
    passed = post_closure_event and no_feed and structural_boundary
    return _result(
        "evaluator_boundary",
        CheckCategory.EVALUATOR,
        passed,
        "Controlled failure-class intervention is confined to the declared post-Closure structural evaluator boundary" if passed else "Post-Closure structural evaluator boundary is incomplete",
        f"post_closure_event={post_closure_event}",
        f"fed_to_core_false={no_feed}",
        f"structural_only={structural_boundary}",
    )


def _closure_integrity(root: Path, ref: str) -> CheckResult:
    runner = _source(root, ref, RUNNER_PATH)
    runtime = _source(root, ref, RUNTIME_PATH)
    close_gov = _node_source(runner, function_name="_close_governance")
    close_front = _node_source(runtime, function_name="close_front_relation")
    passed = (
        "close_front_relation" in close_gov
        and "observe_post" in close_gov
        and "pending is False" in close_gov
        and "remove_counterpart" in close_front
        and "present_observation" in close_front
    )
    return _result(
        "closure_integrity",
        CheckCategory.EXECUTION,
        passed,
        "Closure is evaluated only after authoritative counterpart removal and post-observation" if passed else "Closure/removal/post-observation contract is incomplete",
    )


def _cbra_lifecycle(root: Path, ref: str) -> CheckResult:
    runner = _source(root, ref, RUNNER_PATH)
    run_unit = _node_source(runner, function_name="run_unit")
    required = (
        "open_cbra_after_closure",
        "preclosure_rejected",
        "duplicate_rejected",
        "cross_relation_rejected",
        "strict_as_of",
        "closed_reopen_rejected",
        '"fed_to_same_completed_epoch": False',
    )
    missing = tuple(token for token in required if token not in run_unit)
    passed = not missing
    return _result(
        "cbra_lifecycle",
        CheckCategory.CBRA,
        passed,
        "CBRA lifecycle is fail-closed around Closure, as-of visibility, duplicates, relation scope and terminal close" if passed else "CBRA lifecycle canary coverage is incomplete",
        f"missing={list(missing)}",
    )


def _telemetry_window(root: Path, ref: str) -> CheckResult:
    runner = _source(root, ref, RUNNER_PATH)
    run_unit = _node_source(runner, function_name="run_unit")
    begin = run_unit.find("begin_probe = probe.snapshot()")
    scene = run_unit.find("scene = PilotScene(")
    admission = run_unit.find("scenario_admission =")
    start_frame = run_unit.find("start_frame = int(")
    # A coherent experimental window must begin after admission and at the same
    # semantic boundary as simulated-frame accounting.
    coherent = (
        begin >= 0
        and admission >= 0
        and start_frame >= 0
        and begin > admission
        and begin <= start_frame
    )
    return _result(
        "telemetry_window",
        CheckCategory.TELEMETRY,
        coherent,
        "Hardware and simulated-time telemetry share one post-admission measurement window" if coherent else "Hardware probe begins before admission while simulated-time accounting begins after admission",
        f"positions: begin_probe={begin}, scene={scene}, admission={admission}, start_frame={start_frame}",
    )


def _freeze_triple_integrity(root: Path, ref: str) -> CheckResult:
    manifest = json.loads(_source(root, ref, MANIFEST_PATH))
    source_commit = str(manifest.get("source_freeze_commit") or "")
    expected = manifest.get("frozen_source_git_blobs", {})
    problems = []
    if not source_commit:
        problems.append("source_freeze_commit missing")
    elif not is_ancestor(root, source_commit, ref):
        problems.append("source_freeze_commit is not ancestor of target ref")
    for path, manifest_blob in expected.items():
        try:
            frozen_blob = git_blob(root, source_commit, path)
            target_blob = git_blob(root, ref, path)
        except subprocess.CalledProcessError:
            problems.append(f"{path}: unavailable in one of the refs")
            continue
        if manifest_blob != frozen_blob or frozen_blob != target_blob:
            problems.append(
                f"{path}: manifest={manifest_blob} source={frozen_blob} target={target_blob}"
            )
    passed = bool(expected) and not problems
    return _result(
        "freeze_triple_integrity",
        CheckCategory.FREEZE,
        passed,
        "manifest blob == source-freeze blob == target-ref blob for every frozen source" if passed else "Three-way frozen-source identity failed",
        *problems,
    )


def _immutable_execution_ref(root: Path, ref: str) -> CheckResult:
    manifest = json.loads(_source(root, ref, MANIFEST_PATH))
    execution_commit = manifest.get("execution_freeze_commit")
    run6_in_run5 = _exists(root, ref, f"{RUN5_DIR}/RUN6_DESIGN.json") or _exists(
        root, ref, f"{RUN5_DIR}/RUN6_DESIGN_SPEC.md"
    )
    if not execution_commit:
        return _result(
            "immutable_execution_ref",
            CheckCategory.FREEZE,
            False,
            "No immutable execution_freeze_commit is recorded; a moving branch cannot be the execution authority",
            f"run6_design_files_present_on_run5_lineage={run6_in_run5}",
        )
    target = git_text(root, "rev-parse", ref)
    passed = str(execution_commit) == target and not run6_in_run5
    return _result(
        "immutable_execution_ref",
        CheckCategory.FREEZE,
        passed,
        "Execution ref is immutable and free of later-design contamination" if passed else "Execution authority does not equal the declared immutable freeze commit or contains later-run design artifacts",
        f"execution_freeze_commit={execution_commit}",
        f"target_commit={target}",
        f"run6_design_files_present={run6_in_run5}",
    )


def _adversarial_recheck(prior: Iterable[CheckResult]) -> CheckResult:
    blocking_failures = [
        item.check_id
        for item in prior
        if item.blocking and item.status is not CheckStatus.PASS
    ]
    passed = not blocking_failures
    status = CheckStatus.PASS if passed else CheckStatus.BLOCKED
    return CheckResult(
        check_id="adversarial_recheck",
        category=CheckCategory.ADVERSARIAL,
        status=status,
        summary=(
            "All prior checks are resolved; adversarial recheck may pass"
            if passed
            else "Adversarial recheck is blocked until every earlier gate is resolved"
        ),
        evidence=(f"blocking_prior={blocking_failures}",),
        blocking=True,
    )


def audit_run5(root: Path, *, target_ref: str = "HEAD") -> GateReport:
    root = root.resolve()
    checks = [
        _definition_matrix_contract(root, target_ref),
        _causal_predecision_leakage(root, target_ref),
        _execution_world_isolation(root, target_ref),
        _cross_arm_scene_identity(root, target_ref),
        _scope_ambient_contamination(root, target_ref),
        _topology_spawn_binding(root, target_ref),
        _evaluator_boundary(root, target_ref),
        _closure_integrity(root, target_ref),
        _cbra_lifecycle(root, target_ref),
        _telemetry_window(root, target_ref),
        _freeze_triple_integrity(root, target_ref),
        _immutable_execution_ref(root, target_ref),
    ]
    checks.append(_adversarial_recheck(checks))
    harness = ExperimentFreezeHarness(
        profile_id=PROFILE_ID,
        required_checks=REQUIRED_CHECKS,
    )
    return harness.evaluate(checks)
