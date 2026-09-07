import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const AUDIT_FILE='latent-relation-store-audit.jsonl';
const CF_FILE='latent-relation-store-counterfactual.jsonl';
const VALIDATION_FILE='latent-relation-store-validation-report.json';
const REPORT_FILE='causal-trace-ledger-v1-report.json';
const TRACE_FILE='causal-v1-traces.jsonl';

const traces=new Map();
const auditCounts={};
const anomalies={};
const anomalySamples=[];
let auditLines=0;
let cfLines=0;

const stageNames=[
  'compose',
  'latentize',
  'reactivate',
  'noncurrent',
  'participation',
  'outcome',
  'realizedRelationIncorporation',
  'postRealizationJudgmentChange',
  'jointCounterfactual'
];

function traceKey(party,episodeId){return `${party}||${episodeId}`}
function blankStage(){return {count:0,firstTick:null,lastTick:null}}
function getTrace(party,episodeId,seed={}){
  const id=traceKey(party,episodeId);
  if(!traces.has(id)){
    traces.set(id,{
      party,
      episodeId,
      relationKey:seed.key??null,
      createdTick:seed.createdTick??null,
      from:Array.isArray(seed.from)?[...seed.from]:null,
      places:Array.isArray(seed.places)?[...seed.places]:null,
      stages:Object.fromEntries(stageNames.map(s=>[s,blankStage()])),
      firstReactivationReasons:null,
      current:false,
      latentized:false,
      everReactivated:false,
      lastParticipationTick:null,
      lastOutcomeTick:null,
      endState:null
    });
  }
  const t=traces.get(id);
  if(t.relationKey==null&&seed.key!=null)t.relationKey=seed.key;
  if(t.createdTick==null&&seed.createdTick!=null)t.createdTick=seed.createdTick;
  if(t.from==null&&Array.isArray(seed.from))t.from=[...seed.from];
  if(t.places==null&&Array.isArray(seed.places))t.places=[...seed.places];
  return t;
}
function mark(t,stage,tick){
  const s=t.stages[stage];
  s.count++;
  if(s.firstTick==null)s.firstTick=tick;
  s.lastTick=tick;
}
function anomaly(type,e,extra={}){
  anomalies[type]=(anomalies[type]||0)+1;
  if(anomalySamples.length<200){
    anomalySamples.push({type,party:e.party??null,episodeId:e.episodeId??null,tick:e.tick??null,...extra});
  }
}
function temporalCheck(t,e,episodeId){
  const created=e.createdTick??t.createdTick;
  if(Number.isFinite(created)&&Number.isFinite(e.tick)&&created>e.tick){
    anomaly('future-created-tick',e,{episodeId,createdTick:created});
  }
  const from=Array.isArray(e.from)?e.from:t.from;
  if(Array.isArray(from)&&Number.isFinite(e.tick)&&from.some(x=>Number.isFinite(x)&&x>e.tick)){
    anomaly('future-from-tick',e,{episodeId,from});
  }
}
function markEpisodeEvent(e,episodeId,stage){
  if(!episodeId)return;
  const t=getTrace(e.party,episodeId,e);
  temporalCheck(t,e,episodeId);
  mark(t,stage,e.tick);
  if(stage==='latentize'){
    t.latentized=true;
  }else if(stage==='reactivate'){
    if(!t.latentized)anomaly('reactivate-before-latentize',e,{episodeId});
    if(!Array.isArray(e.reasons)||e.reasons.length===0)anomaly('reactivate-without-current-relation-reason',e,{episodeId});
    t.current=true;
    t.everReactivated=true;
    if(t.firstReactivationReasons==null)t.firstReactivationReasons=[...(e.reasons||[])];
  }else if(stage==='noncurrent'){
    if(!t.latentized)anomaly('noncurrent-before-latentize',e,{episodeId});
    t.current=false;
  }
}

const auditRL=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of auditRL){
  if(!line.trim())continue;
  const e=JSON.parse(line);
  auditLines++;
  auditCounts[e.type]=(auditCounts[e.type]||0)+1;

  if(e.type==='compose')markEpisodeEvent(e,e.episodeId,'compose');
  else if(e.type==='latentize')markEpisodeEvent(e,e.episodeId,'latentize');
  else if(e.type==='reactivate')markEpisodeEvent(e,e.episodeId,'reactivate');
  else if(e.type==='noncurrent')markEpisodeEvent(e,e.episodeId,'noncurrent');
  else if(e.type==='select-participation'){
    for(const episodeId of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,episodeId);
      mark(t,'participation',e.tick);
      if(!t.current)anomaly('participation-while-noncurrent',e,{episodeId});
      t.lastParticipationTick=e.tick;
    }
  }else if(e.type==='outcome'){
    const incorporated=Number.isFinite(e.relationHistoryBefore)&&Number.isFinite(e.relationHistoryAfter)&&e.relationHistoryAfter>e.relationHistoryBefore;
    for(const episodeId of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,episodeId);
      mark(t,'outcome',e.tick);
      if(t.lastParticipationTick==null||t.lastParticipationTick>e.tick){
        anomaly('outcome-without-prior-participation',e,{episodeId,lastParticipationTick:t.lastParticipationTick});
      }
      t.lastOutcomeTick=e.tick;
      if(incorporated)mark(t,'realizedRelationIncorporation',e.tick);
    }
  }else if(e.type==='field-spiral'){
    for(const episodeId of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,episodeId);
      mark(t,'postRealizationJudgmentChange',e.tick);
      if(t.lastOutcomeTick==null||t.lastOutcomeTick>e.tick){
        anomaly('post-realization-change-without-prior-outcome',e,{episodeId,lastOutcomeTick:t.lastOutcomeTick});
      }
    }
  }
}

const cfRL=readline.createInterface({input:createReadStream(CF_FILE),crlfDelay:Infinity});
for await(const line of cfRL){
  if(!line.trim())continue;
  const e=JSON.parse(line);
  cfLines++;
  for(const episodeId of e.latentActiveIds||[]){
    mark(getTrace(e.party,episodeId),'jointCounterfactual',e.tick);
  }
}

const validation=JSON.parse(await readFile(VALIDATION_FILE,'utf8'));
const activeAtEnd=new Set();
for(const p of validation.parties||[]){
  for(const episodeId of p.currentLatentActiveIds||[])activeAtEnd.add(traceKey(p.id,episodeId));
}

const hardTypes=new Set([
  'future-created-tick',
  'future-from-tick',
  'reactivate-before-latentize',
  'reactivate-without-current-relation-reason',
  'participation-while-noncurrent',
  'outcome-without-prior-participation',
  'post-realization-change-without-prior-outcome'
]);
const hardInvariantAnomalies=Object.entries(anomalies)
  .filter(([k])=>hardTypes.has(k))
  .reduce((sum,[,n])=>sum+n,0);

let formed=0,latentized=0,reactivated=0,participated=0,outcomes=0,incorporations=0,postFormationChanges=0,jointCF=0;
let chainsToOutcome=0,chainsToIncorporation=0,chainsToPostFormation=0;
let latentNoReactivationByHorizon=0,currentAtHorizon=0;
const examples=[];
const out=createWriteStream(TRACE_FILE,{encoding:'utf8'});

for(const [id,t] of traces){
  const s=t.stages;
  const hasCompose=s.compose.count>0;
  const hasLatent=s.latentize.count>0;
  const hasReact=s.reactivate.count>0;
  const hasParticipation=s.participation.count>0;
  const hasOutcome=s.outcome.count>0;
  const hasIncorporation=s.realizedRelationIncorporation.count>0;
  const hasPostFormation=s.postRealizationJudgmentChange.count>0;
  const hasJointCF=s.jointCounterfactual.count>0;

  if(hasCompose)formed++;
  if(hasLatent)latentized++;
  if(hasReact)reactivated++;
  if(hasParticipation)participated++;
  if(hasOutcome)outcomes++;
  if(hasIncorporation)incorporations++;
  if(hasPostFormation)postFormationChanges++;
  if(hasJointCF)jointCF++;

  const toOutcome=hasCompose&&hasLatent&&hasReact&&hasParticipation&&hasOutcome;
  const toIncorporation=toOutcome&&hasIncorporation;
  const toPostFormation=toOutcome&&hasPostFormation;
  if(toOutcome)chainsToOutcome++;
  if(toIncorporation)chainsToIncorporation++;
  if(toPostFormation)chainsToPostFormation++;

  if(hasLatent&&!hasReact)latentNoReactivationByHorizon++;
  if(activeAtEnd.has(id)){
    currentAtHorizon++;
    t.endState='current-at-horizon-right-censored';
  }else if(hasLatent&&!hasReact)t.endState='latent-no-reactivation-observed-by-horizon-right-censored';
  else if(hasLatent)t.endState=t.current?'current-right-censored':'noncurrent-at-horizon';
  else t.endState='formed-not-latentized-by-horizon';

  const summary={
    party:t.party,
    episodeId:t.episodeId,
    relationKey:t.relationKey,
    createdTick:t.createdTick,
    from:t.from,
    places:t.places,
    stages:s,
    firstReactivationReasons:t.firstReactivationReasons,
    endState:t.endState,
    causalStatus:{
      participationObserved:hasParticipation,
      realizedOutcomeObserved:hasOutcome,
      realizedRelationIncorporationObserved:hasIncorporation,
      postRealizationJudgmentChangeObserved:hasPostFormation,
      jointSetCounterfactualMember:hasJointCF,
      individualCausalNecessity:'UNVALIDATED',
      individualCausalSufficiency:'UNVALIDATED'
    }
  };
  if((toOutcome||hasJointCF)&&examples.length<12){
    examples.push({
      party:t.party,
      episodeId:t.episodeId,
      formedTick:s.compose.firstTick,
      firstReactivationTick:s.reactivate.firstTick,
      firstParticipationTick:s.participation.firstTick,
      firstOutcomeTick:s.outcome.firstTick,
      firstIncorporationTick:s.realizedRelationIncorporation.firstTick,
      firstPostRealizationChangeTick:s.postRealizationJudgmentChange.firstTick,
      firstJointCounterfactualTick:s.jointCounterfactual.firstTick
    });
  }
  if(!out.write(JSON.stringify(summary)+'\n'))await new Promise(r=>out.once('drain',r));
}
await new Promise((resolve,reject)=>{out.end(resolve);out.on('error',reject)});

const report={
  system:{
    name:'OASIS Causal Research System',
    version:'1.0',
    semanticBaseline:'realized relation accumulation and subsequent relational-structure formation',
    wholeStructureRewriteAssumed:false,
    persistentUnrealizedParallelPathsAssumed:false
  },
  design:{
    primaryEmpiricalLayer:'observed realized flow',
    internalModelLayer:'possibility composition / reactivation / participation',
    source:'existing opt-in audit; production trajectory unchanged',
    traceUnit:'party + episodeId',
    counterfactualScope:'analysis-only joint latent-set comparison',
    rightCensoring:true,
    nonAnticipatory:true
  },
  input:{
    auditLines,
    cfLines,
    auditCounts,
    completedTick:validation.summary?.completedTick??null
  },
  summary:{
    totalProcessTraces:traces.size,
    formed,
    latentized,
    reactivated,
    participated,
    outcomes,
    realizedRelationIncorporations:incorporations,
    postRealizationJudgmentChanges:postFormationChanges,
    jointCounterfactualMembers:jointCF,
    chainsToOutcome,
    chainsToRealizedRelationIncorporation:chainsToIncorporation,
    chainsToPostRealizationFormationChange:chainsToPostFormation,
    latentNoReactivationByHorizonRightCensored:latentNoReactivationByHorizon,
    currentAtHorizonRightCensored:currentAtHorizon,
    hardInvariantAnomalies
  },
  measurementAxes:{
    divergenceDelay:'REQUIRES_PAIRED_INTERVENTION_FLOW',
    realizedChange:'AVAILABLE_WHEN_PAIRED_REALIZED_FLOWS_ARE_RECORDED',
    persistence:'REQUIRES_LONGITUDINAL_PAIRED_FLOW',
    reconvergence:'REQUIRES_LONGITUDINAL_PAIRED_FLOW',
    accumulatedRelationalEffect:incorporations>0?'OBSERVED_IN_AUDIT_LAYER':'NOT_OBSERVED_IN_THIS_HORIZON',
    downstreamLongHorizonEffect:postFormationChanges>0?'OBSERVED_ASSOCIATED_CHANGE_NOT_YET_INDIVIDUALLY_ATTRIBUTED':'UNVALIDATED'
  },
  evidenceGrades:{
    contextualReactivation:reactivated>0&&hardInvariantAnomalies===0?'OBSERVED_IMPLEMENTATION':'UNVALIDATED',
    participation:participated>0&&hardInvariantAnomalies===0?'OBSERVED':'UNVALIDATED',
    realizedOutcome:outcomes>0?'OBSERVED':'UNVALIDATED',
    realizedRelationIncorporation:incorporations>0?'OBSERVED':'NOT_OBSERVED_IN_THIS_HORIZON',
    postRealizationJudgmentChange:postFormationChanges>0?'OBSERVED_ASSOCIATION':'UNVALIDATED',
    individualCausalNecessity:'UNVALIDATED',
    individualCausalSufficiency:'UNVALIDATED',
    wholeStructureRewrite:'EXCLUDED_BY_V1_SEMANTICS',
    persistentUnrealizedParallelPath:'EXCLUDED_BY_V1_SEMANTICS',
    generalization:'UNVALIDATED'
  },
  examples,
  anomalies:{counts:anomalies,samples:anomalySamples}
};

await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-CAUSAL-V1 '+JSON.stringify(report.summary));
console.log('MEASUREMENT '+JSON.stringify(report.measurementAxes));
console.log('EVIDENCE '+JSON.stringify(report.evidenceGrades));
if(hardInvariantAnomalies)throw new Error(`causal v1 hard invariant violations: ${hardInvariantAnomalies}`);
