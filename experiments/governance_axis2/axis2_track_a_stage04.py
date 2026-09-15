from __future__ import annotations
import argparse, contextlib, hashlib, io, json
from pathlib import Path
from experiments.governance_axis2.axis2_track_a_stage02 import run as run_stage2

def main():
    p=argparse.ArgumentParser(); p.add_argument("--stage3",type=Path,required=True); p.add_argument("--gate",type=Path,required=True); p.add_argument("--out",type=Path,required=True); a=p.parse_args()
    if a.out.exists(): raise SystemExit(f"refusing to overwrite: {a.out}")
    s3=json.loads(a.stage3.read_text(encoding="utf-8")); gate=json.loads(a.gate.read_text(encoding="utf-8"))
    if gate.get("authorization")!="READY": raise SystemExit("Stage 4 blocked")
    n=s3["locked_confirmatory"]["sample_size"]; seeds=tuple(41000+i*37 for i in range(n)); rows=[]
    a.out.parent.mkdir(parents=True,exist_ok=True)
    for seed in seeds:
        child=a.out.parent/"runs"/str(seed)/"stage02.json"
        with contextlib.redirect_stdout(io.StringIO()): r=run_stage2(seed,child)
        rows.append({"seed":seed,"stage2_pass":r["status"]=="STAGE2_CALIBRATION_PASS","pass":all(r["checks"].values()),"output_sha256":hashlib.sha256(child.read_bytes()).hexdigest()})
    passed=all(x["pass"] and x["stage2_pass"] for x in rows)
    out={"stage":"STAGE4","status":"STAGE4_CONFIRMATORY_PASS" if passed else "STAGE4_CONFIRMATORY_FAIL","preregistered_sample_size":n,"rows":rows,"stage3_sha256":hashlib.sha256(a.stage3.read_bytes()).hexdigest(),"gate_sha256":hashlib.sha256(a.gate.read_bytes()).hexdigest()}
    a.out.write_text(json.dumps(out,indent=2),encoding="utf-8"); print(json.dumps(out,indent=2))
    if not passed: raise SystemExit(2)
if __name__=="__main__": main()
