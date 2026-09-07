import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const AUDIT_FILE='latent-relation-store-audit.jsonl';
const CF_FILE='latent-relation-store-counterfactual.jsonl';
const VALIDATION_FILE='latent-relation-store-validation-report.json';
const REPORT_FILE='causal-trace-ledger-v2-report.json';
const TRACE_FILE='causal-v2-traces.jsonl';

const traces=new Map();
const auditCounts={};
const anomalies={};
const anomalySamples=[];
let auditLines=0;
let cfLines=0;

const stageNames=[
  'compose',
  'inactive',
  'reappearance',
  'participation',
  'outcome',
  'incorporationCandidateSignal',
  'subsequentStructureSignal',
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
      currentlyDirect:false,
      everInactive:false,
      lastInactiveTick:null,
      lastParticipationTick:null,
      lastOutcomeTick:null,
      reappearanceReasons:[],
      reappearanceGaps:[],
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
function observeEpisode(e,episodeId){
  if(!episodeId)return null;
  const t=getTrace(e.party,episodeId,e);
  temporalCheck(t,e,episodeId);
  return t;
}
function markInactive(e,episodeId){
  const t=observeEpisode(e,episodeId);
  if(!t)return;
  mark(t,'inactive',e.tick);
  t.everInactive=true;
  t.currentlyDirect=false;
  if(Number.isFinite(e.tick))t.lastInactiveTick=e.tick;
}
function markReappearance(e,episodeId){
  const t=observeEpisode(e,episodeId);
  if(!t)return;
  if(!t.everInactive){
    anomaly('reappearance-without-prior-inactive-state',e,{episodeId});
  }
  if(!Array.isArray(e.reasons)||e.reasons.length===0){
    anomaly('reappearance-without-current-relation-reason',e,{episodeId});
  }
  mark(t,'reappearance',e.tick);
  if(Number.isFinite(t.lastInactiveTick)&&Number.isFinite(e.tick)&&e.tick>=t.lastInactiveTick){
    t.reappearanceGaps.push(e.tick-t.lastInactiveTick);
  }
  t.reappearanceReasons.push({tick:e.tick,reasons:[...(e.reasons||[])]});
  t.currentlyDirect=true;
}

const auditRL=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of auditRL){
  if(!line.trim())continue;
  const e=JSON.parse(line);
  auditLines++;
  auditCounts[e.type]=(auditCounts[e.type]||0)+1;

  if(e.type==='compose'){
    const t=observeEpisode(e,e.episodeId);
    if(t){mark(t,'compose',e.tick);t.currentlyDirect=true;}
  }else if(e.type==='latentize'||e.type==='noncurrent'){
    markInactive(e,e.episodeId);
  }else if(e.type==='reactivate'){
    markReappearance(e,e.episodeId);
  }else if(e.type==='select-participation'){
    for(const episodeId of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,episodeId);
      mark(t,'participation',e.tick);
      t.lastParticipationTick=e.tick;
    }
  }else if(e.type==='outcome'){
    const candidateSignal=Number.isFinite(e.relationHistoryBefore)&&Number.isFinite(e.relationHistoryAfter)&&e.relationHistoryAfter>e.relationHistoryBefore;
    for(const episodeId of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,episodeId);
      mark(t,'outcome',e.tick);
      if(t.lastParticipationTick==null||t.lastParticipationTick>e.tick){
        anomaly('outcome-without-prior-participation',e,{episodeId,lastParticipationTick:t.lastParticipationTick});
      }
      t.lastOutcomeTick=e.tick;
      if(candidateSignal)mark(t,'incorporationCandidateSignal',e.tick);
    }
  }else if(e.type==='field-spiral'){
    for(const episodeId of e.latentEpisodeIds||[]){
      const t=getTrace(e.party,episodeId);
      mark(t,'subsequentStructureSignal',e.tick);
      if(t.lastOutcomeTick==null||t.lastOutcomeTick>e.tick){
        anomaly('subsequent-structure-signal-without-prior-outcome',e,{episodeId,lastOutcomeTick:t.lastOutcomeTick});
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
const directAtEnd=new Set();
for(const p of validation.parties||[]){
  for(const episodeId of p.currentLatentActiveIds||[])directAtEnd.add(traceKey(p.id,episodeId));
}

const hardTypes=new Set([
  'future-created-tick',
  'future-from-tick',
  'reappearance-without-prior-inactive-state',
  'reappearance-without-current-relation-reason',
  'outcome-without-prior-participation',
  'subsequent-structure-signal-without-prior-outcome'
]);
const hardInvariantAnomalies=Object.entries(anomalies)
  .filter(([k])=>hardTypes.has(k))
  .reduce((sum,[,n])=>sum+n,0);

let formed=0,inactiveObserved=0,reappeared=0,participated=0,outcomes=0;
let incorporationCandidateSignals=0,subsequentStructureSignals=0,jointCF=0;
let notReobservedWithinHorizon=0,directAtHorizon=0,repeatedReappearance=0;
const allReappearanceGaps=[];
const examples=[];
const out=createWriteStream(TRACE_FILE,{encoding:'utf8'});

for(const [id,t] of traces){
  const s=t.stages;
  const hasCompose=s.compose.count>0;
  const hasInactive=s.inactive.count>0;
  const hasReappearance=s.reappearance.count>0;
  const hasParticipation=s.participation.count>0;
  const hasOutcome=s.outcome.count>0;
  const hasCandidate=s.incorporationCandidateSignal.count>0;
  const hasSubsequent=s.subsequentStructureSignal.count>0;
  const hasJointCF=s.jointCounterfactual.count>0;

  if(hasCompose)formed++;
  if(hasInactive)inactiveObserved++;
  if(hasReappearance)reappeared++;
  if(hasParticipation)participated++;
  if(hasOutcome)outcomes++;
  if(hasCandidate)incorporationCandidateSignals++;
  if(hasSubsequent)subsequentStructureSignals++;
  if(hasJointCF)jointCF++;
  if(s.reappearance.count>1)repeatedReappearance++;
  allReappearanceGaps.push(...t.reappearanceGaps);

  if(directAtEnd.has(id)){
    directAtHorizon++;
    t.endState='DIRECTLY_RELATING_AT_HORIZON';
  }else if(hasInactive&&!hasReappearance){
    notReobservedWithinHorizon++;
    t.endState='NOT_REOBSERVED_WITHIN_HORIZON';
  }else if(hasInactive){
    t.endState='REAPPEARED_PREVIOUSLY_NOT_DIRECT_AT_HORIZON';
  }else{
    t.endState='NO_INACTIVE_INTERVAL_OBSERVED';
  }

  const summary={
    party:t.party,
    auditMarkerEpisodeId:t.episodeId,
    relationKey:t.relationKey,
    createdTick:t.createdTick,
    from:t.from,
    places:t.places,
    stages:s,
    reappearanceReasons:t.reappearanceReasons,
    reappearanceGaps:t.reappearanceGaps,
    endState:t.endState,
    v2Evidence:{
      realizationObserved:hasOutcome,
      pastStructureIncorporationCandidateSignal:hasCandidate,
      structuralIncorporationValidated:false,
      subsequentStructureSignalObserved:hasSubsequent,
      newPastStructureSubsequentRealityRelationValidated:false,
      relationalReappearanceObserved:hasReappearance,
      repeatedReappearanceObserved:s.reappearance.count>1,
      persistenceLimitStatus:'OPEN_INQUIRY',
      jointSetCounterfactualMember:hasJointCF
    }
  };

  if((hasOutcome||hasReappearance||hasJointCF)&&examples.length<16){
    examples.push({
      party:t.party,
      auditMarkerEpisodeId:t.episodeId,
      firstOutcomeTick:s.outcome.firstTick,
      firstCandidateIncorporationSignalTick:s.incorporationCandidateSignal.firstTick,
      firstSubsequentStructureSignalTick:s.subsequentStructureSignal.firstTick,
      firstInactiveTick:s.inactive.firstTick,
      firstReappearanceTick:s.reappearance.firstTick,
      reappearanceCount:s.reappearance.count,
      reappearanceGaps:t.reappearanceGaps
    });
  }

  if(!out.write(JSON.stringify(summary)+'\n'))await new Promise(r=>out.once('drain',r));
}
await new Promise((resolve,reject)=>{out.end(resolve);out.on('error',reject)});

const gapSummary=allReappearanceGaps.length?{
  count:allReappearanceGaps.length,
  min:Math.min(...allReappearanceGaps),
  max:Math.max(...allReappearanceGaps),
  mean:allReappearanceGaps.reduce((a,b)=>a+b,0)/allReappearanceGaps.length
}:{count:0,min:null,max:null,mean:null};

const report={
  system:{
    name:'OASIS Causal Research System',
    version:'2.0',
    governingProtocol:'OASIS_RESEARCH_PROTOCOL.md',
    semanticBaseline:'continuous reality flow; realized experience incorporated into existing past relational structure; new past relational structure relates with subsequent reality',
    relationHistoryAsCoreTheoryTerm:false,
    wholeStructureRewriteAssumed:false,
    persistentUnrealizedParallelPathsAssumed:false,
    episodeIdIsOntologicalRealityUnit:false
  },
  design:{
    primaryResearchAxes:[
      'realization-and-past-structure-incorporation',
      'new-past-structure-and-subsequent-reality-relation',
      'relational-reappearance',
      'relational-persistence-limit-inquiry'
    ],
    auxiliaryObservations:['divergence-delay-when-paired-flow-exists'],
    legacyComparatorAxes:[
      'divergence-delay',
      'realized-change',
      'persistence',
      'reconvergence',
      'accumulated-relational-effect',
      'downstream-long-horizon-effect'
    ],
    counterfactualScope:'analysis-only; never written into production past relational structure',
    nonAnticipatory:true
  },
  input:{
    auditLines,
    cfLines,
    auditCounts,
    completedTick:validation.summary?.completedTick??null
  },
  summary:{
    totalAuditMarkerTraces:traces.size,
    formed,
    inactiveObserved,
    relationalReappearanceObserved:reappeared,
    repeatedReappearanceTraces:repeatedReappearance,
    participated,
    realizedOutcomes:outcomes,
    pastStructureIncorporationCandidateSignals:incorporationCandidateSignals,
    subsequentStructureSignals,
    jointCounterfactualMembers:jointCF,
    notReobservedWithinHorizon,
    directlyRelatingAtHorizon:directAtHorizon,
    reappearanceGapSummary:gapSummary,
    hardInvariantAnomalies
  },
  v2EvidenceGrades:{
    H1_realizationAndPastStructureIncorporation:incorporationCandidateSignals>0?'IMPLEMENTATION_SIGNAL_STRUCTURAL_VALIDATION_REQUIRED':'UNVALIDATED',
    H2_newPastStructureAndSubsequentRealityRelation:subsequentStructureSignals>0?'IMPLEMENTATION_SIGNAL_INTEGRATED_HYPOTHESIS_UNVALIDATED':'UNVALIDATED',
    H3_relationalReappearance:reappeared>0&&hardInvariantAnomalies===0?'OBSERVED_IMPLEMENTATION':'UNVALIDATED',
    H4_relationalPersistenceLimit:'OPEN_INQUIRY',
    extinctionFromNonObservation:'EXCLUDED_INTERPRETATION',
    divergenceDelayAsCausalStrength:'EXCLUDED_INTERPRETATION',
    wholeStructureRewrite:'EXCLUDED_BY_V2_SEMANTICS',
    persistentUnrealizedParallelPath:'EXCLUDED_BY_V2_SEMANTICS',
    generalization:'UNVALIDATED'
  },
  examples,
  anomalies:{counts:anomalies,samples:anomalySamples}
};

await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-CAUSAL-V2 '+JSON.stringify(report.summary));
console.log('V2-EVIDENCE '+JSON.stringify(report.v2EvidenceGrades));
if(hardInvariantAnomalies)throw new Error(`causal v2 hard invariant violations: ${hardInvariantAnomalies}`);
