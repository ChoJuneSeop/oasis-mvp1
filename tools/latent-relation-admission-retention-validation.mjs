import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/latent-relation-admission-gate-fast-validation.mjs';
const TMP='/tmp/oasis-latent-retention-validation.mjs';
let src=await readFile(BASE,'utf8');

src=src
  .replace("const PORT=4187, MAX_TICK=120000, CHUNK=1000;","const PORT=4188, MAX_TICK=120000, CHUNK=1000;")
  .replace("const AUDIT_FILE='latent-relation-admission-fast-audit.jsonl';","const AUDIT_FILE='latent-relation-retention-audit.jsonl';")
  .replace("const CF_FILE='latent-relation-admission-fast-counterfactual.jsonl';","const CF_FILE='latent-relation-retention-counterfactual.jsonl';")
  .replace("const REPORT_FILE='latent-relation-admission-fast-report.json';","const REPORT_FILE='latent-relation-retention-report.json';")
  .replace(
    "return {valid:(directHere||directTarget||gateMatch)&&npcAnchor,reasons};",
    "return {entryValid:(directHere||directTarget||gateMatch)&&npcAnchor,retainValid:(directHere||directTarget||gateMatch),reasons};"
  )
  .replace(
    "const active=[];for(const x of retrieved){const evidence=currentRelationEvidence(S,P,x.ep);if(evidence.valid)active.push({...x,evidence});else if(!prevRetrieved.has(x.id)){G.rejectedAdds++;G.rejectXor=(G.rejectXor^gateHash(x.id))>>>0;}}\n  const prev=new Set(L.activeIds||[]),now=new Set(active.map(x=>x.id));",
    "const prev=new Set(L.activeIds||[]),active=[];for(const x of retrieved){const evidence=currentRelationEvidence(S,P,x.ep);const admitted=prev.has(x.id)?evidence.retainValid:evidence.entryValid;if(admitted)active.push({...x,evidence,admissionMode:prev.has(x.id)?'retain':'entry'});else if(!prevRetrieved.has(x.id)){G.rejectedAdds++;G.rejectXor=(G.rejectXor^gateHash(x.id))>>>0;}}\n  const now=new Set(active.map(x=>x.id));"
  )
  .replace(
    "evidenceReasons:x.evidence.reasons,from:",
    "evidenceReasons:x.evidence.reasons,admissionMode:x.admissionMode,from:"
  )
  .replace(
    "gate:'direct current place/target/gate clue AND recent-18 NPC process anchor'",
    "gate:'entry requires direct current place/target/gate clue AND recent-18 NPC process anchor; once currentized, retain while direct structural clue persists'"
  )
  .replace(
    "const report={design:{purpose:'efficient exact separation of latent retrieval from actual current relation admission'",
    "const report={design:{purpose:'stable currentization retention after contextual entry'"
  )
  .replace(
    "if(summary.completedTick!==MAX_TICK)throw new Error('incomplete');",
    "await writeFile(REPORT_FILE,JSON.stringify(report,null,2));\n  if(summary.completedTick!==MAX_TICK)throw new Error('incomplete');"
  )
  .replace(
    "console.log('RESULT fast admission-gate validation completed; production and reality engine unchanged.');",
    "console.log('RESULT retention-gate validation completed; production and reality engine unchanged.');"
  );

if(!src.includes("retainValid"))throw new Error('retention transform did not apply');
await writeFile(TMP,src);

const child=spawn(process.execPath,[TMP],{stdio:'inherit',cwd:process.cwd()});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
if(code!==0)process.exit(code??1);
