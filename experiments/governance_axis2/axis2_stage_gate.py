from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def main():
    p=argparse.ArgumentParser(); p.add_argument("--completed",type=Path,required=True); p.add_argument("--expected-status",required=True); p.add_argument("--next-stage",required=True); p.add_argument("--out",type=Path,required=True); a=p.parse_args()
    if a.out.exists(): raise SystemExit(f"refusing to overwrite: {a.out}")
    data=json.loads(a.completed.read_text(encoding="utf-8"))
    errors=[]
    if data.get("status") != a.expected_status: errors.append("completed stage status mismatch")
    if "rows" in data:
        if not data["rows"]: errors.append("no run rows")
        if not all(row.get("stage2_pass",row.get("pass",False)) for row in data["rows"]): errors.append("one or more run rows failed")
    if data.get("locked_confirmatory",{}).get("sample_size",1) < 1: errors.append("sample size not locked")
    result={"gate":f"PRE_{a.next_stage}","authorization":"READY" if not errors else "HOLD","errors":errors,"input_sha256":hashlib.sha256(a.completed.read_bytes()).hexdigest()}
    a.out.parent.mkdir(parents=True,exist_ok=True); a.out.write_text(json.dumps(result,indent=2),encoding="utf-8"); print(json.dumps(result,indent=2))
    if errors: raise SystemExit(2)
if __name__=="__main__": main()
