import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const SOURCE_RUNNER='tools/causal-joint-individual-attribution-120k-v2.mjs';
const SOURCE_REPORT='causal-joint-individual-attribution-120k-report.json';
const REPORT='h2-joint-active-relational-set-v3-report.json';

const child=spawn(process.execPath,[SOURCE_RUNNER],{stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{
  child.on('error',reject);
  child.on('exit',(c,s)=>resolve(c??(s?1:0)));
});
if(code!==0)process.exit(code);

const src=JSON.parse(await readFile(SOURCE_REPORT,'utf8'));
const a=src.aggregate||{};
const d=src.decisionClassification||{};
const c=src.choiceClassification||{};
const v=src.validity||{};

const validityPass=(v.replayMismatch??-1)===0&&(v.fullChoiceMismatch??-1)===0&&(v.duplicateFootprintViolations??-1)===0;
const jointDecisionEffect=(a.jointDecisionDiffMoments??0)>0;
const jointChoiceEffect=(a.jointChoiceDiffMoments??0)>0;
const redundantDecisionMoments=d.redundantOrOverdeterminedNoNecessary??0;
const interactionOnlyDecisionMoments=d.interactionOnlyNoIndividualSufficient??0;
const redundantChoiceMoments=c.redundantOrOverdeterminedNoNecessary??0;
const interactionOnlyChoiceMoments=c.interactionOnlyNoIndividualSufficient??0;
const componentNontrivial=(redundantDecisionMoments+interactionOnlyDecisionMoments+redundantChoiceMoments+interactionOnlyChoiceMoments)>0;

let grade='UNVALIDATED';
if(validityPass&&jointDecisionEffect){
  grade=componentNontrivial
    ?'SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_JOINT_ACTIVE_RELATIONAL_SET_WITH_COMPONENT_NONTRIVIALITY'
    :'SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_JOINT_ACTIVE_RELATIONAL_SET';
}

const report={
  system:{name:'OASIS Causal Research System',version:'3.0',hypothesis:'H2-joint-active-relational-set'},
  question:'When the current reality is held fixed, does the jointly active set of reactivated past relations contribute to the decision in a way that cannot always be reduced to one individually necessary relation identity?',
  method:{
    source:'CR-02 corrected same-current 120k joint/individual causal attribution',
    productionReplay:true,
    shadowOnly:true,
    jointSet:'all currently active reactivated past-relation episode identities at the decision moment',
    individualUnits:['relation key','decision footprint (key + place-set)','episode identity'],
    necessity:'full joint set minus unit changes the full decision signature or resolved target',
    sufficiency:'unit alone reproduces the full signature or resolved target relative to the no-reactivated-relation shadow',
    noExperimenterInterventionAfterInitialization:true,
    nonAnticipatory:true
  },
  validity:v,
  summary:{
    decisionsWithActiveReactivatedRelations:a.decisionsWithLatent??null,
    jointDecisionEffectMoments:a.jointDecisionDiffMoments??null,
    jointResolvedTargetEffectMoments:a.jointChoiceDiffMoments??null,
    meanActiveEpisodeIdentitiesAtJointEffect:src.meanActiveIdentitiesAtJoint??null,
    decisionMomentsWithNecessaryIndividual:d.necessaryIndividual??null,
    decisionMomentsWithSufficientIndividual:d.sufficientIndividual??null,
    decisionRedundantOrOverdeterminedNoNecessary:redundantDecisionMoments,
    decisionInteractionOnlyNoIndividualSufficient:interactionOnlyDecisionMoments,
    choiceMomentsWithNecessaryIndividual:c.necessaryIndividual??null,
    choiceMomentsWithSufficientIndividual:c.sufficientIndividual??null,
    choiceRedundantOrOverdeterminedNoNecessary:redundantChoiceMoments,
    choiceInteractionOnlyNoIndividualSufficient:interactionOnlyChoiceMoments,
    keyNecessaryDecisionOccurrences:a.keyNecessaryDecisionOccurrences??null,
    keySufficientDecisionOccurrences:a.keySufficientDecisionOccurrences??null,
    footprintNecessaryDecisionOccurrences:a.footprintNecessaryDecisionOccurrences??null,
    footprintSufficientDecisionOccurrences:a.footprintSufficientDecisionOccurrences??null
  },
  evidence:{
    validityPass,
    jointActiveRelationalSetDecisionContributionObserved:validityPass&&jointDecisionEffect,
    jointActiveRelationalSetResolvedTargetContributionObserved:validityPass&&jointChoiceEffect,
    componentNontrivialityObserved:componentNontrivial,
    fullPastRelationalStructureJointNecessityValidated:false,
    fullPastRelationalStructureJointSufficiencyValidated:false,
    inactivePastRelationsJointlyTested:false,
    possibilityCompositionDirectlyInstrumented:false,
    H2_joint_active_set_grade:grade,
    H2_whole_past_relational_structure_grade:'UNVALIDATED'
  },
  interpretation:{
    supports:'joint contribution of the currently active reactivated relational subset under the tested same-current state',
    doesNotSupport:[
      'that every element of Past Relational Structure is simultaneously active',
      'that the entire Past Relational Structure is jointly necessary',
      'that the entire Past Relational Structure is jointly sufficient',
      'universal actual-causation claims',
      'real-world generalization',
      'whole-structure overwrite'
    ],
    H2Use:'Combine this joint-active-set evidence with the longitudinal H2 lineage evidence. It strengthens the integrated H2 process but does not close the whole-Past-Relational-Structure joint claim.'
  },
  sourceReport:{design:src.design,world:src.world},
  examples:(src.examples||[]).slice(0,20)
};

await writeFile(REPORT,JSON.stringify(report,null,2));
console.log('OASIS-H2-JOINT-ACTIVE-V3 '+JSON.stringify(report.summary));
console.log('H2-JOINT-ACTIVE-EVIDENCE '+JSON.stringify(report.evidence));

if(!validityPass)throw new Error(`H2 joint active-set validity failure: ${JSON.stringify(v)}`);
if(!jointDecisionEffect)throw new Error('H2 joint active-set test observed no joint decision effect');
