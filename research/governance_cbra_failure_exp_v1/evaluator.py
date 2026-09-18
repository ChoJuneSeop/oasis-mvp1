from __future__ import annotations
from .runner import ARMS


def _rate(xs): return 0.0 if not xs else sum(xs)/len(xs)


def evaluate(cases,workers,scientific:bool):
    by={w["arm"]:{r["case_id"]:r for r in w["rows"]} for w in workers}
    pids=[w["pid"] for w in workers]; tokens=[w["worker_token"] for w in workers]
    general=tuple(by["GENERAL_HARNESS"].values())
    governed=tuple(by["GOV_CBRA"].values())+tuple(by["GOV_RECORD_ONLY"].values())
    structural={
        "fresh_process":len(set(pids))==len(ARMS) and len(set(tokens))==len(ARMS),
        "arm_count":len(workers),"case_count_per_arm":len(cases),
        "governance_checkpoint_contract":all(r["checkpoint_count"]==(2 if r["failure_class"]=="delayed" else 1) for r in governed),
        "general_harness_has_no_cbra":all((not r["cbra_instantiated"]) and r["checkpoint_count"]==0 and r["as_of_count"]==0 for r in general),
        "as_of_gate_present":all(r["as_of_count"]==(2 if r["failure_class"]=="delayed" else 1) for r in governed),
        "counterfactual_claimed":any(r["counterfactual_claimed"] for w in workers for r in w["rows"]),
        "confirmatory_family_scope_variation":len({c.runtime.initial_scope for c in cases})>1 if scientific else True,
    }
    out={"spec_version":"CBRA_FAILURE_CE_V1_1_FINAL","stage":"confirmatory" if scientific else "pilot",
         "structural":structural,"scientific_evaluator_used":scientific,"aggregate_score":None}
    if not scientific: return out

    same=[c for c in cases if c.runtime.reentry_context.value=="same_scope"]
    changed=[c for c in cases if c.runtime.reentry_context.value=="changed_scope"]
    exo=[c for c in cases if c.truth.exogenous_only]
    omission=[c for c in cases if c.truth.no_provenance_should_be_revisable]
    resp=[c for c in cases if c.truth.responsibility_axis_should_be_revisable]
    delayed=[c for c in cases if c.runtime.failure_class.value=="delayed" and c.runtime.reentry_context.value=="same_scope"]

    metrics={}
    for arm in ARMS:
        rows=by[arm]; repeated=[]
        for c in same:
            r=rows[c.runtime.case_id]
            if c.runtime.failure_class.value=="participation_commission": repeated.append(int(r["reentry_participate"]))
            elif c.runtime.failure_class.value=="participation_omission": repeated.append(int(not r["reentry_participate"]))
            elif c.runtime.failure_class.value=="responsibility_axis": repeated.append(int(r["reentry_selected"]=="continue-flow"))
            elif c.runtime.failure_class.value=="delayed": repeated.append(int(r["reentry_participate"]))
        inappropriate_global=[
            int(not rows[c.runtime.case_id]["reentry_participate"])
            for c in changed if c.truth.should_allow_contextual_reentry
        ]
        metrics[arm]={
            "same_failure_recurrence_count":sum(repeated),"same_failure_recurrence_rate":_rate(repeated),
            "inappropriate_global_exclusion_count":sum(inappropriate_global),"inappropriate_global_exclusion_rate":_rate(inappropriate_global),
            "exogenous_attribution_error_count":sum(int(rows[c.runtime.case_id]["exogenous_attribution_error"]) for c in exo),
            "delayed_premature_change_count":sum(int(not rows[c.runtime.case_id]["pre_delayed_reentry_participate"]) for c in delayed),
            "no_provenance_revision_visible_count":None if arm=="GENERAL_HARNESS" else sum(int(rows[c.runtime.case_id]["participation_state"]=="revised") for c in omission),
            "responsibility_obligation_revision_visible_count":None if arm=="GENERAL_HARNESS" else sum(int(rows[c.runtime.case_id]["u_obligation_state"]=="revised") for c in resp),
        }

    def diff(a,b,key): return metrics[a][key]-metrics[b][key]
    out["metrics"]=metrics
    out["prespecified_pairwise_differences"]={
        "CBRA_vs_RECORD_ONLY_same_failure_recurrence_rate":diff("GOV_CBRA","GOV_RECORD_ONLY","same_failure_recurrence_rate"),
        "CBRA_vs_GENERAL_same_failure_recurrence_rate":diff("GOV_CBRA","GENERAL_HARNESS","same_failure_recurrence_rate"),
        "CBRA_vs_GENERAL_global_exclusion_rate":diff("GOV_CBRA","GENERAL_HARNESS","inappropriate_global_exclusion_rate"),
        "CBRA_vs_GENERAL_exogenous_error_count":diff("GOV_CBRA","GENERAL_HARNESS","exogenous_attribution_error_count"),
    }
    out["family_initial_scopes"]=sorted({c.runtime.initial_scope for c in cases})
    out["truth_case_count"]=len(cases)
    return out
