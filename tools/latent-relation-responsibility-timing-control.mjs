import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/latent-relation-responsibility-flow-shadow-pilot.mjs';
const TMP='tools/.tmp-latent-relation-responsibility-timing-control-wrapper.mjs';
let src=await readFile(BASE,'utf8');
src=src
  .replace("const PORT=4195, MAX_TICK=30000, CHUNK=1000;","const PORT=4197, MAX_TICK=30000, CHUNK=1000;")
  .replace(".tmp-latent-relation-responsibility-flow-shadow-pilot.mjs",".tmp-latent-relation-responsibility-timing-control.mjs")
  .replace("latent-relation-responsibility-flow-shadow-pilot-report.json","latent-relation-responsibility-timing-control-report.json")
  .replace("const names=['broad','rawBridge','completedProcess','exactProvenance','responsibilityFlow'];","const names=['broad','rawBridge','completedProcess','exactProvenance','responsibilityFlow','laggedFlow','inverseFlow'];")
  .replace("{active:new Set(),lastExit:new Map(),lastDanger:null,risingEvaluations:0,nonRisingEvaluations:0}","{active:new Set(),lastExit:new Map(),lastDanger:null,lastRising:false,risingEvaluations:0,nonRisingEvaluations:0}")
  .replace("const rising=name==='responsibilityFlow'&&st.lastDanger!=null&&S.danger>st.lastDanger;","const adaptive=name==='responsibilityFlow'||name==='laggedFlow'||name==='inverseFlow';\n      const rising=adaptive&&st.lastDanger!=null&&S.danger>st.lastDanger;\n      const useCompleted=name==='responsibilityFlow'?rising:name==='laggedFlow'?!!st.lastRising:name==='inverseFlow'?(st.lastDanger!=null&&!rising):false;")
  .replace("if(name==='responsibilityFlow'){if(rising)st.risingEvaluations++;else st.nonRisingEvaluations++}","if(adaptive){if(rising)st.risingEvaluations++;else st.nonRisingEvaluations++;const gs=gateState[name].stats;gs.completedModeEvaluations=(gs.completedModeEvaluations||0)+(useCompleted?1:0);gs.exactModeEvaluations=(gs.exactModeEvaluations||0)+(useCompleted?0:1)}")
  .replace("else if(name==='responsibilityFlow')admitted=rising?completedEligible(ep,since):exactEligible(ep,since);","else if(adaptive)admitted=useCompleted?completedEligible(ep,since):exactEligible(ep,since);")
  .replace("st.active=now;if(name==='responsibilityFlow')st.lastDanger=S.danger;stats.evaluations++;","st.active=now;if(adaptive){st.lastDanger=S.danger;st.lastRising=rising}stats.evaluations++;")
  .replace("shadowGates:['broad','rawBridge','completedProcess','exactProvenance','responsibilityFlow']","shadowGates:['broad','rawBridge','completedProcess','exactProvenance','responsibilityFlow','laggedFlow','inverseFlow']")
  .replace("const f=final.gates.responsibilityFlow,e=final.gates.exactProvenance,c=final.gates.completedProcess,r=final.gates.rawBridge;","const f=final.gates.responsibilityFlow,e=final.gates.exactProvenance,c=final.gates.completedProcess,r=final.gates.rawBridge,l=final.gates.laggedFlow,i=final.gates.inverseFlow;")
  .replace("console.log('RESPONSIBILITY-FLOW '+JSON.stringify({flow:f,exact:e,completed:c,raw:r}));","console.log('RESPONSIBILITY-FLOW '+JSON.stringify({flow:f,exact:e,completed:c,raw:r,lagged:l,inverse:i}));\n  const dominates=(a,b)=>a.choiceDiffs>=b.choiceDiffs&&a.choiceYield>=b.choiceYield&&a.meanActive<=b.meanActive&&(a.choiceDiffs>b.choiceDiffs||a.choiceYield>b.choiceYield||a.meanActive<b.meanActive);\n  const timingVerdict=dominates(f,l)?'CURRENT_FLOW_DOMINATES_LAGGED':dominates(l,f)?'LAGGED_DOMINATES_CURRENT':'TRADEOFF_OR_INCONCLUSIVE';\n  console.log('TIMING-CONTROL '+JSON.stringify({timingVerdict,current:{choiceDiffs:f.choiceDiffs,choiceYield:f.choiceYield,meanActive:f.meanActive,completedModeEvaluations:f.completedModeEvaluations},lagged:{choiceDiffs:l.choiceDiffs,choiceYield:l.choiceYield,meanActive:l.meanActive,completedModeEvaluations:l.completedModeEvaluations},inverse:{choiceDiffs:i.choiceDiffs,choiceYield:i.choiceYield,meanActive:i.meanActive,completedModeEvaluations:i.completedModeEvaluations}}));")
  .replace("if(!src.includes('responsibilityFlow'))throw new Error('responsibility-flow transform failed');","if(!src.includes('responsibilityFlow')||!src.includes('laggedFlow')||!src.includes('inverseFlow'))throw new Error('timing-control transform failed');");
if(!src.includes('laggedFlow')||!src.includes('inverseFlow'))throw new Error('wrapper transform failed');
await writeFile(TMP,src);
const child=spawn(process.execPath,[TMP],{stdio:'inherit',cwd:process.cwd()});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
if(code!==0)process.exit(code??1);
