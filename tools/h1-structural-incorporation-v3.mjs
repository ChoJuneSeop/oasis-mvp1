import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const AUDIT_FILE='latent-relation-store-audit.jsonl';
const REPORT_FILE='h1-structural-incorporation-v3-report.json';

const outcomes=new Map();
const compositions=[];
const participations=[];
let rows=0;

const keyOf=(party,tick)=>`${party}|${tick}`;
const rl=readline.createInterface({input:createReadStream(AUDIT_FILE),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim())continue;
  const e=JSON.parse(line); rows++;
  if(e.type==='outcome'){
    const delta=(e.relationHistoryAfter??0)-(e.relationHistoryBefore??0);
    outcomes.set(keyOf(e.party,e.tick),{...e,delta});
  } else if(e.type==='compose'){
    compositions.push(e);
  } else if(e.type==='select-participation'){
    participations.push(e);
  }
}

const linked=[];
let outcomeWithNewRealizedRelation=0;
for(const o of outcomes.values()) if(o.delta>0) outcomeWithNewRealizedRelation++;

for(const c of compositions){
  const o=outcomes.get(keyOf(c.party,c.tick));
  const currentRealizedTick=Array.isArray(c.from)?c.from[1]:null;
  const formedFromCurrentRealization=!!o&&o.delta>0&&currentRealizedTick===c.tick;
  if(!formedFromCurrentRealization) continue;

  const later=participations.find(p=>
    p.party===c.party &&
    p.tick>c.tick &&
    Array.isArray(p.activeKeys) &&
    p.activeKeys.includes(c.key)
  );

  linked.push({
    party:c.party,
    realizationTick:c.tick,
    realizedChoice:o.choice,
    relationHistoryDelta:o.delta,
    composedRelationKey:c.key,
    sourceRelationTicks:c.from,
    formationPlaces:c.places||[],
    laterStructuralParticipation:!!later,
    laterParticipationTick:later?.tick??null,
    laterChoice:later?.choice??null,
    laterLatentEpisodeIds:later?.latentEpisodeIds??[]
  });
}

const formationLinks=linked.length;
const laterParticipationLinks=linked.filter(x=>x.laterStructuralParticipation).length;
const distinctParties=[...new Set(linked.map(x=>x.party))];
const distinctComposedKeys=[...new Set(linked.map(x=>x.composedRelationKey))];

let grade='UNVALIDATED_AT_STRUCTURAL_LEVEL';
if(formationLinks>0) grade='STRUCTURAL_FORMATION_OBSERVED_WITHIN_HARNESS';
if(laterParticipationLinks>0) grade='SUPPORTED_WITHIN_HARNESS_FOR_FORMATION_AND_LATER_PARTICIPATION';

const report={
  system:{name:'OASIS',version:'3.0',hypothesis:'H1'},
  question:'Does a realized experience enter the existing Past Relational Structure and participate with prior relations in forming a new Past Relational Structure that later participates structurally?',
  method:{
    genealogy:'outcome -> realized relation-history delta -> compose(current realized relation with prior relation) -> later select-participation using the composed relation key',
    interpretationBoundary:'relationHistory field growth alone is not evidence. A qualifying H1 genealogy requires a compose event tied to the realization tick; the strongest within-harness grade additionally requires later actual decision participation.',
    noExperimenterInterventionRequired:true,
    nonAnticipationRequired:true
  },
  input:{auditRows:rows,outcomes:outcomes.size,compositions:compositions.length,participations:participations.length},
  summary:{
    outcomeWithNewRealizedRelation,
    formationLinks,
    laterParticipationLinks,
    distinctParties:distinctParties.length,
    distinctComposedKeys:distinctComposedKeys.length,
    h1EvidenceGrade:grade
  },
  interpretation:{
    sufficientForUniversalCausality:false,
    sufficientForRealWorldGeneralization:false,
    sufficientForWholeStructureRewrite:false,
    supportsOnlyTestedHarness:laterParticipationLinks>0
  },
  examples:linked.filter(x=>x.laterStructuralParticipation).slice(0,50)
};

await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-H1-V3 '+JSON.stringify(report.summary));
