from __future__ import annotations

from collections import defaultdict

from .scenario import Arm


def _run_map(bundle):
    return {(r["family_id"],r["arm"]):r for r in bundle["runs"]}


def _row(run,epoch_id):
    return next(x for x in run["rows"] if x["epoch_id"]==epoch_id)


def _participant_ids(row):
    return tuple(x["ce_id"] for x in row["participation"] if x["participated"])


def _no_rows(row):
    return tuple(x for x in row["participation"] if not x["participated"])


def _strict_temporal(run):
    seq=[x["tau"] for x in sorted(run["event_trace"],key=lambda z:(z["epoch_index"],z["tau"]))]
    return all(a<b for a,b in zip(seq,seq[1:]))


def evaluate(families,bundle,scientific:bool):
    rm=_run_map(bundle)
    structural={
        "all_arms_present":all((f.family_id,a.value) in rm for f in families for a in Arm),
        "one_realization_per_epoch":all(
            row["realization_count"]==1 and row["selected"]==row["realized"]
            for run in bundle["runs"] for row in run["rows"]
        ),
        "no_future_or_evaluator_truth_to_worker":all(
            not row["received_forbidden_future_or_evaluator_truth"]
            for run in bundle["runs"] for row in run["rows"]
        ),
        "append_only_archive":all(
            row["archive_size_after"]==row["archive_size_before"]+1
            for run in bundle["runs"] for row in run["rows"]
        ),
        "seed_identity_order_provenance_immutable":all(
            row["seed_integrity"] for run in bundle["runs"] for row in run["rows"]
        ),
        "strict_temporal_order":all(_strict_temporal(run) for run in bundle["runs"]),
        "fresh_decision_process_tokens":all(
            len(run["worker_seal_tokens"])==len(set(run["worker_seal_tokens"]))==len(run["rows"])
            for run in bundle["runs"]
        ),
        "no_scalar_memory_weight":all(run["scalar_memory_weight"] is None for run in bundle["runs"])
            and all(row["responsibility_scalar_score"] is None for run in bundle["runs"] for row in run["rows"]),
        "participation_provenance_complete":all(
            all(bool(x["provenance"]) for x in row["participation"])
            for run in bundle["runs"] for row in run["rows"]
        ),
        "responsibility_non_scalar_runtime":all(
            isinstance(row["responsibility"],dict)
            and all(isinstance(v,dict) and set(v)=={"U","I","V","T"} for v in row["responsibility"].values())
            for run in bundle["runs"] for row in run["rows"]
        ),
        "selected_nonselected_obligations_runtime":all(
            isinstance(row["selected_obligation"],dict)
            and isinstance(row["nonselected_obligations"],dict)
            for run in bundle["runs"] for row in run["rows"]
        ),
    }
    out={
        "schema":"governance-oasis-gh4-integrated-evaluation-v1",
        "stage":"confirmatory" if scientific else "pilot",
        "structural":structural,
        "scientific_evaluator_used":scientific,
        "aggregate_score":None,
    }
    if not scientific:
        return out

    failures=[]
    if not all(structural.values()):
        failures.append("integrated structural invariant failure")

    metrics=defaultdict(int)
    evidence=[]

    for f in families:
        fid=f.family_id
        full=rm[(fid,Arm.FULL_FLOW.value)]
        hidden=rm[(fid,Arm.INITIAL_EXPERIENCE_HIDDEN.value)]
        ident=rm[(fid,Arm.IDENTITY_PERMUTED.value)]
        rel=rm[(fid,Arm.RELATION_ABLATED.value)]
        order=rm[(fid,Arm.ORDER_ABLATED.value)]
        rr=rm[(fid,Arm.RESPONSIBILITY_RECORD_ONLY.value)]
        rp=rm[(fid,Arm.RESPONSIBILITY_PERMUTED.value)]
        scope=rm[(fid,Arm.SCOPE_GUARD_ABLATED.value)]
        latest=rm[(fid,Arm.CONFLICT_LATEST_ONLY.value)]
        record=rm[(fid,Arm.REVALIDATION_RECORD_ONLY.value)]
        exo=rm[(fid,Arm.EXOGENOUS_ATTRIBUTION_CONTROL.value)]

        e0=_row(full,"E0-CURRENT-FIRST")
        if e0["history_needed"] is False and e0["history_access_count"]==0 and e0["candidate_ids"]==[]:
            metrics["current_flow_first_gate"]+=1

        f1=_row(full,"E1-WRONG-CHANGE"); h1=_row(hidden,"E1-WRONG-CHANGE")
        if f1["realized"]=="continue-flow" and h1["realized"]=="yield-space":
            metrics["initial_experience_behavior_change"]+=1
        if f1["adverse"] and not h1["adverse"]:
            metrics["post_outcome_adverse_separation"]+=1

        f2=_row(full,"E2-SAME-SCOPE-RECOVERY"); r2=_row(record,"E2-SAME-SCOPE-RECOVERY")
        if f2["realized"]=="yield-space" and r2["realized"]=="continue-flow":
            metrics["same_scope_recovery_behavior"]+=1
        if (not f2["adverse"]) and r2["adverse"]:
            metrics["recovery_effectiveness"]+=1
        if any((x["revalidation_commit"] or {}).get("state")=="REVISED" for x in full["rows"] if x["epoch_id"]=="E1-WRONG-CHANGE"):
            metrics["decision_linked_revised_commit"]+=1

        ex1=_row(exo,"E1-WRONG-CHANGE"); ex2=_row(exo,"E2-SAME-SCOPE-RECOVERY")
        if (ex1["revalidation_commit"] or {}).get("state")=="INCONCLUSIVE" and ex1["attribution"]=="EXOGENOUS":
            metrics["exogenous_not_revised"]+=1
        if ex2["realized"]=="continue-flow":
            metrics["exogenous_no_recovery"]+=1

        f3=_row(full,"E3-CHANGED-SCOPE"); s3=_row(scope,"E3-CHANGED-SCOPE")
        f4=_row(full,"E4-UNRELATED-RELATION"); s4=_row(scope,"E4-UNRELATED-RELATION")
        if f3["realized"]=="continue-flow" and s3["realized"]=="yield-space":
            metrics["changed_scope_locality"]+=1
        if f4["realized"]=="continue-flow" and s4["realized"]=="yield-space":
            metrics["unrelated_relation_locality"]+=1
        if f4["history_access_count"]>0 and len(_participant_ids(f4))>0:
            metrics["unrelated_reparticipation"]+=1

        f5=_row(full,"E5-IDENTITY"); i5=_row(ident,"E5-IDENTITY")
        if f5["realized"]=="continue-flow" and i5["realized"]=="yield-space":
            metrics["identity_trace_divergence"]+=1

        f6=_row(full,"E6-RELATION"); r6=_row(rel,"E6-RELATION")
        if f6["realized"]=="yield-space" and r6["realized"]=="continue-flow":
            metrics["relation_trace_divergence"]+=1

        f7=_row(full,"E7-ORDER-EARLY"); o7=_row(order,"E7-ORDER-EARLY")
        f8=_row(full,"E8-ORDER-LATE"); o8=_row(order,"E8-ORDER-LATE")
        if f7["realized"]=="continue-flow" and o7["realized"]=="yield-space":
            metrics["order_trace_divergence"]+=1
        if f8["realized"]=="yield-space" and o8["realized"]=="continue-flow":
            metrics["order_trace_divergence"]+=1

        f9=_row(full,"E9-CONFLICT"); l9=_row(latest,"E9-CONFLICT")
        if f9["realized"]=="continue-flow" and l9["realized"]=="yield-space":
            metrics["conflict_latest_divergence"]+=1
        if len(f9["candidate_ids"])==2 and len(_participant_ids(f9))==1 and len(_no_rows(f9))==1:
            metrics["conflict_both_preserved_selective"]+=1

        f10=_row(full,"E10-RESPONSIBILITY")
        rr10=_row(rr,"E10-RESPONSIBILITY")
        rp10=_row(rp,"E10-RESPONSIBILITY")
        if f10["realized"]=="yield-space" and rr10["realized"]=="continue-flow":
            metrics["responsibility_binding_divergence"]+=1
        if f10["realized"]=="yield-space" and rp10["realized"]=="continue-flow":
            metrics["responsibility_content_divergence"]+=1
        if len(f10["selected_obligation"])==4 and len(f10["nonselected_obligations"])==1:
            metrics["responsibility_obligations_preserved"]+=1

        if full["final_archive_size"]==full["seed_archive_size"]+11:
            metrics["long_horizon_accumulation"]+=1

        evidence.append({
            "family_id":fid,
            "e1_full":f1["realized"],
            "e1_hidden":h1["realized"],
            "e2_full":f2["realized"],
            "e2_record_only":r2["realized"],
            "e3_full_changed_scope":f3["realized"],
            "e4_full_unrelated":f4["realized"],
            "e5_full_identity":f5["realized"],
            "e5_identity_permuted":i5["realized"],
            "e6_full_relation":f6["realized"],
            "e6_relation_ablated":r6["realized"],
            "e7_e8_order_full":[f7["realized"],f8["realized"]],
            "e7_e8_order_ablated":[o7["realized"],o8["realized"]],
            "e9_full_conflict":f9["realized"],
            "e9_latest_only":l9["realized"],
            "e10_full_responsibility":f10["realized"],
            "e10_responsibility_record_only":rr10["realized"],
            "e10_responsibility_permuted":rp10["realized"],
        })

    n=len(families)
    expected={
        "current_flow_first_gate":n,
        "initial_experience_behavior_change":n,
        "post_outcome_adverse_separation":n,
        "same_scope_recovery_behavior":n,
        "recovery_effectiveness":n,
        "decision_linked_revised_commit":n,
        "exogenous_not_revised":n,
        "exogenous_no_recovery":n,
        "changed_scope_locality":n,
        "unrelated_relation_locality":n,
        "unrelated_reparticipation":n,
        "identity_trace_divergence":n,
        "relation_trace_divergence":n,
        "order_trace_divergence":2*n,
        "conflict_latest_divergence":n,
        "conflict_both_preserved_selective":n,
        "responsibility_binding_divergence":n,
        "responsibility_content_divergence":n,
        "responsibility_obligations_preserved":n,
        "long_horizon_accumulation":n,
    }
    for key,value in expected.items():
        if metrics[key]!=value:
            failures.append(f"{key}:{metrics[key]}/{value}")

    out.update({
        "experiment_id":"GH4_FLOW_PRESERVING_INTEGRATED_CONFIRMATORY_V1",
        "outcome":"INVALID" if not all(structural.values()) else ("SUPPORTS" if not failures else "DOES_NOT_SUPPORT"),
        "failures":failures,
        "metrics":dict(metrics),
        "expected_metrics":expected,
        "family_evidence":evidence,
        "confirmatory_arm_epoch_units":len(families)*len(Arm)*11,
        "complete_not_equal_supports":True,
    })
    return out
