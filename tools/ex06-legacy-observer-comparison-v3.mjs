import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/ex04m-multi-oasis-longitudinal-v3.mjs';
const LEGACY_TOOL='tools/causal-trace-ledger-v1.mjs';
const LEGACY_INDEX='docs/causal/CAUSAL_EXPERIMENT_INDEX_v1.2.md';
const REPORT='ex06-legacy-observer-comparison-v3-report.json';
const CHILD='tools/.tmp-ex06-shared-flow.mjs';
const CHILD_REPORT='ex06-shared-flow-raw.json';

function runNode(path){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path],{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d.toString());p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(new Error(`child failed code=${c}\n${err.slice(-12000)}`)))});}

const [base,legacyTool,legacyIndex]=await Promise.all([readFile(BASE,'utf8'),readFile(LEGACY_TOOL,'utf8'),readFile(LEGACY_INDEX,'utf8')]);
const legacyAxes=['divergenceDelay','realizedChange','persistence','reconvergence','accumulatedRelationalEffect','downstreamLongHorizonEffect'];
for(const x of legacyAxes)if(!legacyTool.includes(x))throw new Error(`legacy observer axis missing: ${x}`);
for(const phrase of ['divergence delay','realized-flow change','persistence','reconvergence','accumulated relational difference','downstream long-horizon effect'])if(!legacyIndex.toLowerCase().includes(phrase))throw new Error(`legacy experiment index boundary changed: ${phrase}`);
if(!base.includes("const REPORT = 'ex04m-multi-oasis-longitudinal-v3-report.json';"))throw new Error('EX-06 base report anchor changed');
const src=base.replace("const REPORT = 'ex04m-multi-oasis-longitudinal-v3-report.json';",`const REPORT = '${CHILD_REPORT}';`);
await writeFile(CHILD,src);
let raw;
try{await runNode(CHILD);raw=JSON.parse(await readFile(CHILD_REPORT,'utf8'));}finally{await rm(CHILD,{force:true});await rm(CHILD_REPORT,{force:true});}
if(!raw.valid)throw new Error('EX-06 shared flow invalid');

const pairs=[...(raw.summary.G3.pairwise||[]),...(raw.summary.G4.pairwise||[])];
const records=pairs.map(p=>{
  const group=p.group;
  const v1={
    divergenceDelay:p.firstDivergence,
    realizedChange:p.firstDivergence!==null?'OBSERVED':'NOT_OBSERVED_WITHIN_HORIZON',
    persistence:'REQUIRES_EVENT_INTERVAL_TRACE_NOT_EXPLICIT_IN_EX04M_PAIR_SUMMARY',
    reconvergence:p.firstSameOutputDifferentPRS!==null?{sameOutputObservedAt:p.firstSameOutputDifferentPRS}: 'NOT_OBSERVED_WITHIN_HORIZON',
    accumulatedRelationalEffect:p.finalPRSDifferent?'FINAL_PAST_RELATIONAL_STRUCTURE_DIFFERENCE_OBSERVED':'NO_FINAL_PRS_DIFFERENCE',
    downstreamLongHorizonEffect:p.choiceDistributionTV>0?{choiceDistributionTV:p.choiceDistributionTV}:'NO_DISTRIBUTION_DIFFERENCE_OBSERVED'
  };
  const v3={
    conditionFactorization:group==='G3_SAME_PRIOR_DIFFERENT_PRS'?'SAME_PRIOR_DIFFERENT_INITIAL_PRS':'DIFFERENT_PRIOR_SAME_INITIAL_PRS',
    initialRelationalConditionIdentity:group==='G3_SAME_PRIOR_DIFFERENT_PRS'?'EXPLICIT':'HELD_MATCHED',
    dispositionConditionIdentity:group==='G4_DIFFERENT_PRIOR_SAME_PRS'?'EXPLICIT':'HELD_MATCHED',
    matchedPreStateChoiceLineage:p.firstMatchedPreStateChoiceDifference||null,
    sameOutputDifferentPastRelationalStructure:p.firstSameOutputDifferentPRS!==null?{tick:p.firstSameOutputDifferentPRS,explicit:true}:null,
    finalPastRelationalStructureDifferent:p.finalPRSDifferent,
    choiceDistributionTV:p.choiceDistributionTV
  };
  return{key:p.key,group,v1,v3};
});

const sameOutputDifferentPRS=records.filter(r=>r.v3.sameOutputDifferentPastRelationalStructure!==null);
const matchedPreStateChoiceLineage=records.filter(r=>r.v3.matchedPreStateChoiceLineage!==null);
const divergent=records.filter(r=>r.v1.divergenceDelay!==null);
const v1DirectDimensions=6;
const v3AdditionalExplicitDimensions=['initial Past Relational Structure identity/condition','disposition condition identity','matched-prestate actual-choice lineage','explicit same-output/different-Past-Relational-Structure state'];

const result={
  experiment:'EX-06 Legacy v1 Observer Comparison on Shared OASIS Flow',
  date:'2026-09-07',
  sharedFlow:{source:'fresh EX-04M canonical matched multi-OASIS flow',horizon:raw.horizon,valid:raw.valid,totalTwinMismatch:raw.summary.totalTwinMismatch,experimenterInterventionCount:raw.summary.experimenterInterventionCount},
  legacyObserver:{version:'v1.x preserved comparator',axes:legacyAxes,sourceFiles:[LEGACY_TOOL,LEGACY_INDEX]},
  records,
  summary:{
    comparedPairs:records.length,
    divergentPairs:divergent.length,
    pairsWithSameOutputDifferentPRS:sameOutputDifferentPRS.length,
    pairsWithMatchedPreStateChoiceLineage:matchedPreStateChoiceLineage.length,
    v1DirectMeasurementAxes:v1DirectDimensions,
    v3AdditionalExplicitDimensions
  },
  evidence:{
    v1TimingAndOutcomeCoverage:divergent.length>0?'LEGACY_AXES_CAPTURE_DIVERGENCE_AND_REALIZED_FLOW_TIMING_INFORMATION':'NO_DIVERGENCE_FOR_COMPARISON',
    v1RelationalDifferenceCoverage:records.some(r=>r.v1.accumulatedRelationalEffect==='FINAL_PAST_RELATIONAL_STRUCTURE_DIFFERENCE_OBSERVED')?'LEGACY_ACCUMULATED_RELATIONAL_AXIS_CAN_REGISTER_A_FINAL_RELATIONAL_DIFFERENCE':'NOT_OBSERVED',
    sameOutputDifferentProcess:sameOutputDifferentPRS.length>0?'OBSERVED_EXPLICITLY_IN_V3_AND_DERIVABLE_ONLY_BY_COMBINING_LEGACY_RECONVERGENCE_WITH_RELATIONAL_DIFFERENCE_AXES':'NOT_OBSERVED',
    conditionFactorization:matchedPreStateChoiceLineage.length>0?'V3_EXPLICITLY_RETAINS_MATCHED_PRESTATE_AND_CAUSAL_CONDITION_IDENTITY_IN_THIS_COMPARISON':'NO_MATCHED_PRESTATE_LINEAGE_OBSERVED',
    superiority:'NOT_ESTABLISHED'
  },
  interpretationBoundary:[
    'Legacy v1 is not treated as wrong: it directly measures useful divergence, realized-change, persistence/reconvergence and accumulated-effect dimensions.',
    'The comparison tests representation granularity on the same flow, not predictive or industrial superiority.',
    'A same-output/different-Past-Relational-Structure case is not invisible to v1 in principle; under the preserved axis schema it requires cross-reading reconvergence with accumulated relational difference rather than appearing as one explicit continuous-process state.',
    'v3 additionally retains the experimental condition identity and matched-prestate lineage used to distinguish Past Relational Structure effects from disposition-prior effects in this experiment.',
    'No observer comparison establishes universal causal truth or external generalization.'
  ]
};
await writeFile(REPORT,JSON.stringify(result,null,2));
console.log(JSON.stringify({valid:raw.valid,summary:result.summary,evidence:result.evidence,samples:records.slice(0,6)},null,2));
