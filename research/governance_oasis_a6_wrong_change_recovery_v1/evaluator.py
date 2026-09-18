from __future__ import annotations

from .pipeline import (
    T_INITIAL_DECISION,T_INITIAL_REALIZATION,T_OUTCOME,T_CLOSURE,T_REVALIDATION_COMMIT,
    T_LATER_DECISION,T_LATER_REALIZATION,
)
from .scenario import Arm, Attribution, RecoveryContext

def _rows(workers):
    return {w["arm"]:{r["case_id"]:r for r in w["rows"]} for w in workers}

def evaluate(world,pipeline,scientific:bool):
    initial=_rows(pipeline["initial_workers"])
    later=_rows(pipeline["later_workers"])
    observations=pipeline["observations"]
    evaluations=pipeline["evaluations"]
    commits=pipeline["commits"]
    initial_pids=[w["pid"] for w in pipeline["initial_workers"]]
    later_pids=[w["pid"] for w in pipeline["later_workers"]]

    temporal_ok=(
        T_INITIAL_DECISION<T_INITIAL_REALIZATION<T_OUTCOME<T_CLOSURE<
        T_REVALIDATION_COMMIT<T_LATER_DECISION<T_LATER_REALIZATION
    )
    structural={
        "fresh_initial_arm_processes":len(set(initial_pids))==len(Arm),
        "fresh_later_arm_processes":len(set(later_pids))==len(Arm),
        "wrongness_absent_at_initial_decision":all(
            not r["worker_received_wrongness"] and not r["worker_received_future_outcome"]
            for rows in initial.values() for r in rows.values()
        ),
        "authoritative_observation_after_realization":all(
            observations[a][cid].observed_tau>r["realization_tau"]
            for a,rows in initial.items() for cid,r in rows.items()
        ),
        "evaluator_after_worker_seal":all(
            evaluations[a][cid].worker_sealed_before_evaluation
            for a in evaluations for cid in evaluations[a]
        ),
        "three_epoch_temporal_order":temporal_ok,
        "later_worker_has_no_evaluator_truth":all(
            not r["worker_received_evaluator_truth"]
            for rows in later.values() for r in rows.values()
        ),
        "selected_realized_single":all(
            r["selected"]==r["realized"] and r["realization_count"]==1
            for rows in initial.values() for r in rows.values()
        ) and all(
            r["selected"]==r["realized"] and r["realization_count"]==1
            for rows in later.values() for r in rows.values()
        ),
        "participation_provenance_present":all(
            bool(r["participation_provenance"]) for rows in initial.values() for r in rows.values()
        ) and all(
            bool(r["participation_provenance"]) for rows in later.values() for r in rows.values()
        ),
        "unrelated_base_eligibility":all(
            r["ce_base_eligible"]
            for rows in later.values() for r in rows.values()
            if r["recovery_context"]==RecoveryContext.UNRELATED_RELATION.value
        ),
    }
    out={
        "schema":"governance-oasis-a6-evaluation-v1",
        "stage":"confirmatory" if scientific else "pilot",
        "structural":structural,
        "scientific_evaluator_used":scientific,
        "aggregate_score":None,
    }
    if not scientific:
        return out

    failures=[]
    if not all(structural.values()):
        failures.append("structural invariant failure")

    same=[c for c in world if c.recovery_context is RecoveryContext.SAME_SCOPE]
    unrelated=[c for c in world if c.recovery_context is RecoveryContext.UNRELATED_RELATION]

    initial_effect=0
    exposed_adverse=0
    hidden_benign=0
    recovery=0
    record_only_nonrecovery=0
    exogenous_not_revised=0
    exogenous_no_recovery=0
    unrelated_noninheritance=0

    evidence=[]
    for c in same:
        cid=c.case_id
        exp=initial[Arm.INITIAL_EXPERIENCE_EXPOSED.value][cid]
        hid=initial[Arm.INITIAL_EXPERIENCE_HIDDEN.value][cid]
        if exp["realized"]!=hid["realized"] and exp["realized"]=="continue-flow" and hid["realized"]=="yield-space":
            initial_effect+=1
        exp_eval=evaluations[Arm.INITIAL_EXPERIENCE_EXPOSED.value][cid]
        hid_eval=evaluations[Arm.INITIAL_EXPERIENCE_HIDDEN.value][cid]
        if exp_eval.adverse:
            exposed_adverse+=1
        if not hid_eval.adverse:
            hidden_benign+=1

        rx_initial=initial[Arm.REVALIDATION_EXPOSED.value][cid]
        ro_initial=initial[Arm.REVALIDATION_RECORD_ONLY.value][cid]
        rx_obs=observations[Arm.REVALIDATION_EXPOSED.value][cid]
        ro_obs=observations[Arm.REVALIDATION_RECORD_ONLY.value][cid]
        rx_commit=commits[Arm.REVALIDATION_EXPOSED.value][cid]
        ro_commit=commits[Arm.REVALIDATION_RECORD_ONLY.value][cid]
        rx_later=later[Arm.REVALIDATION_EXPOSED.value][cid]
        ro_later=later[Arm.REVALIDATION_RECORD_ONLY.value][cid]

        same_antecedent=(
            rx_initial["realized"]==ro_initial["realized"]=="continue-flow"
            and rx_obs.impact_code==ro_obs.impact_code=="constraint_breach"
            and rx_commit is not None and ro_commit is not None
            and rx_commit.state==ro_commit.state=="REVISED"
            and rx_commit.attribution==ro_commit.attribution==Attribution.DECISION_LINKED.value
        )
        if not same_antecedent:
            failures.append(f"{cid}:revalidation contrast antecedent mismatch")
        if rx_later["realized"]=="yield-space" and ro_later["realized"]=="continue-flow":
            recovery+=1
        if ro_later["realized"]=="continue-flow":
            record_only_nonrecovery+=1

        ex_commit=commits[Arm.EXOGENOUS_ATTRIBUTION_CONTROL.value][cid]
        ex_later=later[Arm.EXOGENOUS_ATTRIBUTION_CONTROL.value][cid]
        if ex_commit is not None and ex_commit.attribution==Attribution.EXOGENOUS.value and ex_commit.state!="REVISED":
            exogenous_not_revised+=1
        if ex_later["realized"]=="continue-flow" and not ex_later["revalidation_applied"]:
            exogenous_no_recovery+=1

        evidence.append({
            "case_id":cid,
            "initial_exposed_realized":exp["realized"],
            "initial_hidden_realized":hid["realized"],
            "initial_exposed_adverse":exp_eval.adverse,
            "revalidation_exposed_commit":None if rx_commit is None else rx_commit.state,
            "revalidation_exposed_later":rx_later["realized"],
            "record_only_later":ro_later["realized"],
            "exogenous_commit":None if ex_commit is None else ex_commit.state,
            "exogenous_later":ex_later["realized"],
        })

    for c in unrelated:
        cid=c.case_id
        commit=commits[Arm.REVALIDATION_EXPOSED.value][cid]
        row=later[Arm.REVALIDATION_EXPOSED.value][cid]
        if (
            commit is not None
            and commit.state=="REVISED"
            and row["ce_base_eligible"]
            and not row["revalidation_applied"]
            and row["ce_participated"]
            and row["realized"]=="continue-flow"
        ):
            unrelated_noninheritance+=1

    expected=len(same)
    if initial_effect!=expected:
        failures.append(f"initial CE causal effect {initial_effect}/{expected}")
    if exposed_adverse!=expected or hidden_benign!=expected:
        failures.append(f"post-outcome classification exposed_adverse={exposed_adverse}/{expected},hidden_benign={hidden_benign}/{expected}")
    if recovery!=expected or record_only_nonrecovery!=expected:
        failures.append(f"recovery contrast recovery={recovery}/{expected},record_only_nonrecovery={record_only_nonrecovery}/{expected}")
    if exogenous_not_revised!=expected or exogenous_no_recovery!=expected:
        failures.append(f"exogenous attribution control revised={exogenous_not_revised}/{expected},no_recovery={exogenous_no_recovery}/{expected}")
    if unrelated_noninheritance!=len(unrelated):
        failures.append(f"unrelated noninheritance {unrelated_noninheritance}/{len(unrelated)}")

    out.update({
        "experiment_id":"GO_A6_WRONG_CHANGE_RECOVERY_V1",
        "outcome":"INVALID" if not all(structural.values()) else ("SUPPORTS" if not failures else "DOES_NOT_SUPPORT"),
        "failures":failures,
        "initial_experience_behavior_change_count":initial_effect,
        "exposed_post_outcome_adverse_count":exposed_adverse,
        "hidden_post_outcome_benign_count":hidden_benign,
        "same_scope_recovery_count":recovery,
        "record_only_nonrecovery_count":record_only_nonrecovery,
        "exogenous_not_revised_count":exogenous_not_revised,
        "exogenous_no_recovery_count":exogenous_no_recovery,
        "unrelated_feedback_noninheritance_count":unrelated_noninheritance,
        "same_scope_case_count":expected,
        "unrelated_case_count":len(unrelated),
        "evidence":evidence,
        "complete_not_equal_supports":True,
    })
    return out
