from __future__ import annotations
import argparse, hashlib, importlib.util, json, socket, sys
from pathlib import Path

def port_open(host="127.0.0.1",port=2000):
    try:
        with socket.create_connection((host,port),timeout=1): return True
    except OSError: return False

def main():
    p=argparse.ArgumentParser(); p.add_argument("--stage4",type=Path,required=True); p.add_argument("--out",type=Path,required=True); a=p.parse_args()
    if a.out.exists(): raise SystemExit(f"refusing to overwrite: {a.out}")
    s=json.loads(a.stage4.read_text(encoding="utf-8")); repo=Path(__file__).resolve().parents[2]
    runtime=repo/".runtime/carla-py312"
    if str(runtime) not in sys.path: sys.path.insert(0,str(runtime))
    checks={
        "stage4_confirmatory_pass":s.get("status")=="STAGE4_CONFIRMATORY_PASS" and all(x["pass"] for x in s.get("rows",[])),
        "carla_executable_present":Path(r"C:\CARLA_0.9.16\CarlaUE4.exe").exists(),
        "carla_rpc_ready":port_open(),
        "axis2_stage5_live_runner_present":(repo/"experiments/governance_axis2/axis2_track_a_stage05.py").exists(),
        "carla_python_api_available":importlib.util.find_spec("carla") is not None,
    }
    errors=[k for k,v in checks.items() if not v]
    out={"gate":"PRE_STAGE5","authorization":"READY" if not errors else "HOLD","checks":checks,"errors":errors,"stage4_sha256":hashlib.sha256(a.stage4.read_bytes()).hexdigest(),"rule":"Stage 5 must not execute unless every check passes."}
    a.out.parent.mkdir(parents=True,exist_ok=True); a.out.write_text(json.dumps(out,indent=2),encoding="utf-8"); print(json.dumps(out,indent=2))
    if errors: raise SystemExit(2)
if __name__=="__main__": main()
