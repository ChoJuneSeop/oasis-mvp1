import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const AUDIT_FILE='latent-relation-store-audit.jsonl';
const CF_FILE='latent-relation-store-counterfactual.jsonl';
const VALIDATION_FILE='latent-relation-store-validation-report.json';
const REPORT_FILE='causal-trace-ledger-report.json';
const TRACE_FILE='causal-traces.jsonl';

const traces=new Map();
const states=new Map();
const anomalies=[];
const auditCounts={};
let auditLines=0, cfLines=0;

function k(party,id){return `${party}||${id}`}
function getTrace(party,id,seed={}){
  const key=k(party,id);
  if(!traces.has(key))traces.set(key,{
    party,episodeId:id,key:seed.key??null,createdTick:seed.createdTick??null,from:seed.from??null,places:seed.places??null,
    compose:[],latentize:[],reactivate:[],noncurrent:[],participation:[],outcome:[],fieldSpiral:[],jointCounterfactual:[],
    endState:null,evidence:{formation:false,latentized:false,reactivated:false,participated:false,outcomeLinked:false,futureRewriteObserved:false,jointCounterfactualMember:false}
  });
  const t=traces.get(key);
  for(const f of ['key','createdTick','from','places'])if(t[f]==null&&seed[f]!=null)t[f]=seed[f];
  return t;
}
function getState(party,id){
  const key=k(party,id);
  if(!states.has(key))states.set(key,{latentized:false,current:false,everReactivated:false,lastParticipationTick:null,lastOutcomeTick:null});
  return states.get(key);
}
function addAnomaly(type,e,extra={}){anomalies.push({type,party:e.party??null,episodeId:e.episodeId??null,tick:e.tick??null,...extra})}
function temporalChecks(e,id){
  const created=e.createdTick;
  if(Number.isFinite(created)&&Number.isFinite(e.tick)&&created>e.tick)addAnomaly('future-created-tick',e,{episodeId:id,createdTick:created});
  if(Array.isArray(e.from))for(const x of e.from)if(Number.isFinite(x)&&Number.isFinite(e.tick)&&x>e.tick)addAnomaly('future-from-tick',e,{episodeId:id,from:e.from});
}
function ingestEpisodeEvent(e,id,field){
  if(!id)return;
  const t=getTrace(e.party,id,e),s=getState(e.party,id);
  temporalChecks(e,id);
  t[field].push(e);
  if(field==='compose'){
    t.evidence.formation=true;
    if(t.createdTick==null)t.createdTick=e.tick;
  } else if(field==='latentize'){
    t.evidence.latentized=true;s.latentized=true;
    if(!t.evidence.formation)addAnomaly('latentize-without-observed-compose',e,{episodeId:id});
  } else if(field==='reactivate'){
    t.evidence.reactivated=true;
    if(!s.latentized)addAnomaly('reactivate-before-latentize',e,{episodeId:id});
    if(!Array.isArray(e.reasons)||e.reasons.length===0)addAnomaly('reactivate-without-current-relation-reason',e,{episodeId:id});
    const allowed=['here:','target:','danger:','gate:'];
    if(Array.isArray(e.reasons)&&e.reasons.some(r=>!allowed.some(p=>String(r).startsWith(p))))addAnomaly('reactivate-unknown-reason',e,{episodeId:id,reasons:e.reasons});
    s.current=true;s.everReactivated=true;
  } else if(field==='noncurrent'){
    if(!s.latentized)addAnomaly('noncurrent-before-latentize',e,{episodeId:id});
    if(!s.everReactivated)addAnomaly('noncurrent-before-any-reactivation',e,{episodeId:id});
    s.current=false;
  }
}

const auditRL=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of auditRL){
  if(!line.trim())continue;
  const e=JSON.parse(line);auditLines++;auditCounts[e.type]=(auditCounts[e.type]||0)+1;
  if(e.type==='compose')ingestEpisodeEvent(e,e.episodeId,'compose');
  else if(e.type==='latentize')ingestEpisodeEvent(e,e.episodeId,'latentize');
  else if(e.type==='reactivate')ingestEpisodeEvent(e,e.episodeId,'reactivate');
  else if(e.type==='noncurrent')ingestEpisodeEvent(e,e.episodeId,'noncurrent');
  else if(e.type==='select-participation'){
    for(const id of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,id),s=getState(e.party,id);t.participation.push(e);t.evidence.participated=true;
      if(!s.latentized)addAnomaly('participation-before-latentize',e,{episodeId:id});
      if(!s.current)addAnomaly('participation-while-noncurrent',e,{episodeId:id});
      s.lastParticipationTick=e.tick;
    }
  } else if(e.type==='outcome'){
    for(const id of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,id),s=getState(e.party,id);t.outcome.push(e);t.evidence.outcomeLinked=true;
      if(s.lastParticipationTick==null||s.lastParticipationTick>e.tick)addAnomaly('outcome-without-prior-participation',e,{episodeId:id,lastParticipationTick:s.lastParticipationTick});
      s.lastOutcomeTick=e.tick;
    }
  } else if(e.type==='field-spiral'){
    for(const id of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,id),s=getState(e.party,id);t.fieldSpiral.push(e);t.evidence.futureRewriteObserved=true;
      if(s.lastOutcomeTick==null||s.lastOutcomeTick>e.tick)addAnomaly('rewrite-without-prior-outcome',e,{episodeId:id,lastOutcomeTick:s.lastOutcomeTick});
    }
  }
}

const cfRL=readline.createInterface({input:createReadStream(CF_FILE),crlfDelay:Infinity});
for await(const line of cfRL){
  if(!line.trim())continue;
  const e=JSON.parse(line);cfLines++;
  for(const id of e.latentActiveIds||[]){
    const t=getTrace(e.party,id);t.jointCounterfactual.push(e);t.evidence.jointCounterfactualMember=true;
  }
}

const validation=JSON.parse(await readFile(VALIDATION_FILE,'utf8'));
const activeAtEnd=new Set();
for(const p of validation.parties||[])for(const id of p.currentLatentActiveIds||[])activeAtEnd.add(k(p.id,id));

let tracesWithLatent=0,tracesReactivated=0,tracesParticipated=0,tracesOutcome=0,tracesRewrite=0,tracesJointCF=0;
let observationalComplete=0,jointCausalComplete=0,neverReactivatedByHorizon=0,currentAtHorizon=0,multiCycle=0;
const chainExamples=[];
const lines=[];
for(const [key,t] of traces){
  const s=states.get(key)||{latentized:false,current:false,everReactivated:false};
  const latent=t.latentize.length>0,react=t.reactivate.length>0,part=t.participation.length>0,out=t.outcome.length>0,rewrite=t.fieldSpiral.length>0,jcf=t.jointCounterfactual.length>0;
  if(latent)tracesWithLatent++;if(react)tracesReactivated++;if(part)tracesParticipated++;if(out)tracesOutcome++;if(rewrite)tracesRewrite++;if(jcf)tracesJointCF++;
  const complete=t.compose.length>0&&latent&&react&&part&&out&&rewrite;
  const jointComplete=complete&&jcf;
  if(complete)observationalComplete++;if(jointComplete)jointCausalComplete++;
  if(latent&&!react)neverReactivatedByHorizon++;
  if(activeAtEnd.has(key)){currentAtHorizon++;t.endState='current-at-horizon-right-censored'}
  else if(latent&&!react)t.endState='latent-no-reactivation-observed-by-horizon-right-censored';
  else if(latent)t.endState=s.current?'current-right-censored':'noncurrent-at-horizon';
  else t.endState='formed-not-latentized-by-horizon';
  const cycles=Math.min(t.reactivate.length,t.noncurrent.length+(activeAtEnd.has(key)?1:0));if(cycles>1)multiCycle++;
  t.causalStatus={
    observationalIdentityChainComplete:complete,
    jointSetCounterfactualChainComplete:jointComplete,
    individualCausalNecessity:'UNVALIDATED',
    outcomeCounterfactualEffect:'UNVALIDATED',
    futureRewriteCounterfactualEffect:'UNVALIDATED'
  };
  if((complete||jointComplete)&&chainExamples.length<12)chainExamples.push({party:t.party,episodeId:t.episodeId,createdTick:t.createdTick,latentTick:t.latentize[0]?.tick??null,firstReactivateTick:t.reactivate[0]?.tick??null,firstParticipationTick:t.participation[0]?.tick??null,firstOutcomeTick:t.outcome[0]?.tick??null,firstRewriteTick:t.fieldSpiral[0]?.tick??null,jointCounterfactualTicks:t.jointCounterfactual.slice(0,5).map(x=>x.tick)});
  lines.push(JSON.stringify(t));
}
await writeFile(TRACE_FILE,lines.join('\n')+(lines.length?'\n':''));

const hardTypes=new Set(['future-created-tick','future-from-tick','reactivate-before-latentize','noncurrent-before-latentize','noncurrent-before-any-reactivation','reactivate-without-current-relation-reason','reactivate-unknown-reason','participation-before-latentize','participation-while-noncurrent','outcome-without-prior-participation','rewrite-without-prior-outcome']);
const hardAnomalies=anomalies.filter(x=>hardTypes.has(x.type));
const softAnomalies=anomalies.filter(x=>!hardTypes.has(x.type));

const report={
  design:{
    baseline:'OASIS Integrated Core v2.0',
    source:'existing opt-in latent relation audit; production trajectory unchanged',
    unit:'party + episodeId process identity',
    stages:['compose','latentize','reactivate','noncurrent','select-participation','outcome','field-spiral','joint-counterfactual-membership'],
    counterfactualScope:'whole latent layer disabled in the same current state; supports joint-set contribution only',
    rightCensoring:true,
    individualCausalAttribution:false
  },
  input:{auditLines,cfLines,auditCounts,completedTick:validation.summary?.completedTick??null},
  summary:{
    totalProcessTraces:traces.size,tracesWithLatent,tracesReactivated,tracesParticipated,tracesOutcome,tracesRewrite,tracesJointCF,
    observationalCompleteIdentityChains:observationalComplete,
    jointSetCounterfactualCompleteChains:jointCausalComplete,
    neverReactivatedByHorizonRightCensored:neverReactivatedByHorizon,
    currentAtHorizonRightCensored:currentAtHorizon,
    tracesWithMultipleReactivateNoncurrentCycles:multiCycle,
    hardInvariantAnomalies:hardAnomalies.length,
    softAuditGaps:softAnomalies.length
  },
  evidenceGrades:{
    O2_nonCurrentness:tracesWithLatent>0?'OBSERVED_IMPLEMENTATION':'UNVALIDATED',
    O3_contextualReactivation:tracesReactivated>0&&hardAnomalies.length===0?'OBSERVED_IMPLEMENTATION':'UNVALIDATED',
    processIdentityContinuity:observationalComplete>0?'OBSERVED':'UNVALIDATED',
    jointLatentSetDecisionContribution:cfLines>0?'OBSERVED_COUNTERFACTUAL_SET_LEVEL':'UNVALIDATED',
    individualEpisodeCausalNecessity:'UNVALIDATED',
    outcomeCounterfactualEffect:'UNVALIDATED',
    futureRelationRewriteCounterfactualEffect:'UNVALIDATED',
    O1_fullProductionNoncommutativity:'UNVALIDATED',
    O4_distinctBehavioralEffect:'UNVALIDATED',
    dangerEqualsResponsibility:'UNVALIDATED',
    unrealizedPossibilityDirectCausality:'UNVALIDATED',
    generalization:'UNVALIDATED'
  },
  chainExamples,
  anomalies:{hard:hardAnomalies.slice(0,100),soft:softAnomalies.slice(0,100)}
};
await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-CAUSAL-TRACE-LEDGER '+JSON.stringify(report.summary));
console.log('EVIDENCE '+JSON.stringify(report.evidenceGrades));
if(hardAnomalies.length)throw new Error(`causal trace hard invariant violations: ${hardAnomalies.length}`);
