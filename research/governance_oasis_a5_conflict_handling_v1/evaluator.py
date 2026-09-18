from __future__ import annotations

from .runner import ARMS, Arm

def _by_arm(workers):
    return {w["arm"]:{r["case_id"]:r for r in w["rows"]} for w in workers}

def _yes_ids(row):
    return tuple(x["ce_id"] for x in row["participation"] if x["participated"])

def _no_entries(row):
    return tuple(x for x in row["participation"] if not x["participated"])

def evaluate(world,workers,scientific:bool):
    by=_by_arm(workers)
    pids=[w["pid"] for w in workers]
    tokens=[w["worker_token"] for w in workers]
    structural={
        "fresh_process":len(set(pids))==len(ARMS) and len(set(tokens))==len(ARMS),
        "arm_count":len(workers),
        "case_count_per_arm":len(world),
        "two_ce_preserved":all(len(r["archive_ids"])==2 for w in workers for r in w["rows"]),
        "opposed_actions_preserved":all(set(r["archive_actions"])=={"continue-flow","yield-space"} for w in workers for r in w["rows"]),
        "no_scalar_memory_score":all(r["scalar_memory_score"] is None for w in workers for r in w["rows"]),
        "selected_realized_single":all(r["selected"]==r["realized"] and r["realization_count"]==1 for w in workers for r in w["rows"]),
        "no_provenance_present":all(all(x["provenance_ref"] for x in _no_entries(r)) for w in workers for r in w["rows"]),
    }
    out={
        "schema":"governance-oasis-a5-evaluation-v1",
        "stage":"confirmatory" if scientific else "pilot",
        "structural":structural,
        "scientific_evaluator_used":scientific,
        "aggregate_score":None,
    }
    if not scientific:
        return out

    failures=[]
    evidence=[]
    prod=by[Arm.PROVENANCE_PRESERVING_CONTEXTUAL.value]
    order=by[Arm.ORDER_ERASED.value]
    relperm=by[Arm.RELATION_PROVENANCE_PERMUTED.value]
    latest=by[Arm.LATEST_ONLY.value]
    order_divergence=0
    relation_divergence=0
    latest_older_target_divergence=0

    for item in world:
        cid=item.runtime.case_id
        truth=item.truth
        prow=prod[cid]
        expected=(truth.expected_ce_id,)
        if _yes_ids(prow)!=expected:
            failures.append(f"{cid}:production participant mismatch:{_yes_ids(prow)}!={expected}")
        if prow["selected"]!=truth.expected_action:
            failures.append(f"{cid}:production selected mismatch")
        if len(_no_entries(prow))!=1 or not _no_entries(prow)[0]["provenance_ref"]:
            failures.append(f"{cid}:production NO provenance missing")
        if len(prow["archive_ids"])!=2:
            failures.append(f"{cid}:archive destructive change")
        if prow["archive_ids"]!=order[cid]["archive_ids"] or prow["archive_ids"]!=relperm[cid]["archive_ids"] or prow["archive_ids"]!=latest[cid]["archive_ids"]:
            failures.append(f"{cid}:archive identity changed across arms")
        if prow["archive_order"]!=order[cid]["archive_order"]:
            failures.append(f"{cid}:stored order mutated rather than read-time ablated")
        if prow["archive_relation_tags"]!=relperm[cid]["archive_relation_tags"]:
            failures.append(f"{cid}:stored relation provenance mutated rather than read-time permuted")

        if item.runtime.mode.value=="ORDER_DISCRIMINATIVE":
            if _yes_ids(order[cid])!=_yes_ids(prow) or order[cid]["selected"]!=prow["selected"]:
                order_divergence+=1
        if item.runtime.mode.value=="RELATION_DISCRIMINATIVE":
            if _yes_ids(relperm[cid])!=_yes_ids(prow) or relperm[cid]["selected"]!=prow["selected"]:
                relation_divergence+=1
        older=min(item.runtime.ce_archive,key=lambda x:x.order_index)
        if truth.expected_ce_id==older.ce_id:
            if _yes_ids(latest[cid])!=_yes_ids(prow) or latest[cid]["selected"]!=prow["selected"]:
                latest_older_target_divergence+=1

        evidence.append({
            "case_id":cid,
            "mode":item.runtime.mode.value,
            "expected_ce":truth.expected_ce_id,
            "production_yes":list(_yes_ids(prow)),
            "production_no":[x["ce_id"] for x in _no_entries(prow)],
            "production_selected":prow["selected"],
            "order_erased_yes":list(_yes_ids(order[cid])),
            "relation_permuted_yes":list(_yes_ids(relperm[cid])),
            "latest_only_yes":list(_yes_ids(latest[cid])),
        })

    expected_order_cases=sum(1 for x in world if x.runtime.mode.value=="ORDER_DISCRIMINATIVE")
    expected_relation_cases=sum(1 for x in world if x.runtime.mode.value=="RELATION_DISCRIMINATIVE")
    expected_older_cases=sum(1 for x in world if x.truth.expected_ce_id==min(x.runtime.ce_archive,key=lambda c:c.order_index).ce_id)

    if order_divergence!=expected_order_cases:
        failures.append(f"order ablation divergence {order_divergence}/{expected_order_cases}")
    if relation_divergence!=expected_relation_cases:
        failures.append(f"relation permutation divergence {relation_divergence}/{expected_relation_cases}")
    if latest_older_target_divergence!=expected_older_cases:
        failures.append(f"latest-only older-target divergence {latest_older_target_divergence}/{expected_older_cases}")
    if not all(structural.values()):
        failures.append("structural invariant failure")

    out.update({
        "experiment_id":"GO_A5_CONFLICT_HANDLING_V1",
        "outcome":"SUPPORTS" if not failures else "DOES_NOT_SUPPORT",
        "failures":failures,
        "production_correct_case_count":sum(1 for x in world if _yes_ids(prod[x.runtime.case_id])==(x.truth.expected_ce_id,) and prod[x.runtime.case_id]["selected"]==x.truth.expected_action),
        "order_ablation_divergence_count":order_divergence,
        "relation_permutation_divergence_count":relation_divergence,
        "latest_only_older_target_divergence_count":latest_older_target_divergence,
        "context_evidence":evidence,
        "complete_not_equal_supports":True,
    })
    return out
