import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import readline from 'node:readline';

const CF_FILE='latent-relation-store-counterfactual.jsonl';
const V2_FILE='causal-trace-ledger-v2-report.json';
const H1_FILE='h1-structural-incorporation-v3-report.json';
const H2_FILE='h2-integrated-structure-v3-report.json';
const VALIDATION_FILE='latent-relation-store-validation-report.json';
const REPORT_FILE='causal-trace-ledger-v3-report.json';

const v2=JSON.parse(await readFile(V2_FILE,'utf8'));
const h1=JSON.parse(await readFile(H1_FILE,'utf8'));
const h2=JSON.parse(await readFile(H2_FILE,'utf8'));
const validation=JSON.parse(await readFile(VALIDATION_FILE,'utf8'));

let counterfactualRows=0;
let actionCandidateSetDifferences=0;
let participationLeaderDifferences=0;
let selectedActionDifferences=0;
let sameChoiceDespiteActionCandidateDifference=0;
let relationalLayerPresentRows=0;
const examples=[];

const rl=readline.createInterface({input:createReadStream(CF_FILE),crlfDelay:Infinity});
for await(const line of rl){
  if(!line.trim())continue;
  const e=JSON.parse(line);
  counterfactualRows++;
  if((e.latentActiveIds||[]).length)relationalLayerPresentRows++;
  const full=e.full||{};
  const noLat=e.noLat||{};
  const actionCandidatesChanged=full.cands!==noLat.cands;
  const participationChanged=full.leader!==noLat.leader;
  const actionChanged=full.choice!==noLat.choice;
  if(actionCandidatesChanged)actionCandidateSetDifferences++;
  if(participationChanged)participationLeaderDifferences++;
  if(actionChanged)selectedActionDifferences++;
  if(actionCandidatesChanged&&!actionChanged)sameChoiceDespiteActionCandidateDifference++;
  if(examples.length<20&&(actionCandidatesChanged||participationChanged||actionChanged)){
    examples.push({
      tick:e.tick,
      party:e.party,
      currentPlace:e.currentPlace,
      danger:e.danger,
      reactivatedPastRelationIds:e.latentActiveIds||[],
      actionCandidateSetDifference:actionCandidatesChanged,
      participationLeaderDifference:participationChanged,
      selectedActionDifference:actionChanged,
      full,
      withoutReactivatedPastRelations:noLat
    });
  }
}

const hardInvariantAnomalies=v2.summary?.hardInvariantAnomalies??null;
const relationalDecisionContributionObserved=(participationLeaderDifferences>0||selectedActionDifferences>0||actionCandidateSetDifferences>0)&&hardInvariantAnomalies===0;
const selectedActionContributionObserved=selectedActionDifferences>0&&hardInvariantAnomalies===0;
const h1Grade=h1.summary?.h1EvidenceGrade??'UNVALIDATED';
const h2Grade=h2.evidence?.H2_grade??'UNVALIDATED';

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
    runType:'fresh canonical 120k longitudinal audit plus analysis-only same-current-state ablation of reactivated past relations',
    productionRealityModifiedByDiagnostic:false,
    experimenterInterventionCount:0,
    nonAnticipatory:true,
    dispositionCondition:'NONE',
    dispositionEffectTested:false,
    relationalAblation:'The same current production state is evaluated with the reactivated past-relation layer present and temporarily disabled in shadow analysis.',
    terminologyGuard:'The implementation field `cands` is an action/destination candidate list. It is NOT identical to the theoretical Behavioral Decision Relational Candidate Set. Reactivated past relations are the relational layer being ablated.',
    interpretationLimit:'This run can identify contributions of reactivated past relations and trace exact structural lineage inside the canonical harness. It cannot validate Individual Disposition, universal H0/H1/H2, full Past Relational Structure joint necessity, or sufficiency/necessity of the full v3 factor set.'
  },
  input:{
    completedTick:validation.summary?.completedTick??null,
    counterfactualRows,
    inheritedV2AuditLines:v2.input?.auditLines??null,
    inheritedV2HardInvariantAnomalies:hardInvariantAnomalies
  },
  summary:{
    relationalLayerPresentRows,
    actionCandidateSetDifferences,
    participationLeaderDifferences,
    selectedActionDifferences,
    sameChoiceDespiteActionCandidateDifference,
    relationalDecisionContributionObserved,
    selectedActionContributionObserved,
    H1_exactStructuralChains:h1.summary?.exactReactivationParticipationOutcomeChains??null,
    H2_relationallyParticipatedOutcomesFormingNewStructure:h2.summary?.outcomesWithNewRelationalStructure??null,
    H2_multiKeyStructureOutcomes:h2.summary?.multiKeyStructureOutcomes??null,
    experimenterInterventionCount:0
  },
  v3EvidenceGrades:{
    H0_behavioralDecisionParticipation:relationalDecisionContributionObserved?'PARTIALLY_SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_RELATIONAL_COMPONENT; INDIVIDUAL_DISPOSITION_AND_FULL_FACTOR_INTERACTION_UNVALIDATED':'UNVALIDATED',
    H0_pastRelationalStructureContribution:relationalDecisionContributionObserved?'OBSERVED_WITHIN_CANONICAL_HARNESS_VIA_REACTIVATED_PAST_RELATIONS':'UNVALIDATED',
    H0_selectedActionContribution:selectedActionContributionObserved?'OBSERVED_WITHIN_CANONICAL_HARNESS':'UNVALIDATED',
    H0_currentRealityJointRole:'CURRENT_REALITY_HELD_FIXED_DURING_RELATIONAL_ABLATION; JOINT_ROLE_NOT_INDEPENDENTLY_IDENTIFIED',
    H0_individualDisposition:'UNVALIDATED',
    H0_behavioralDecisionRelationalCandidateSet:'THEORETICAL_INTERMEDIATE_NOT_DIRECTLY_IDENTIFIED_BY_ACTION_CANDIDATE_LIST; NATIVE_RELATIONAL-CANDIDATE TRACE STILL REQUIRED',
    H0_sufficiency:'NO_SINGLE_COMPONENT_ASSUMED_OR_ESTABLISHED_AS_SUFFICIENT',
    H1_realizationAndPastStructureIncorporation:h1Grade,
    H2_newPastStructureAndSubsequentRealityRelation:h2Grade,
    H2_fullPastRelationalStructureJointNecessity:'UNVALIDATED',
    H2_possibilityCompositionDirectInstrumentation:'UNVALIDATED',
    H3_relationalReappearance:v2.v2EvidenceGrades?.H3_relationalReappearance??'UNVALIDATED',
    H4_relationalPersistenceLimit:v2.v2EvidenceGrades?.H4_relationalPersistenceLimit??'OPEN_INQUIRY',
    generalization:'UNVALIDATED'
  },
  inheritedV2Summary:v2.summary,
  H1:h1.summary,
  H2:h2.summary,
  examples
};

await writeFile(REPORT_FILE,JSON.stringify(report,null,2));
console.log('OASIS-CAUSAL-V3 '+JSON.stringify(report.summary));
console.log('V3-EVIDENCE '+JSON.stringify(report.v3EvidenceGrades));

if((validation.summary?.completedTick??0)!==120000)throw new Error('v3 analysis requires completed 120k canonical run');
if(hardInvariantAnomalies!==0)throw new Error(`v3 inherited hard invariant anomalies: ${hardInvariantAnomalies}`);
if((h1.input?.interventionMarkers??0)!==0)throw new Error('H1 experimenter-intervention marker detected');
if((h2.input?.interventionMarkers??0)!==0)throw new Error('H2 experimenter-intervention marker detected');
