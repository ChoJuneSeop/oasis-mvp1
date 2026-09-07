import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/ex04m-multi-oasis-longitudinal-v3.mjs';
const REPORT='ex05-replication-falsification-v3-report.json';
const HORIZON=8000;
const VARIANTS=[
  {id:'E137',offset:137},
  {id:'E977',offset:977},
  {id:'E4099',offset:4099}
];

function runNode(path){
  return new Promise((resolve,reject)=>{
    const p=spawn(process.execPath,[path],{stdio:['ignore','ignore','pipe']});
    let err='';p.stderr.on('data',d=>{err+=d.toString();if(err.length>20000)err=err.slice(-20000)});
    p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`child failed ${path} code=${code}\n${err}`)));
  });
}

const base=await readFile(BASE,'utf8');
if(!base.includes('const HORIZON = 20000;'))throw new Error('EX-05 guard: EX-04M horizon anchor changed');
if(!base.includes('const ex=env(t);'))throw new Error('EX-05 guard: EX-04M environment anchor changed');
if(!base.includes("const PARTY_ID = 'dawn';"))throw new Error('EX-05 guard: production party-id control changed');

const runs=[];
for(const v of VARIANTS){
  const tmp=`tools/.tmp-ex05-${v.id}.mjs`;
  const childReport=`ex05-${v.id}-raw.json`;
  let src=base
    .replace('const HORIZON = 20000;',`const HORIZON = ${HORIZON};`)
    .replace("const REPORT = 'ex04m-multi-oasis-longitudinal-v3-report.json';",`const REPORT = '${childReport}';`)
    .replace('const ex=env(t);',`const ex=env(t+${v.offset});`);
  await writeFile(tmp,src);
  try{
    await runNode(tmp);
    const raw=JSON.parse(await readFile(childReport,'utf8'));
    const stableG4=(raw.summary.G4.pairwise||[]).filter(p=>p.firstDivergence===null).map(p=>p.key);
    runs.push({
      variant:v,
      valid:raw.valid,
      totalTwinMismatch:raw.summary.totalTwinMismatch,
      experimenterInterventionCount:raw.summary.experimenterInterventionCount,
      sameNoneMismatchTicks:raw.summary.groupMismatchTicks.G1_SAME_NONE_SAME_PRS,
      samePriorMismatchTicks:raw.summary.groupMismatchTicks.G2_SAME_PRIOR_SAME_PRS,
      samePriorDifferentPRS:{
        divergentPairs:raw.summary.G3.divergentPairs,
        sameOutputDifferentPRSPairs:raw.summary.G3.pairsWithSameOutputDifferentPRS,
        pairwise:raw.summary.G3.pairwise.map(p=>({key:p.key,firstDivergence:p.firstDivergence,choiceDistributionTV:p.choiceDistributionTV,finalPRSDifferent:p.finalPRSDifferent}))
      },
      differentPriorSamePRS:{
        divergentPairs:raw.summary.G4.divergentPairs,
        matchedPreStateChoiceDifferencePairs:raw.summary.G4.pairsWithMatchedPreStateChoiceDifference,
        sameOutputDifferentPRSPairs:raw.summary.G4.pairsWithSameOutputDifferentPRS,
        stablePairs:stableG4,
        pairwise:raw.summary.G4.pairwise.map(p=>({key:p.key,firstDivergence:p.firstDivergence,firstMatchedPreStateChoiceDifference:p.firstMatchedPreStateChoiceDifference||null,firstSameOutputDifferentPRS:p.firstSameOutputDifferentPRS}))
      }
    });
  } finally {
    await rm(tmp,{force:true});
    await rm(childReport,{force:true});
  }
}

const validity={
  allChildRunsValid:runs.every(r=>r.valid),
  deterministicTwins:runs.every(r=>r.totalTwinMismatch===0),
  sameNoneControlsExact:runs.every(r=>r.sameNoneMismatchTicks===0),
  samePriorControlsExact:runs.every(r=>r.samePriorMismatchTicks===0),
  noExperimenterIntervention:runs.every(r=>r.experimenterInterventionCount===0)
};
const valid=Object.values(validity).every(Boolean);
const prsReplicationCount=runs.filter(r=>r.samePriorDifferentPRS.divergentPairs>0).length;
const priorReplicationCount=runs.filter(r=>r.differentPriorSamePRS.matchedPreStateChoiceDifferencePairs>0).length;
const sameOutputDifferentProcessReplicationCount=runs.filter(r=>r.samePriorDifferentPRS.sameOutputDifferentPRSPairs>0||r.differentPriorSamePRS.sameOutputDifferentPRSPairs>0).length;
const stablePriorPairsByVariant=Object.fromEntries(runs.map(r=>[r.variant.id,r.differentPriorSamePRS.stablePairs]));

const evidence={
  deterministicControl:`${runs.filter(r=>r.sameNoneMismatchTicks===0&&r.samePriorMismatchTicks===0).length}/${runs.length} ALTERNATIVE EXOGENOUS STREAMS EXACT FOR SAME-CONDITION CONTROLS`,
  samePriorDifferentPRSReplication:prsReplicationCount===runs.length?'REPLICATED_ACROSS_ALL_PREDECLARED_EXOGENOUS_STREAMS':`REPLICATED_${prsReplicationCount}_OF_${runs.length}`,
  differentPriorSamePRSReplication:priorReplicationCount===runs.length?'MATCHED_PRESTATE_EFFECT_REPLICATED_ACROSS_ALL_PREDECLARED_EXOGENOUS_STREAMS':`MATCHED_PRESTATE_EFFECT_REPLICATED_${priorReplicationCount}_OF_${runs.length}`,
  sameOutputDifferentProcessReplication:sameOutputDifferentProcessReplicationCount===runs.length?'REPLICATED_ACROSS_ALL_PREDECLARED_EXOGENOUS_STREAMS':`REPLICATED_${sameOutputDifferentProcessReplicationCount}_OF_${runs.length}`,
  falsificationBoundary:'EFFECT_ABSENCE_IN_ANY_PRIOR_PAIR_IS_PRESERVED; DIFFERENT_PRIOR_DOES_NOT_IMPLY_AUTOMATIC_DIVERGENCE'
};

const result={
  experiment:'EX-05 Replication and Falsification Battery v3',
  date:'2026-09-07',
  inheritedDesign:'EX-04M matched multi-OASIS design',
  horizonPerVariant:HORIZON,
  predeclaredExogenousOffsets:VARIANTS,
  validity,valid,runs,
  summary:{
    variants:runs.length,
    prsReplicationCount,
    priorReplicationCount,
    sameOutputDifferentProcessReplicationCount,
    totalTwinMismatch:runs.reduce((a,r)=>a+r.totalTwinMismatch,0),
    totalExperimenterInterventionCount:runs.reduce((a,r)=>a+r.experimenterInterventionCount,0),
    stablePriorPairsByVariant
  },
  evidence,
  interpretationBoundary:[
    'Replication across deterministic alternative exogenous streams supports robustness within this harness, not real-world generalization.',
    'Same-prior/different-PRS divergence is evidence that Past Relational Structure can differentiate behavior under the tested fixed prior; it is not disposition causation.',
    'Different-prior/same-PRS matched-prestate divergence supports conditional contribution of this minimum prior family; a prior pair that does not diverge is retained as a valid negative result.',
    'Exact same-condition controls and zero twin mismatch are falsification guards against implementation nondeterminism or instrumentation drift.',
    'No result establishes universal necessity, universal sufficiency, superiority, or a scalar causal rate.'
  ]
};
await writeFile(REPORT,JSON.stringify(result,null,2));
console.log(JSON.stringify({valid,evidence,summary:result.summary,runs:runs.map(r=>({variant:r.variant,prs:r.samePriorDifferentPRS,prior:r.differentPriorSamePRS}))},null,2));
if(!valid)process.exitCode=1;
