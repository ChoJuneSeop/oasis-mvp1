import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const AUDIT_FILE='latent-relation-store-audit.jsonl';
const CF_FILE='latent-relation-store-counterfactual.jsonl';
const VALIDATION_FILE='latent-relation-store-validation-report.json';
const REPORT_FILE='causal-trace-ledger-report.json';
const TRACE_FILE='causal-traces.jsonl';

// CR-01 is intentionally streaming. The 120k audit contains ~2M events; retaining
// complete event objects would measure Node heap size rather than causal-trace integrity.
const traces=new Map();
const auditCounts={};
const anomalyCounts={};
const anomalySamples=[];
let auditLines=0,cfLines=0;

const stageNames=['compose','latentize','reactivate','noncurrent','participation','outcome','fieldSpiral','jointCounterfactual'];
function identity(party,id){return `${party}||${id}`}
function blankStage(){return {count:0,firstTick:null,lastTick:null}}
function getTrace(party,id,seed={}){
  const key=identity(party,id);
  if(!traces.has(key)){
    const stages=Object.fromEntries(stageNames.map(x=>[x,blankStage()]));
    traces.set(key,{
      party,episodeId:id,key:seed.key??null,createdTick:seed.createdTick??null,
      from:Array.isArray(seed.from)?[...seed.from]:null,
      places:Array.isArray(seed.places)?[...seed.places]:null,
      stages,
      firstReactivationReasons:null,
      current:false,latentized:false,everReactivated:false,
      lastParticipationTick:null,lastOutcomeTick:null,
      endState:null
    });
  }
  const t=traces.get(key);
  if(t.key==null&&seed.key!=null)t.key=seed.key;
  if(t.createdTick==null&&seed.createdTick!=null)t.createdTick=seed.createdTick;
  if(t.from==null&&Array.isArray(seed.from))t.from=[...seed.from];
  if(t.places==null&&Array.isArray(seed.places))t.places=[...seed.places];
  return t;
}
function mark(t,stage,tick){
  const s=t.stages[stage];s.count++;
  if(s.firstTick==null)s.firstTick=tick;
  s.lastTick=tick;
}
function anomaly(type,e,extra={}){
  anomalyCounts[type]=(anomalyCounts[type]||0)+1;
  if(anomalySamples.length<200)anomalySamples.push({type,party:e.party??null,episodeId:e.episodeId??null,tick:e.tick??null,...extra});
}
function temporalCheck(t,e,id){
  const created=e.createdTick??t.createdTick;
  if(Number.isFinite(created)&&Number.isFinite(e.tick)&&created>e.tick)anomaly('future-created-tick',e,{episodeId:id,createdTick:created});
  const from=Array.isArray(e.from)?e.from:t.from;
  if(Array.isArray(from)&&Number.isFinite(e.tick)&&from.some(x=>Number.isFinite(x)&&x>e.tick))anomaly('future-from-tick',e,{episodeId:id,from});
}
function episodeEvent(e,id,stage){
  if(!id)return;
  const t=getTrace(e.party,id,e);temporalCheck(t,e,id);mark(t,stage,e.tick);
  if(stage==='compose'){
    if(t.createdTick==null)t.createdTick=e.tick;
  }else if(stage==='latentize'){
    if(t.stages.compose.count===0)anomaly('latentize-without-observed-compose',e,{episodeId:id});
    t.latentized=true;
  }else if(stage==='reactivate'){
    if(!t.latentized)anomaly('reactivate-before-latentize',e,{episodeId:id});
    if(!Array.isArray(e.reasons)||e.reasons.length===0)anomaly('reactivate-without-current-relation-reason',e,{episodeId:id});
    const allowed=['here:','target:','danger:','gate:'];
    if(Array.isArray(e.reasons)&&e.reasons.some(r=>!allowed.some(p=>String(r).startsWith(p))))anomaly('reactivate-unknown-reason',e,{episodeId:id,reasons:e.reasons});
    if(t.firstReactivationReasons==null)t.firstReactivationReasons=[...(e.reasons||[])];
    t.current=true;t.everReactivated=true;
  }else if(stage==='noncurrent'){
    if(!t.latentized)anomaly('noncurrent-before-latentize',e,{episodeId:id});
    if(!t.everReactivated)anomaly('noncurrent-before-any-reactivation',e,{episodeId:id});
    t.current=false;
  }
}

const auditRL=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of auditRL){
  if(!line.trim())continue;
  const e=JSON.parse(line);auditLines++;auditCounts[e.type]=(auditCounts[e.type]||0)+1;
  if(e.type==='compose')episodeEvent(e,e.episodeId,'compose');
  else if(e.type==='latentize')episodeEvent(e,e.episodeId,'latentize');
  else if(e.type==='reactivate')episodeEvent(e,e.episodeId,'reactivate');
  else if(e.type==='noncurrent')episodeEvent(e,e.episodeId,'noncurrent');
  else if(e.type==='select-participation'){
    for(const id of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,id);mark(t,'participation',e.tick);
      if(!t.latentized)anomaly('participation-before-latentize',e,{episodeId:id});
      if(!t.current)anomaly('participation-while-noncurrent',e,{episodeId:id});
      t.lastParticipationTick=e.tick;
    }
  }else if(e.type==='outcome'){
    for(const id of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,id);mark(t,'outcome',e.tick);
      if(t.lastParticipationTick==null||t.lastParticipationTick>e.tick)anomaly('outcome-without-prior-participation',e,{episodeId:id,lastParticipationTick:t.lastParticipationTick});
      t.lastOutcomeTick=e.tick;
    }
  }else if(e.type==='field-spiral'){
    for(const id of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,id);mark(t,'fieldSpiral',e.tick);
      if(t.lastOutcomeTick==null||t.lastOutcomeTick>e.tick)anomaly('rewrite-without-prior-outcome',e,{episodeId:id,lastOutcomeTick:t.lastOutcomeTick});
    }
  }
}

const cfRL=readline.createInterface({input:createReadStream(CF_FILE),crlfDelay:Infinity});
for await(const line of cfRL){
  if(!line.trim())continue;
  const e=JSON.parse(line);cfLines++;
  for(const id of e.latentActiveIds||[]){const t=getTrace(e.party,id);mark(t,'jointCounterfactual',e.tick)}
}

const validation=JSON.parse(await readFile(VALIDATION_FILE,'utf8'));
const activeAtEnd=new Set();
for(const p of validation.parties||[])for(const id of p.currentLatentActiveIds||[])activeAtEnd.add(identity(p.id,id));

const hardTypes=new Set([
  'future-created-tick','future-from-tick','reactivate-before-latentize','noncurrent-before-latentize',
  'noncurrent-before-any-reactivation','reactivate-without-current-relation-reason','reactivate-unknown-reason',
  'participation-before-latentize','participation-while-noncurrent','outcome-without-prior-participation','rewrite-without-prior-outcome'
]);
const hardInvariantAnomalies=Object.entries(anomalyCounts).filter(([k])=>hardTypes.has(k)).reduce((a,[,n])=>a+n,0);
const softAuditGaps=Object.entries(anomalyCounts).filter(([k])=>!hardTypes.has(k)).reduce((a,[,n])=>a+n,0);

let tracesWithLatent=0,tracesReactivated=0,tracesParticipated=0,tracesOutcome=0,tracesRewrite=0,tracesJointCF=0;
let identityToParticipation=0,identityToOutcome=0,identityToRewrite=0,jointCFWithOutcomeChain=0;
let neverReactivatedByHorizon=0,currentAtHorizon=0,multiCycle=0;
const chainExamples=[];
const out=createWriteStream(TRACE_FILE,{encoding:'utf8'});
for(const [key,t] of traces){
  const c=t.stages;
  const formed=c.compose.count>0,latent=c.latentize.count>0,react=c.reactivate.count>0,part=c.participation.count>0,outcome=c.outcome.count>0,rewrite=c.fieldSpiral.count>0,jcf=c.jointCounterfactual.count>0;
  if(latent)tracesWithLatent++;if(react)tracesReactivated++;if(part)tracesParticipated++;if(outcome)tracesOutcome++;if(rewrite)tracesRewrite++;if(jcf)tracesJointCF++;
  const toParticipation=formed&&latent&&react&&part;
  const toOutcome=toParticipation&&outcome;
  const toRewrite=toOutcome&&rewrite;
  if(toParticipation)identityToParticipation++;if(toOutcome)identityToOutcome++;if(toRewrite)identityToRewrite++;
  if(toOutcome&&jcf)jointCFWithOutcomeChain++;
  if(latent&&!react)neverReactivatedByHorizon++;
  if(activeAtEnd.has(key)){currentAtHorizon++;t.endState='current-at-horizon-right-censored'}
  else if(latent&&!react)t.endState='latent-no-reactivation-observed-by-horizon-right-censored';
  else if(latent)t.endState=t.current?'current-right-censored':'noncurrent-at-horizon';
  else t.endState='formed-not-latentized-by-horizon';
  if(Math.min(c.reactivate.count,c.noncurrent.count+(activeAtEnd.has(key)?1:0))>1)multiCycle++;
  const summary={
    party:t.party,episodeId:t.episodeId,key:t.key,createdTick:t.createdTick,from:t.from,places:t.places,
    stages:c,firstReactivationReasons:t.firstReactivationReasons,endState:t.endState,
    causalStatus:{
      identityToParticipationObserved:toParticipation,
      identityToOutcomeObserved:toOutcome,
      identityToFutureRewriteObserved:toRewrite,
      jointSetCounterfactualMember:jcf,
      individualCausalNecessity:'UNVALIDATED',
      individualCausalSufficiency:'UNVALIDATED',
      outcomeCounterfactualEffect:'UNVALIDATED',
      futureRewriteCounterfactualEffect:'UNVALIDATED'
    }
  };
  if((toOutcome||jcf)&&chainExamples.length<12)chainExamples.push({
    party:t.party,episodeId:t.episodeId,createdTick:t.createdTick,
    latentTick:c.latentize.firstTick,firstReactivateTick:c.reactivate.firstTick,
    firstParticipationTick:c.participation.firstTick,firstOutcomeTick:c.outcome.firstTick,
    firstRewriteTick:c.fieldSpiral.firstTick,firstJointCounterfactualTick:c.jointCounterfactual.firstTick
  });
  if(!out.write(JSON.stringify(summary)+'\n'))await new Promise(r=>out.once('drain',r));
}
await new Promise((resolve,reject)=>{out.end(resolve);out.on('error',reject)});

const report={
  design:{
    baseline:'OASIS Integrated Core v2.0',source:'existing opt-in latent relation audit; production trajectory unchanged',
    unit:'party + episodeId process identity',streaming:true,
    stages:['compose','latentize','reactivate','noncurrent','select-participation','outcome','field-spiral','joint-counterfactual-membership'],
    counterfactualScope:'whole latent layer disabled in the same current state; membership supports joint-set attribution only',
    rightCensoring:true,individualCausalAttribution:false
  },
  input:{auditLines,cfLines,auditCounts,completedTick:validation.summary?.completedTick??null},
  summary:{
    totalProcessTraces:traces.size,tracesWithLatent,tracesReactivated,tracesParticipated,tracesOutcome,tracesRewrite,tracesJointCF,
    identityChainsToParticipation:identityToParticipation,identityChainsToOutcome:identityToOutcome,identityChainsToFutureRewrite:identityToRewrite,
    jointCounterfactualMembersWithOutcomeChain:jointCFWithOutcomeChain,
    neverReactivatedByHorizonRightCensored:neverReactivatedByHorizon,currentAtHorizonRightCensored:currentAtHorizon,
    tracesWithMultipleReactivateNoncurrentCycles:multiCycle,hardInvariantAnomalies,softAuditGaps
  },
  evidenceGrades:{
    O2_nonCurrentness:tracesWithLatent>0?'OBSERVED_IMPLEMENTATION':'UNVALIDATED',
    O3_contextualReactivation:tracesReactivated>0&&hardInvariantAnomalies===0?'OBSERVED_IMPLEMENTATION':'UNVALIDATED',
    processIdentityToParticipation:identityToParticipation>0&&hardInvariantAnomalies===0?'OBSERVED':'UNVALIDATED',
    processIdentityToOutcome:identityToOutcome>0&&hardInvariantAnomalies===0?'OBSERVED':'UNVALIDATED',
    futureRelationRewriteObservedInThisAudit:identityToRewrite>0?'OBSERVED':'NOT_OBSERVED_IN_THIS_HORIZON',
    jointLatentSetDecisionContribution:cfLines>0?'OBSERVED_COUNTERFACTUAL_SET_LEVEL':'UNVALIDATED',
    individualEpisodeCausalNecessity:'UNVALIDATED',individualEpisodeCausalSufficiency:'UNVALIDATED',
    outcomeCounterfactualEffect:'UNVALIDATED',futureRelationRewriteCounterfactualEffect:'UNVALIDATED',
    O1_fullProductionNoncommutativity:'UNVALIDATED',O4_distinctBehavioralEffect:'UNVALIDATED',
    dangerEqualsResponsibility:'UNVALIDATED',unrealizedPossibilityDirectCausality:'UNVALIDATED',generalization:'UNVALIDATED'
  },
  chainExamples,anomalies:{counts:anomalyCounts,samples:anomalySamples}
};
await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-CAUSAL-TRACE-LEDGER '+JSON.stringify(report.summary));
console.log('EVIDENCE '+JSON.stringify(report.evidenceGrades));
if(hardInvariantAnomalies)throw new Error(`causal trace hard invariant violations: ${hardInvariantAnomalies}`);
