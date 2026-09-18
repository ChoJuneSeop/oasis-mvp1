from __future__ import annotations
from .runner import ARMS


def _rate(xs): return 0.0 if not xs else sum(xs)/len(xs)


def evaluate(cases,workers,scientific:bool):
    by={w["arm"]:{r["case_id"]:r for r in w["rows"]} for w in workers}
    pids=[w["pid"] for w in workers]; tokens=[w["worker_token"] for w in workers]
    structural={
        "fresh_process":len(set(pids))==len(ARMS) and len(set(tokens))==len(ARMS),
        "arm_count":len(workers),"case_count_per_arm":len(cases),
        "checkpoint_exactly_one":all(r["checkpoint_count"]==1 for w in workers for r in w["rows"]),
        "as_of_gate_exactly_one":all(r["as_of_count"]==1 for w in workers for r in w["rows"]),
        "counterfactual_claimed":any(r["counterfactual_claimed"] for w in workers for r in w["rows"]),
    }
    out={"stage":"confirmatory" if scientific else "pilot","structural":structural,
         "scientific_evaluator_used":scientific,"aggregate_score":None}
    if not scientific: return out

    same=[c for c in cases if c.runtime.reentry_context.value=="same_scope"]
    changed=[c for c in cases if c.runtime.reentry_context.value=="changed_scope"]
    exo=[c for c in cases if c.truth.exogenous_only]
    omission=[c for c in cases if c.truth.no_provenance_should_be_revisable]
    resp=[c for c in cases if c.truth.responsibility_axis_should_be_revisable]

    metrics={}
    for arm in ARMS:
        rows=by[arm]
        repeated=[]
        for c in same:
            r=rows[c.runtime.case_id]
            if c.runtime.failure_class.value=="participation_commission":
                repeated.append(int(r["reentry_participate"]))
            elif c.runtime.failure_class.value=="participation_omission":
                repeated.append(int(not r["reentry_participate"]))
            elif c.runtime.failure_class.value=="responsibility_axis":
                repeated.append(int(r["reentry_selected"]=="continue-flow"))
            elif c.runtime.failure_class.value=="delayed":
                repeated.append(int(r["reentry_participate"]))
        inappropriate_global=[]
        for c in changed:
            if c.truth.should_allow_contextual_reentry:
                inappropriate_global.append(int(not rows[c.runtime.case_id]["reentry_participate"]))
        metrics[arm]={
            "same_failure_recurrence_count":sum(repeated),
            "same_failure_recurrence_rate":_rate(repeated),
            "inappropriate_global_exclusion_count":sum(inappropriate_global),
            "inappropriate_global_exclusion_rate":_rate(inappropriate_global),
            "exogenous_attribution_error_count":sum(int(rows[c.runtime.case_id]["exogenous_attribution_error"]) for c in exo),
            "no_provenance_revision_visible_count":sum(int(rows[c.runtime.case_id]["participation_state"]=="revised") for c in omission),
            "responsibility_obligation_revision_visible_count":sum(int(rows[c.runtime.case_id]["u_obligation_state"]=="revised") for c in resp),
        }

    def diff(a,b,key):
        return metrics[a][key]-metrics[b][key]
    out["metrics"]=metrics
    out["prespecified_pairwise_differences"]={
        "CBRA_vs_RECORD_ONLY_same_failure_recurrence_rate":diff("GOV_CBRA","GOV_RECORD_ONLY","same_failure_recurrence_rate"),
        "CBRA_vs_GENERAL_same_failure_recurrence_rate":diff("GOV_CBRA","GENERAL_HARNESS","same_failure_recurrence_rate"),
        "CBRA_vs_GENERAL_global_exclusion_rate":diff("GOV_CBRA","GENERAL_HARNESS","inappropriate_global_exclusion_rate"),
        "CBRA_vs_GENERAL_exogenous_error_count":diff("GOV_CBRA","GENERAL_HARNESS","exogenous_attribution_error_count"),
    }
    out["truth_case_count"]=len(cases)
    return out
