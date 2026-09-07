import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const CF_FILE='latent-relation-store-counterfactual.jsonl';
const V2_FILE='causal-trace-ledger-v2-report.json';
const VALIDATION_FILE='latent-relation-store-validation-report.json';
const REPORT_FILE='causal-trace-ledger-v3-report.json';

const v2=JSON.parse(await readFile(V2_FILE,'utf8'));
const validation=JSON.parse(await readFile(VALIDATION_FILE,'utf8'));

let counterfactualRows=0;
let candidateSetDifferences=0;
let participationLeaderDifferences=0;
let selectedActionDifferences=0;
let sameChoiceDespiteCandidateDifference=0;
const examples=[];

const rl=readline.createInterface({input:createReadStream(CF_FILE),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim())continue;
  const e=JSON.parse(line);
  counterfactualRows++;
  const full=e.full||{};
  const noLat=e.noLat||{};
  const cand=full.cands!==noLat.cands;
  const part=full.leader!==noLat.leader;
  const choice=full.choice!==noLat.choice;
  if(cand)candidateSetDifferences++;
  if(part)participationLeaderDifferences++;
  if(choice)selectedActionDifferences++;
  if(cand&&!choice)sameChoiceDespiteCandidateDifference++;
  if(examples.length<20&&(cand||part||choice)){
    examples.push({
      tick:e.tick,
      party:e.party,
      currentPlace:e.currentPlace,
      danger:e.danger,
      latentActiveIds:e.latentActiveIds||[],
      candidateSetDifference:cand,
      participationLeaderDifference:part,
      selectedActionDifference:choice,
      full,
      withoutReactivatedPastRelations:noLat
    });
  }
}

const hardInvariantAnomalies=v2.summary?.hardInvariantAnomalies??null;
const relationalCandidateContributionObserved=candidateSetDifferences>0&&hardInvariantAnomalies===0;
const relationalDecisionContributionObserved=(participationLeaderDifferences>0||selectedActionDifferences>0)&&hardInvariantAnomalies===0;

const report={
  system:{
    name:'OASIS Causal Research System',
    version:'3.0',
    governingProtocol:'OASIS_RESEARCH_PROTOCOL.md',
    semanticBaseline:'Past Relational Structure + Current Reality + optional Individual Disposition -> Behavioral Decision Relational Candidate Set -> Possibility Composition -> Participation / Choice / Responsibility / Reality Constraints -> Single Behavioral Realization',
    relationalFieldDefinition:'Open Field of Possibility Combinations',
    relationalFieldIsPhysicalField:false,
    mathematicalInfinityAsserted:false,
    persistentParallelRealitiesAsserted:false
  },
  design:{
    runType:'v3 reinterpretation of fresh canonical 120k longitudinal audit using shadow same-current-state relational ablation',
    productionRealityModifiedByDiagnostic:false,
    experimenterInterventionCount:0,
    nonAnticipatory:true,
    dispositionCondition:'NONE',
    dispositionEffectTested:false,
    candidateSetTest:'same current production state; reactivated past-relation layer enabled versus temporarily disabled in analysis-only shadow evaluation',
    interpretationLimit:'This run can test a relational contribution to behavioral candidate/decision signatures under fixed current state. It cannot validate Individual Disposition, universal H0, or sufficiency/necessity of the full v3 factor set.'
  },
  input:{
    completedTick:validation.summary?.completedTick??null,
    counterfactualRows,
    inheritedV2AuditLines:v2.input?.auditLines??null,
    inheritedV2HardInvariantAnomalies:hardInvariantAnomalies
  },
  summary:{
    candidateSetDifferences,
    participationLeaderDifferences,
    selectedActionDifferences,
    sameChoiceDespiteCandidateDifference,
    relationalCandidateContributionObserved,
    relationalDecisionContributionObserved,
    experimenterInterventionCount:0
  },
  v3EvidenceGrades:{
    H0_behavioralDecisionParticipation:'PARTIALLY_OBSERVED_RELATIONAL_COMPONENT; INDIVIDUAL_DISPOSITION_AND_FULL_FACTOR_INTERACTION_UNVALIDATED',
    H0_pastRelationalStructureContribution:relationalCandidateContributionObserved?'OBSERVED_WITHIN_CANONICAL_HARNESS':'UNVALIDATED',
    H0_currentRealityJointRole:'HELD_FIXED_IN_RELATIONAL_ABLATION; JOINT_ROLE_NOT_INDEPENDENTLY_IDENTIFIED',
    H0_individualDisposition:'UNVALIDATED',
    H0_candidateSetSufficiency:'NOT_ASSUMED_AND_NOT_ESTABLISHED',
    H1_realizationAndPastStructureIncorporation:v2.v2EvidenceGrades?.H1_realizationAndPastStructureIncorporation??'UNVALIDATED',
    H2_newPastStructureAndSubsequentRealityRelation:v2.v2EvidenceGrades?.H2_newPastStructureAndSubsequentRealityRelation??'UNVALIDATED',
    H3_relationalReappearance:v2.v2EvidenceGrades?.H3_relationalReappearance??'UNVALIDATED',
    H4_relationalPersistenceLimit:v2.v2EvidenceGrades?.H4_relationalPersistenceLimit??'OPEN_INQUIRY',
    generalization:'UNVALIDATED'
  },
  inheritedV2Summary:v2.summary,
  examples
};

await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-CAUSAL-V3 '+JSON.stringify(report.summary));
console.log('V3-EVIDENCE '+JSON.stringify(report.v3EvidenceGrades));

if((validation.summary?.completedTick??0)!==120000)throw new Error('v3 analysis requires completed 120k canonical run');
if(hardInvariantAnomalies!==0)throw new Error(`v3 inherited hard invariant anomalies: ${hardInvariantAnomalies}`);
