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
let auditLines=0,cfLines=0;
const key=(party,id)=>`${party}||${id}`;
const stage=()=>({count:0,firstTick:null,lastTick:null});
const stageNames=['compose','inactive','reappearance','participation','outcome','incorporationCandidateSignal','subsequentStructureSignal','jointCounterfactual'];
function get(party,id,seed={}){
  const k=key(party,id);
  if(!traces.has(k))traces.set(k,{party,episodeId:id,relationKey:seed.key??null,createdTick:seed.createdTick??null,from:Array.isArray(seed.from)?[...seed.from]:null,places:Array.isArray(seed.places)?[...seed.places]:null,stages:Object.fromEntries(stageNames.map(x=>[x,stage()])),everInactive:false,lastInactiveTick:null,lastParticipationTick:null,lastOutcomeTick:null,reappearanceGapCount:0,reappearanceGapMin:null,reappearanceGapMax:null,reappearanceGapSum:0,reappearanceReasons:[]});
  const t=traces.get(k);
  if(t.relationKey==null&&seed.key!=null)t.relationKey=seed.key;
  if(t.createdTick==null&&seed.createdTick!=null)t.createdTick=seed.createdTick;
  if(t.from==null&&Array.isArray(seed.from))t.from=[...seed.from];
  if(t.places==null&&Array.isArray(seed.places))t.places=[...seed.places];
  return t;
}
function mark(t,n,tick){const s=t.stages[n];s.count++;if(s.firstTick==null)s.firstTick=tick;s.lastTick=tick;}
function anomaly(type,e,extra={}){anomalies[type]=(anomalies[type]||0)+1;if(anomalySamples.length<200)anomalySamples.push({type,party:e.party??null,episodeId:e.episodeId??null,tick:e.tick??null,...extra});}
function temporal(t,e,id){const created=e.createdTick??t.createdTick;if(Number.isFinite(created)&&Number.isFinite(e.tick)&&created>e.tick)anomaly('future-created-tick',e,{episodeId:id,createdTick:created});const from=Array.isArray(e.from)?e.from:t.from;if(Array.isArray(from)&&Number.isFinite(e.tick)&&from.some(x=>Number.isFinite(x)&&x>e.tick))anomaly('future-from-tick',e,{episodeId:id,from});}
function observe(e,id){if(!id)return null;const t=get(e.party,id,e);temporal(t,e,id);return t;}

const arl=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of arl){
  if(!line.trim())continue;const e=JSON.parse(line);auditLines++;auditCounts[e.type]=(auditCounts[e.type]||0)+1;
  if(e.type==='compose'){
    const t=observe(e,e.episodeId);if(t)mark(t,'compose',e.tick);
  }else if(e.type==='latentize'||e.type==='noncurrent'){
    const t=observe(e,e.episodeId);if(t){mark(t,'inactive',e.tick);t.everInactive=true;t.lastInactiveTick=e.tick;}
  }else if(e.type==='reactivate'){
    const t=observe(e,e.episodeId);if(!t)continue;
    if(!t.everInactive)anomaly('reappearance-without-prior-inactive-state',e,{episodeId:e.episodeId});
    if(!Array.isArray(e.reasons)||!e.reasons.length)anomaly('reappearance-without-current-relation-reason',e,{episodeId:e.episodeId});
    mark(t,'reappearance',e.tick);
    if(Number.isFinite(t.lastInactiveTick)&&Number.isFinite(e.tick)&&e.tick>=t.lastInactiveTick){const g=e.tick-t.lastInactiveTick;t.reappearanceGapCount++;t.reappearanceGapSum+=g;t.reappearanceGapMin=t.reappearanceGapMin==null?g:Math.min(t.reappearanceGapMin,g);t.reappearanceGapMax=t.reappearanceGapMax==null?g:Math.max(t.reappearanceGapMax,g);}
    if(t.reappearanceReasons.length<20)t.reappearanceReasons.push({tick:e.tick,reasons:[...(e.reasons||[])]});
  }else if(e.type==='select-participation'){
    for(const id of e.latentEpisodeIds||[]){const t=get(e.party,id);mark(t,'participation',e.tick);t.lastParticipationTick=e.tick;}
  }else if(e.type==='outcome'){
    const candidate=Number.isFinite(e.relationHistoryBefore)&&Number.isFinite(e.relationHistoryAfter)&&e.relationHistoryAfter>e.relationHistoryBefore;
    for(const id of e.latentEpisodeIds||[]){const t=get(e.party,id);mark(t,'outcome',e.tick);if(t.lastParticipationTick==null||t.lastParticipationTick>e.tick)anomaly('outcome-without-prior-participation',e,{episodeId:id,lastParticipationTick:t.lastParticipationTick});t.lastOutcomeTick=e.tick;if(candidate)mark(t,'incorporationCandidateSignal',e.tick);}
  }else if(e.type==='field-spiral'){
    for(const id of e.latentEpisodeIds||[]){const t=get(e.party,id);mark(t,'subsequentStructureSignal',e.tick);if(t.lastOutcomeTick==null||t.lastOutcomeTick>e.tick)anomaly('subsequent-structure-signal-without-prior-outcome',e,{episodeId:id,lastOutcomeTick:t.lastOutcomeTick});}
  }
}

const crl=readline.createInterface({input:createReadStream(CF_FILE),crlfDelay:Infinity});
for await(const line of crl){if(!line.trim())continue;const e=JSON.parse(line);cfLines++;for(const id of e.latentActiveIds||[])mark(get(e.party,id),'jointCounterfactual',e.tick);}

const validation=JSON.parse(await readFile(VALIDATION_FILE,'utf8'));
const directAtEnd=new Set();for(const p of validation.parties||[])for(const id of p.currentLatentActiveIds||[])directAtEnd.add(key(p.id,id));
const hardTypes=new Set(['future-created-tick','future-from-tick','reappearance-without-prior-inactive-state','reappearance-without-current-relation-reason','outcome-without-prior-participation','subsequent-structure-signal-without-prior-outcome']);
const hardInvariantAnomalies=Object.entries(anomalies).filter(([k])=>hardTypes.has(k)).reduce((a,[,n])=>a+n,0);

let formed=0,inactiveObserved=0,reappeared=0,repeatedReappearance=0,participated=0,outcomes=0,incorporationCandidateSignals=0,subsequentStructureSignals=0,jointCF=0,notReobservedWithinHorizon=0,directAtHorizon=0;
let gapCount=0,gapMin=null,gapMax=null,gapSum=0;
const examples=[];const out=createWriteStream(TRACE_FILE,{encoding:'utf8'});
for(const [k,t] of traces){
  const s=t.stages;
  if(s.compose.count)formed++;if(s.inactive.count)inactiveObserved++;if(s.reappearance.count)reappeared++;if(s.reappearance.count>1)repeatedReappearance++;if(s.participation.count)participated++;if(s.outcome.count)outcomes++;if(s.incorporationCandidateSignal.count)incorporationCandidateSignals++;if(s.subsequentStructureSignal.count)subsequentStructureSignals++;if(s.jointCounterfactual.count)jointCF++;
  if(t.reappearanceGapCount){gapCount+=t.reappearanceGapCount;gapSum+=t.reappearanceGapSum;gapMin=gapMin==null?t.reappearanceGapMin:Math.min(gapMin,t.reappearanceGapMin);gapMax=gapMax==null?t.reappearanceGapMax:Math.max(gapMax,t.reappearanceGapMax);}
  let endState;if(directAtEnd.has(k)){directAtHorizon++;endState='DIRECTLY_RELATING_AT_HORIZON';}else if(s.inactive.count&&!s.reappearance.count){notReobservedWithinHorizon++;endState='NOT_REOBSERVED_WITHIN_HORIZON';}else if(s.inactive.count)endState='REAPPEARED_PREVIOUSLY_NOT_DIRECT_AT_HORIZON';else endState='NO_INACTIVE_INTERVAL_OBSERVED';
  const row={party:t.party,auditMarkerEpisodeId:t.episodeId,relationKey:t.relationKey,createdTick:t.createdTick,from:t.from,places:t.places,stages:s,reappearanceGapSummary:{count:t.reappearanceGapCount,min:t.reappearanceGapMin,max:t.reappearanceGapMax,mean:t.reappearanceGapCount?t.reappearanceGapSum/t.reappearanceGapCount:null},endState};
  if(!out.write(JSON.stringify(row)+'\n'))await new Promise(r=>out.once('drain',r));
  if(examples.length<16&&(s.outcome.count||s.reappearance.count||s.jointCounterfactual.count))examples.push(row);
}
await new Promise((resolve,reject)=>{out.end(resolve);out.on('error',reject)});
const gapSummary={count:gapCount,min:gapMin,max:gapMax,mean:gapCount?gapSum/gapCount:null};
const report={system:{name:'OASIS Causal Research System',version:'2.0-safe-assembler',governingProtocol:'OASIS_RESEARCH_PROTOCOL.md'},design:{semanticCompatibility:'v2 evidence semantics preserved; gap aggregation changed from spread-based to streaming aggregation only',counterfactualScope:'analysis-only',nonAnticipatory:true},input:{auditLines,cfLines,auditCounts,completedTick:validation.summary?.completedTick??null},summary:{totalAuditMarkerTraces:traces.size,formed,inactiveObserved,relationalReappearanceObserved:reappeared,repeatedReappearanceTraces:repeatedReappearance,participated,realizedOutcomes:outcomes,pastStructureIncorporationCandidateSignals:incorporationCandidateSignals,subsequentStructureSignals,jointCounterfactualMembers:jointCF,notReobservedWithinHorizon,directlyRelatingAtHorizon:directAtHorizon,reappearanceGapSummary:gapSummary,hardInvariantAnomalies},v2EvidenceGrades:{H1_realizationAndPastStructureIncorporation:incorporationCandidateSignals>0?'IMPLEMENTATION_SIGNAL_STRUCTURAL_VALIDATION_REQUIRED':'UNVALIDATED',H2_newPastStructureAndSubsequentRealityRelation:subsequentStructureSignals>0?'IMPLEMENTATION_SIGNAL_INTEGRATED_HYPOTHESIS_UNVALIDATED':'UNVALIDATED',H3_relationalReappearance:reappeared>0&&hardInvariantAnomalies===0?'OBSERVED_IMPLEMENTATION':'UNVALIDATED',H4_relationalPersistenceLimit:'OPEN_INQUIRY',extinctionFromNonObservation:'EXCLUDED_INTERPRETATION',divergenceDelayAsCausalStrength:'EXCLUDED_INTERPRETATION',wholeStructureRewrite:'EXCLUDED_BY_V2_SEMANTICS',persistentUnrealizedParallelPath:'EXCLUDED_BY_V2_SEMANTICS',generalization:'UNVALIDATED'},examples,anomalies:{counts:anomalies,samples:anomalySamples}};
await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-CAUSAL-V2-SAFE '+JSON.stringify(report.summary));
console.log('V2-EVIDENCE '+JSON.stringify(report.v2EvidenceGrades));
if(hardInvariantAnomalies)throw new Error(`causal v2 hard invariant violations: ${hardInvariantAnomalies}`);
