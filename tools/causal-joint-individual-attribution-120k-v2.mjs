import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const SOURCE='tools/causal-joint-individual-attribution-120k.mjs';
const TEMP='tools/.causal-joint-individual-attribution-120k-v2-run.mjs';
let src=await readFile(SOURCE,'utf8');

function replaceOnce(from,to,label){
  const i=src.indexOf(from);
  if(i<0)throw new Error(`CR02-v2 patch target missing: ${label}`);
  if(src.indexOf(from,i+1)>=0)throw new Error(`CR02-v2 patch target non-unique: ${label}`);
  src=src.slice(0,i)+to+src.slice(i+from.length);
}
function replaceAllExact(from,to,expected,label){
  const parts=src.split(from);
  const count=parts.length-1;
  if(count!==expected)throw new Error(`CR02-v2 patch count ${label}: expected ${expected}, got ${count}`);
  src=parts.join(to);
}

// Scientific validity correction only. Production relation-field.js and the 120k world are unchanged.
// 1) The real OASIS choose path runs refreshHidden() immediately before evalP().
//    The v1 shadow skipped that pre-evaluation state transition.
replaceOnce(
  'globalThis.__OASIS_CAUSAL_INTERNALS={ensureLatent,activeField,currentPlace};',
  'globalThis.__OASIS_CAUSAL_INTERNALS={ensureLatent,activeField,currentPlace,refreshHidden};',
  'expose-refreshHidden'
);
replaceOnce(
  "const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],target:P.target,sAct:S.c.relationFieldActivation};",
  "const saved={active:[...(F.active||[])],activations:F.activations,last:F.lastActivationTick,latentActive:[...(L.activeIds||[])],cacheKey:L.cacheKey,cacheEpisodes:[...(L.cacheEpisodes||[])],target:P.target,sAct:S.c.relationFieldActivation,hiddenCandidates:[...(P.hiddenCandidates||[])],hiddenDone:[...(P.hiddenDone||[])],sHidden:S.c.hidden,sCand:S.c.cand,events:S.events.map(x=>({...x}))};",
  'save-hidden-shadow-state'
);
replaceOnce(
  'try{out=clone(sig(evalP(S,P,1)))}finally{',
  'try{I.refreshHidden(S,P);out=clone(sig(evalP(S,P,1)))}finally{',
  'refresh-before-shadow-eval'
);
replaceOnce(
  'P.target=saved.target;S.c.relationFieldActivation=saved.sAct;',
  "P.target=saved.target;S.c.relationFieldActivation=saved.sAct;P.hiddenCandidates.clear();for(const id of saved.hiddenCandidates)P.hiddenCandidates.add(id);P.hiddenDone.clear();for(const id of saved.hiddenDone)P.hiddenDone.add(id);S.c.hidden=saved.sHidden;S.c.cand=saved.sCand;S.events=saved.events;",
  'restore-hidden-shadow-state'
);

// 2) sig.choice can be an internal `hidden:*` token. The real choose() resolves that token
//    to the hidden story's terminal place before writing P.target. Choice-level causal claims
//    therefore use the actual target, while decision-signature claims keep raw sig semantics.
replaceOnce(
  'const choiceDifferent=(a,b)=>a.choice!==b.choice;',
  "const choiceTarget=(P,g)=>{if(g?.choice?.startsWith('hidden:')&&MODELS[S.key].rel){const h=hiddenDefs.find(x=>x.id===g.choice.slice(7));return h?.places?.[h.places.length-1]||g.choice}return g?.choice||actionableIds(S,P,1)[0]||'road'};const choiceDifferent=(P,a,b)=>choiceTarget(P,a)!==choiceTarget(P,b);",
  'actual-target-choice-function'
);
replaceOnce(
  'const fullChoiceEffect=choiceDifferent(full,noLat);',
  'const fullChoiceEffect=choiceDifferent(P,full,noLat);',
  'full-choice-effect-target'
);
replaceAllExact(
  'const necC=fullChoiceEffect&&choiceDifferent(full,minusSig),sufC=fullChoiceEffect&&onlySig.choice===full.choice;',
  'const necC=fullChoiceEffect&&choiceDifferent(P,full,minusSig),sufC=fullChoiceEffect&&choiceTarget(P,onlySig)===choiceTarget(P,full);',
  1,
  'key-choice-attribution'
);
replaceAllExact(
  'const necC=fullChoiceEffect&&choiceDifferent(full,minusSig),sufC=fullChoiceEffect&&onlyFoot.choice===full.choice;',
  'const necC=fullChoiceEffect&&choiceDifferent(P,full,minusSig),sufC=fullChoiceEffect&&choiceTarget(P,onlyFoot)===choiceTarget(P,full);',
  1,
  'footprint-choice-attribution'
);
replaceOnce(
  'if(fullChoiceEffect&&onlyRep.choice===full.choice)nIndSufC+=ids.length;',
  'if(fullChoiceEffect&&choiceTarget(P,onlyRep)===choiceTarget(P,full))nIndSufC+=ids.length;',
  'duplicate-choice-sufficiency'
);
replaceOnce(
  'agg.jointDecisionDiffMoments++;if(full.choice!==noLat.choice)agg.jointChoiceDiffMoments++;',
  'agg.jointDecisionDiffMoments++;if(choiceDifferent(P,full,noLat))agg.jointChoiceDiffMoments++;',
  'joint-choice-target'
);
replaceOnce(
  'if(predictedFull&&predictedFull.choice!==P.target)fullChoiceMismatch++;',
  'if(predictedFull&&choiceTarget(P,predictedFull)!==P.target)fullChoiceMismatch++;',
  'validity-target-normalization'
);
replaceOnce(
  "causalBoundary:'same-current necessity/sufficiency and joint contribution in this implementation; not general actual-causation proof'",
  "causalBoundary:'same-current necessity/sufficiency and joint contribution in this implementation; not general actual-causation proof',v2ValidityCorrection:'shadow reproduces choose pre-evaluation refreshHidden; choice-level effects compare resolved actual target rather than internal hidden token'",
  'design-note'
);

await writeFile(TEMP,src);
const child=spawn(process.execPath,[TEMP],{stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',(c,s)=>resolve(c??(s?1:0)))});
await unlink(TEMP).catch(()=>{});
if(code!==0)process.exit(code);
