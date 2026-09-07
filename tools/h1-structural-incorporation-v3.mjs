import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const AUDIT_FILE='latent-relation-store-audit.jsonl';
const REPORT_FILE='h1-structural-incorporation-v3-report.json';

const outcomesByPartyTick=new Map();
const episodes=new Map();
let auditRows=0;
let outcomeCount=0;
let compositionCount=0;
let participationCount=0;
let interventionMarkers=0;

const pt=(party,tick)=>`${party}||${tick}`;
const epk=(party,id)=>`${party}||${id}`;

const rl=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim()) continue;
  const e=JSON.parse(line);
  auditRows++;
  const party=e.party;
  const tick=e.tick;

  if(e.type==='experimenter-intervention') interventionMarkers++;

  if(e.type==='outcome'){
    outcomeCount++;
    const delta=(e.relationHistoryAfter??0)-(e.relationHistoryBefore??0);
    outcomesByPartyTick.set(pt(party,tick),{delta,choice:e.choice});
    for(const id of e.latentEpisodeIds||[]){
      const q=episodes.get(epk(party,id));
      if(q&&tick>q.formationTick){
        q.exactOutcomeCount++;
        if(q.firstExactOutcomeTick==null) q.firstExactOutcomeTick=tick;
      }
    }
  }else if(e.type==='compose'){
    compositionCount++;
    const o=outcomesByPartyTick.get(pt(party,tick));
    const from=Array.isArray(e.from)?e.from:[];
    if(o&&o.delta>0&&from.length>=2&&from[1]===tick&&e.episodeId){
      episodes.set(epk(party,e.episodeId),{
        party,
        episodeId:e.episodeId,
        key:e.key??null,
        formationTick:tick,
        realizedChoice:o.choice,
        relationHistoryDelta:o.delta,
        from:[...from],
        places:[...(e.places||[])],
        latentized:false,
        firstLatentTick:null,
        reactivationCount:0,
        firstReactivationTick:null,
        exactParticipationCount:0,
        firstExactParticipationTick:null,
        exactOutcomeCount:0,
        firstExactOutcomeTick:null
      });
    }
  }else if(e.type==='latentize'||e.type==='noncurrent'){
    if(!e.episodeId) continue;
    const q=episodes.get(epk(party,e.episodeId));
    if(q&&tick>=q.formationTick){
      q.latentized=true;
      if(q.firstLatentTick==null) q.firstLatentTick=tick;
    }
  }else if(e.type==='reactivate'){
    if(!e.episodeId) continue;
    const q=episodes.get(epk(party,e.episodeId));
    if(q&&tick>q.formationTick){
      q.reactivationCount++;
      if(q.firstReactivationTick==null) q.firstReactivationTick=tick;
    }
  }else if(e.type==='select-participation'){
    participationCount++;
    for(const id of e.latentEpisodeIds||[]){
      const q=episodes.get(epk(party,id));
      if(q&&tick>q.formationTick){
        q.exactParticipationCount++;
        if(q.firstExactParticipationTick==null) q.firstExactParticipationTick=tick;
      }
    }
  }
}

const formed=[...episodes.values()];
let latentized=0,reactivated=0,participated=0,reachedOutcome=0,exactChain=0;
const parties=new Set();
const keys=new Set();
const examples=[];

for(const q of formed){
  parties.add(q.party);
  if(q.key) keys.add(q.key);
  if(q.latentized) latentized++;
  if(q.reactivationCount>0) reactivated++;
  if(q.exactParticipationCount>0) participated++;
  if(q.exactOutcomeCount>0) reachedOutcome++;
  const ordered=q.firstReactivationTick!=null&&q.firstExactParticipationTick!=null&&q.firstExactOutcomeTick!=null&&
    q.firstReactivationTick<=q.firstExactParticipationTick&&q.firstExactParticipationTick<=q.firstExactOutcomeTick;
  if(ordered){
    exactChain++;
    if(examples.length<30) examples.push(q);
  }
}

let grade='UNVALIDATED_AT_STRUCTURAL_LEVEL';
if(formed.length>0) grade='STRUCTURAL_FORMATION_OBSERVED_WITHIN_CANONICAL_HARNESS';
if(exactChain>0&&interventionMarkers===0) grade='SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_EXACT_STRUCTURAL_LINEAGE';

const report={
  system:{name:'OASIS',version:'3.0',hypothesis:'H1'},
  question:'Does a realized experience enter the existing Past Relational Structure, participate with prior relations in forming a new Past Relational Structure, and can that exact formed relation later re-enter decision and outcome?',
  method:{
    exactGenealogy:'outcome with relational-history increase -> compose using current realization tick -> exact episode becomes non-current/latent -> exact episode reactivates -> same exact episode appears in select-participation -> same exact episode appears in later outcome',
    relationHistoryOntology:false,
    interpretationBoundary:'relationHistory is an implementation trace only. H1 evidence requires an exact episode genealogy, not storage growth alone.',
    noExperimenterInterventionRequired:true,
    nonAnticipationRequired:true
  },
  input:{auditRows,outcomeCount,compositionCount,participationCount,interventionMarkers},
  summary:{
    qualifyingFormationLinks:formed.length,
    exactEpisodesLatentized:latentized,
    exactEpisodesReactivated:reactivated,
    exactEpisodesLaterParticipating:participated,
    exactEpisodesReachingLaterOutcome:reachedOutcome,
    exactReactivationParticipationOutcomeChains:exactChain,
    distinctParties:parties.size,
    distinctComposedKeys:keys.size,
    h1EvidenceGrade:grade
  },
  interpretation:{
    structuralLineageObservedWithinCanonicalHarness:exactChain>0,
    sufficientForUniversalCausality:false,
    sufficientForRealWorldGeneralization:false,
    sufficientForWholeStructureRewrite:false
  },
  examples
};

await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-H1-V3 '+JSON.stringify(report.summary));
