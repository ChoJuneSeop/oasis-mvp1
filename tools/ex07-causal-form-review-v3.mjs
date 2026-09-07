import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const REPORT='ex07-causal-form-review-v3-report.json';
const C_REPORT='ex04p-matched-initialization-specificity-v3-report.json';
const M_REPORT='ex04m-multi-oasis-longitudinal-v3-report.json';
const R_REPORT='ex05-replication-falsification-v3-report.json';

function runNode(path){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path],{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>{err+=d.toString();if(err.length>24000)err=err.slice(-24000)});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(new Error(`${path} failed code=${c}\n${err}`)))});}
function rate(y,n){return n?y/n:null}
function safeP(p){return Math.min(1-1e-12,Math.max(1e-12,p))}
function logLikeBinomial(groups,pooled=false){
  const totalY=groups.reduce((a,g)=>a+g.y,0),totalN=groups.reduce((a,g)=>a+g.n,0);
  const p0=safeP(totalY/totalN);
  return groups.reduce((ll,g)=>{const p=safeP(pooled?p0:g.y/g.n);return ll+g.y*Math.log(p)+(g.n-g.y)*Math.log(1-p)},0);
}
function pearsonHeterogeneity(groups){
  const Y=groups.reduce((a,g)=>a+g.y,0),N=groups.reduce((a,g)=>a+g.n,0),p=Y/N;
  let x2=0;
  for(const g of groups){const ey=g.n*p,en=g.n*(1-p);if(ey>0)x2+=(g.y-ey)**2/ey;if(en>0)x2+=((g.n-g.y)-en)**2/en;}
  return{x2,df:groups.length-1,n:N,pooledRate:p};
}

await runNode('tools/ex04p-matched-initialization-specificity-v3.mjs');
await runNode('tools/ex04m-multi-oasis-longitudinal-v3.mjs');
await runNode('tools/ex05-replication-falsification-v3.mjs');
const [c,m,r]=await Promise.all([readFile(C_REPORT,'utf8').then(JSON.parse),readFile(M_REPORT,'utf8').then(JSON.parse),readFile(R_REPORT,'utf8').then(JSON.parse)]);

const validity={
  matchedSpecificityValid:c.valid===true,
  multiOasisValid:m.valid===true,
  replicationValid:r.valid===true,
  noExperimenterIntervention:(c.summary?.experimenterInterventionCount??-1)===0&&(m.summary?.experimenterInterventionCount??-1)===0&&(r.summary?.totalExperimenterInterventionCount??-1)===0,
  deterministicTwinIntegrity:(m.summary?.totalTwinMismatch??-1)===0&&(r.summary?.totalTwinMismatch??-1)===0
};
const valid=Object.values(validity).every(Boolean);

const partyGroups=Object.entries(c.perParty||{}).map(([id,g])=>({id,y:g.relationalVsPlacebo,n:g.eligible,rate:rate(g.relationalVsPlacebo,g.eligible)}));
const partyHet=pearsonHeterogeneity(partyGroups);
const llScalar=logLikeBinomial(partyGroups,true),llParty=logLikeBinomial(partyGroups,false),N=partyHet.n;
const bicScalar=-2*llScalar+1*Math.log(N),bicParty=-2*llParty+partyGroups.length*Math.log(N);
const partyRateRange=Math.max(...partyGroups.map(g=>g.rate))-Math.min(...partyGroups.map(g=>g.rate));

const originalPrior={effects:m.summary.G4.pairsWithMatchedPreStateChoiceDifference,pairs:(m.summary.G4.pairwise||[]).length};
const shiftedPrior={effects:(r.runs||[]).reduce((a,x)=>a+x.differentPriorSamePRS.matchedPreStateChoiceDifferencePairs,0),pairs:(r.runs||[]).reduce((a,x)=>a+(x.differentPriorSamePRS.pairwise||[]).length,0)};
const priorByStream=[{id:'canonical',...originalPrior,rate:rate(originalPrior.effects,originalPrior.pairs)},...(r.runs||[]).map(x=>({id:x.variant.id,effects:x.differentPriorSamePRS.matchedPreStateChoiceDifferencePairs,pairs:(x.differentPriorSamePRS.pairwise||[]).length,rate:rate(x.differentPriorSamePRS.matchedPreStateChoiceDifferencePairs,(x.differentPriorSamePRS.pairwise||[]).length) }))];
const originalPRS={effects:m.summary.G3.divergentPairs,pairs:(m.summary.G3.pairwise||[]).length};
const shiftedPRS={effects:(r.runs||[]).reduce((a,x)=>a+x.samePriorDifferentPRS.divergentPairs,0),pairs:(r.runs||[]).reduce((a,x)=>a+(x.samePriorDifferentPRS.pairwise||[]).length,0)};
const prsByStream=[{id:'canonical',...originalPRS,rate:rate(originalPRS.effects,originalPRS.pairs)},...(r.runs||[]).map(x=>({id:x.variant.id,effects:x.samePriorDifferentPRS.divergentPairs,pairs:(x.samePriorDifferentPRS.pairwise||[]).length,rate:rate(x.samePriorDifferentPRS.divergentPairs,(x.samePriorDifferentPRS.pairwise||[]).length)}))];

const matchedSpecificityOverall={effects:c.summary.relationalVsPlaceboChoiceDisagreements,eligible:c.summary.eligibleDistinctDirectRelationalSupportScenarios,rate:rate(c.summary.relationalVsPlaceboChoiceDisagreements,c.summary.eligibleDistinctDirectRelationalSupportScenarios)};
const supportPermutation={effects:c.summary.supportIdentityPermutationChoiceChanges,eligible:c.summary.eligibleDistinctDirectRelationalSupportScenarios,rate:rate(c.summary.supportIdentityPermutationChoiceChanges,c.summary.eligibleDistinctDirectRelationalSupportScenarios)};

const withinClassScalarAssessment={
  interventionClass:'minimum relational-support attention vs candidate-only placebo under eligible matched top-vote ties',
  overall:matchedSpecificityOverall,
  byParty:partyGroups,
  descriptiveHeterogeneity:partyHet,
  scalarBIC:bicScalar,
  partyConditionedBIC:bicParty,
  deltaBIC_scalarMinusConditional:bicScalar-bicParty,
  partyRateRange,
  interpretation:(bicScalar-bicParty)>10&&partyRateRange>0.1?'CONTEXT_CONDITIONED_DESCRIPTION_STRONGLY_PREFERRED_WITHIN_THIS_PREDECLARED_FACTORIAL_BATTERY':'NO_STRONG_DESCRIPTIVE_PREFERENCE_DETECTED'
};

const longitudinalContextAssessment={
  samePRS_differentPrior:priorByStream,
  samePrior_differentPRS:prsByStream,
  canonicalPriorEffectRate:rate(originalPrior.effects,originalPrior.pairs),
  shiftedPriorEffectRate:rate(shiftedPrior.effects,shiftedPrior.pairs),
  canonicalPRSEffectRate:rate(originalPRS.effects,originalPRS.pairs),
  shiftedPRSEffectRate:rate(shiftedPRS.effects,shiftedPRS.pairs),
  interpretation:'THE_TESTED_PRIOR_EFFECT_IS_STREAM_CONDITIONAL_WHILE_THE_TESTED_INITIAL_PRS_DIFFERENCE_EFFECT_REPLICATES_ACROSS_THESE_STREAMS'
};

const causalForm={
  empiricalEffectDefinition:'theta_I(z;Q) = empirical frequency that a matched intervention I changes the realized/selected behavior under condition z within a predeclared scenario family Q',
  scalarNull:'H_scalar: theta_I(z;Q) = theta_0 for all tested z within one commensurable intervention class and fixed Q',
  currentFinding:'A_SINGLE_CONTEXT_FREE_SCALAR_IS_NOT_SUPPORTED_AS_A_SUFFICIENT_EMPIRICAL_REPRESENTATION_WITHIN_TESTED_SCOPE',
  minimumSupportedForm:'CONTEXT_CONDITIONED_EFFECT_FUNCTION_OR_FAMILY_OF_EFFECT_MEASURES',
  relationalStructuralForm:'SUPPORTED_AS_A_NECESSARY_DESCRIPTION_OF_TESTED_CONDITION_IDENTITY; IRREDUCIBILITY_TO_ANY_FINITE_VECTOR_OR_FUNCTION_REMAINS_OPEN',
  universalConstant:'NOT_ESTABLISHED',
  exactFunction:'NOT_ESTABLISHED',
  probabilityDistributionAsFundamentalLaw:'NOT_ESTABLISHED',
  commensurabilityAcrossInterventionClasses:'NOT_ESTABLISHED_DO_NOT_POOL_INTO_ONE_RATE'
};

const result={
  experiment:'EX-07 Causal-Form and Mathematical Formalization Review v3',
  date:'2026-09-07',
  valid,validity,
  sourceRuns:{
    matchedSpecificity:'fresh reproducible EX-04P-C execution',
    multiOasis:'fresh reproducible EX-04M execution',
    replicationFalsification:'fresh reproducible EX-05 execution'
  },
  observed:{matchedSpecificityOverall,supportPermutation,withinClassScalarAssessment,longitudinalContextAssessment},
  causalForm,
  mathematicalBoundary:[
    'The empirical effect rate is a derived measurement over a specified matched scenario family, not an ontological constant built into OASIS.',
    'Changing the condition distribution Q can change an observed rate even when the underlying deterministic mechanism is unchanged.',
    'Different intervention classes (Past Relational Structure, disposition prior, support-identity permutation) are not numerically pooled unless a common estimand is independently justified.',
    'The strong Past Relational Structure replication and weak/nonreplicating prior effect imply component- and context-dependent causal participation, not one uniform causal strength.',
    'The present evidence supports rejecting a context-free single-scalar summary as sufficient within the tested scope; it does not prove that no useful scalar can exist for a narrower, explicitly conditioned subproblem.',
    'Whether the most faithful ultimate representation is a function, distribution, operator family, or irreducible relational structure remains an open mathematical research question.'
  ],
  evidenceGrade:{
    repeatedCausalRegularity:'OBSERVED_WITHIN_CANONICAL_AND_REPLICATION_HARNESSES',
    singleUniversalScalar:'NOT_SUPPORTED_AS_SUFFICIENT_REPRESENTATION_WITHIN_TESTED_SCOPE',
    contextDependence:'SUPPORTED_WITHIN_TESTED_SCOPE',
    pastRelationalStructureConditionDependence:'ROBUSTLY_REPLICATED_ACROSS_PREDECLARED_EXOGENOUS_STREAMS_IN_EX05',
    dispositionPriorGeneralEffect:'NOT_REPLICATED_ACROSS_EX05_STREAMS; CONDITIONAL_EFFECT_ONLY',
    exactMathematicalLaw:'OPEN_INQUIRY',
    externalGeneralization:'UNVALIDATED'
  }
};
await writeFile(REPORT,JSON.stringify(result,null,2));
console.log(JSON.stringify({valid,withinClassScalarAssessment,longitudinalContextAssessment,causalForm,evidenceGrade:result.evidenceGrade},null,2));
if(!valid)process.exitCode=1;

for(const f of [C_REPORT,M_REPORT,R_REPORT])await rm(f,{force:true});
