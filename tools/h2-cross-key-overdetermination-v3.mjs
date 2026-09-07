import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const RUNNER='tools/causal-redundancy-source-120k.mjs';
const SOURCE_REPORT='causal-redundancy-source-120k-report.json';
const REPORT='h2-cross-key-overdetermination-v3-report.json';

const child=spawn(process.execPath,[RUNNER],{stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{
  child.on('error',reject);
  child.on('exit',(c,s)=>resolve(c??(s?1:0)));
});
if(code!==0)process.exit(code);

const src=JSON.parse(await readFile(SOURCE_REPORT,'utf8'));
const v=src.validity||{};
const a=src.aggregate||{};
const d=a.decision||{};
const t=a.target||{};
const validityPass=(v.replayMismatch??-1)===0&&(v.fullShadowTargetMismatch??-1)===0&&(v.representativeCompressionMismatch??-1)===0;
const jointD=a.jointDecisionEffects??0;
const jointT=a.jointTargetEffects??0;
const crossD=d.CROSS_KEY_OVERDETERMINATION??0;
const crossT=t.CROSS_KEY_OVERDETERMINATION??0;
const grade=validityPass&&jointD>0&&crossD>0
  ?'SUPPORTED_WITHIN_CANONICAL_HARNESS_FOR_CROSS_KEY_ALTERNATIVE_RELATIONAL_CONTRIBUTION'
  :'UNVALIDATED';

const report={
  system:{name:'OASIS Causal Research System',version:'3.0',hypothesis:'H2-cross-key-structure'},
  question:'Within joint active relational effects, do distinct relation keys sometimes provide alternative sufficient relational routes rather than the effect reducing to one unique relation key?',
  method:{
    source:'CR-03R redundancy-source same-current 120k analysis',
    productionReplay:true,
    shadowOnly:true,
    resolvedTargetSemantics:true,
    footprint:'relation key + sorted place set',
    crossKeyOverdetermination:'two or more distinct relation keys are individually sufficient for the same full decision/target effect in the tested same-current state',
    causalBoundary:'same-current active relational structure only; not a proof that the entire Past Relational Structure is simultaneously active or necessary'
  },
  validity:v,
  summary:{
    jointDecisionEffects:jointD,
    jointResolvedTargetEffects:jointT,
    crossKeyOverdeterminedDecisionEffects:crossD,
    crossKeyOverdeterminedResolvedTargetEffects:crossT,
    decisionCrossKeyRate:jointD?crossD/jointD:null,
    resolvedTargetCrossKeyRate:jointT?crossT/jointT:null,
    decisionMomentsWith2PlusSufficientKeys:a.decisionMomentsWith2PlusSufficientKeys??null,
    targetMomentsWith2PlusSufficientKeys:a.targetMomentsWith2PlusSufficientKeys??null,
    decisionMaxSufficientKeys:a.decisionMaxSufficientKeys??null,
    targetMaxSufficientKeys:a.targetMaxSufficientKeys??null,
    momentsWithMultipleFootprintsPerKey:a.momentsWithMultipleFootprintsPerKey??null,
    momentsWithDuplicateIdentities:a.momentsWithDuplicateIdentities??null
  },
  evidence:{
    validityPass,
    distinctRelationKeysCanProvideAlternativeSufficientDecisionRoutes:validityPass&&crossD>0,
    distinctRelationKeysCanProvideAlternativeSufficientResolvedTargetRoutes:validityPass&&crossT>0,
    entirePastRelationalStructureJointNecessityValidated:false,
    entirePastRelationalStructureJointSufficiencyValidated:false,
    inactivePastRelationsIncludedInCurrentJointSet:false,
    H2_cross_key_grade:grade
  },
  interpretation:{
    supports:'nontrivial relational structure among currently active past relations: some joint effects admit multiple distinct sufficient relation-key routes',
    doesNotSupport:[
      'one relation key is the universal cause',
      'the whole Past Relational Structure is jointly necessary',
      'the whole Past Relational Structure is jointly sufficient',
      'all past relations are active at the same time',
      'universal real-world actual causation'
    ]
  },
  examples:(src.moments||[]).filter(m=>m.decisionClass==='CROSS_KEY_OVERDETERMINATION'||m.targetClass==='CROSS_KEY_OVERDETERMINATION').slice(0,20)
};

await writeFile(REPORT,JSON.stringify(report,null,2));
console.log('OASIS-H2-CROSS-KEY-V3 '+JSON.stringify(report.summary));
console.log('H2-CROSS-KEY-EVIDENCE '+JSON.stringify(report.evidence));

if(!validityPass)throw new Error(`H2 cross-key validity failure: ${JSON.stringify(v)}`);
if(jointD!==297)throw new Error(`expected 297 joint decision effects, got ${jointD}`);
if(jointT!==204)throw new Error(`expected 204 joint resolved-target effects, got ${jointT}`);
