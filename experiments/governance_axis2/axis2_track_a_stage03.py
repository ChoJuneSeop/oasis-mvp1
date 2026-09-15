from __future__ import annotations

import argparse, contextlib, hashlib, io, json, math
from pathlib import Path

from experiments.governance_axis2.axis2_track_a_stage02 import run as run_stage2

SEEDS = (31001, 31007, 31013, 31019, 31033, 31039, 31051, 31063, 31069, 31079, 31091, 31121)

def load_ready(path: Path):
    data=json.loads(path.read_text(encoding="utf-8"))
    if data.get("stage3_authorization") != "READY" or data["summary"]["blocker_ids"]:
        raise SystemExit("Stage 3 blocked by pre-stage audit")
    return data

def l1(a,b): return sum(abs(float(a[k])-float(b[k])) for k in a)

def run(audit_path: Path, out_path: Path):
    audit=load_ready(audit_path)
    if out_path.exists(): raise SystemExit(f"refusing to overwrite: {out_path}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    rows=[]
    for seed in SEEDS:
        child=out_path.parent / "runs" / str(seed) / "stage02.json"
        with contextlib.redirect_stdout(io.StringIO()):
            result=run_stage2(seed, child)
        c=result["conditions"]
        rows.append({
            "seed":seed, "stage2_pass":result["status"]=="STAGE2_CALIBRATION_PASS",
            "all_controls":all(result["checks"].values()),
            "distribution_l1":l1(c["C3"]["snapshot"]["possibility_distribution"],c["C2"]["snapshot"]["possibility_distribution"]),
            "irrelevant_invariant":c["C6"]["output_hash"]==c["C3"]["output_hash"],
            "no_gap_invariant":c["C1"]["output_hash"]==c["C0"]["output_hash"],
        })
    effects=[r["distribution_l1"] for r in rows]
    mean=sum(effects)/len(effects)
    sd=(sum((x-mean)**2 for x in effects)/(len(effects)-1))**0.5
    estimated=max(20, math.ceil(((1.96+0.84)*sd/mean)**2)) if mean>0 else 0
    passed=all(r["stage2_pass"] and r["all_controls"] and r["irrelevant_invariant"] and r["no_gap_invariant"] for r in rows) and mean>0
    result={
        "stage":"STAGE3", "status":"STAGE3_PASS" if passed else "STAGE3_FAIL",
        "pre_audit_sha256":hashlib.sha256(audit_path.read_bytes()).hexdigest(),
        "calibration_seed_count":len(SEEDS), "rows":rows,
        "effect":{"endpoint":"paired C3-C2 possibility-distribution L1","mean":mean,"sample_sd":sd},
        "locked_confirmatory":{"sample_size":estimated,"irrelevant_history_count":8,"alpha":0.05,"target_power":0.8,"all_structural_invariants_required":True},
    }
    out_path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if not passed: raise SystemExit(2)

def main():
    p=argparse.ArgumentParser(); p.add_argument("--audit",type=Path,required=True); p.add_argument("--out",type=Path,required=True); a=p.parse_args(); run(a.audit,a.out)
if __name__=="__main__": main()
