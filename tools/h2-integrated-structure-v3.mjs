import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const AUDIT_FILE='latent-relation-store-audit.jsonl';
const REPORT_FILE='h2-integrated-structure-v3-report.json';

const episodeMeta=new Map();
const outcomes=[];
const composesByPartyTick=new Map();
let auditLines=0;
let interventionMarkers=0;

const pt=(party,tick)=>`${party}||${tick}`;
const epk=(party,id)=>`${party}||${id}`;

const rl=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim()) continue;
  const e=JSON.parse(line);
  auditLines++;

  if(e.type==='experimenter-intervention') interventionMarkers++;

  if((e.type==='compose'||e.type==='latentize'||e.type==='reactivate')&&e.episodeId){
    const key=epk(e.party,e.episodeId);
    const m=episodeMeta.get(key)||{};
    if(e.key!=null) m.key=e.key;
    if(e.createdTick!=null) m.createdTick=e.createdTick;
    else if(e.type==='compose'&&m.createdTick==null) m.createdTick=e.tick;
    episodeMeta.set(key,m);
  }

  if(e.type==='outcome'&&Array.isArray(e.latentEpisodeIds)&&e.latentEpisodeIds.length){
    outcomes.push(e);
  }

  if(e.type==='compose'){
    const key=pt(e.party,e.tick);
    if(!composesByPartyTick.has(key)) composesByPartyTick.set(key,[]);
    composesByPartyTick.get(key).push(e);
  }
}

let outcomesWithIncorporation=0;
let outcomesWithNewStructure=0;
let sourceEpisodeLinks=0;
let newlyComposedEpisodes=0;
let multiKeyStructureOutcomes=0;
const uniqueSourceEpisodes=new Set();
const sourceKeys=new Set();
const newKeys=new Set();
const parties=new Set();
const ages=[];
const distinctKeyCounts=[];
const examples=[];

for(const o of outcomes){
  const incorporation=Number.isFinite(o.relationHistoryBefore)&&Number.isFinite(o.relationHistoryAfter)&&o.relationHistoryAfter>o.relationHistoryBefore;
  if(incorporation) outcomesWithIncorporation++;

  const sameTick=(composesByPartyTick.get(pt(o.party,o.tick))||[])
    .filter(c=>Array.isArray(c.from)&&c.from.includes(o.tick));
  if(!incorporation||!sameTick.length) continue;

  outcomesWithNewStructure++;
  parties.add(o.party);
  newlyComposedEpisodes+=sameTick.length;
  sourceEpisodeLinks+=o.latentEpisodeIds.length;

  const keys=new Set();
  for(const id of o.latentEpisodeIds){
    uniqueSourceEpisodes.add(epk(o.party,id));
    const m=episodeMeta.get(epk(o.party,id));
    if(m?.key){ keys.add(m.key); sourceKeys.add(m.key); }
    if(Number.isFinite(m?.createdTick)) ages.push(o.tick-m.createdTick);
  }
  distinctKeyCounts.push(keys.size);
  if(keys.size>1) multiKeyStructureOutcomes++;
  for(const c of sameTick) if(c.key) newKeys.add(c.key);

  if(examples.length<12){
    examples.push({
      party:o.party,
      tick:o.tick,
      sourceEpisodeCount:o.latentEpisodeIds.length,
      distinctSourceRelationKeys:[...keys],
      relationHistoryBefore:o.relationHistoryBefore,
      relationHistoryAfter:o.relationHistoryAfter,
      newlyComposedEpisodeIds:sameTick.map(c=>c.episodeId),
      newlyComposedKeys:[...new Set(sameTick.map(c=>c.key).filter(Boolean))]
    });
  }
}

function numericSummary(xs){
  if(!xs.length) return {count:0,min:null,max:null,mean:null,median:null};
  let min=Infinity,max=-Infinity,sum=0;
  const sorted=[...xs].sort((a,b)=>a-b);
  for(const x of xs){ if(x<min)min=x; if(x>max)max=x; sum+=x; }
  const n=sorted.length;
  const median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
  return {count:n,min,max,mean:sum/n,median};
}

const report={
  system:{name:'OASIS Causal Research System',version:'3.0',analyzer:'H2 integrated structural lineage'},
  semantics:{
    hypothesis:'Realized experience is incorporated into the existing Past Relational Structure; the newly formed Past Relational Structure relates with subsequent reality and participates in formation of new relational structure and possibility composition.',
    wholeStructureRewriteAssumed:false,
    everyPastRelationMustBeCurrentlyExpressed:false,
    claimScope:'canonical harness only',
    noExperimenterInterventionAfterInitialization:true
  },
  input:{auditLines,outcomesWithLatentParticipation:outcomes.length,interventionMarkers},
  summary:{
    outcomesWithPastRelationalParticipation:outcomes.length,
    outcomesWithIncorporation,
    outcomesWithNewRelationalStructure:outcomesWithNewStructure,
    sourceEpisodeLinks,
    uniqueSourceEpisodes:uniqueSourceEpisodes.size,
    distinctSourceRelationKeys:sourceKeys.size,
    multiKeyStructureOutcomes,
    newlyComposedEpisodes,
    distinctNewRelationKeys:newKeys.size,
    participatingParties:parties.size,
    sourceEpisodeAge:numericSummary(ages),
    distinctSourceKeyCountPerStructuralOutcome:numericSummary(distinctKeyCounts)
  },
  evidence:{
    downstreamRelationalParticipationObserved:outcomes.length>0,
    realizedOutcomeIncorporationObserved:outcomesWithIncorporation>0,
    newRelationalStructureFormationAfterRelationallyParticipatedOutcome:outcomesWithNewStructure>0,
    multiRelationKeyStructureParticipationObserved:multiKeyStructureOutcomes>0,
    fullPastRelationalStructureJointCausalNecessityValidated:false,
    possibilityCompositionObjectDirectlyInstrumented:false,
    H2_grade:outcomesWithNewStructure>0&&multiKeyStructureOutcomes>0&&interventionMarkers===0
      ?'PARTIALLY_SUPPORTED_WITHIN_CANONICAL_HARNESS_INTEGRATED_CLAIM_REQUIRES_JOINT_STRUCTURE_TEST'
      :'UNVALIDATED'
  },
  examples
};

await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-H2-V3 '+JSON.stringify(report.summary));
console.log('H2-EVIDENCE '+JSON.stringify(report.evidence));
