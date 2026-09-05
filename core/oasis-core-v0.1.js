/* OASIS Core v0.1 — reference scaffold
 * Implements only O2/O3/O4/O11 independently from the MVP world.
 * No reward, similarity score, top-k, fixed risk threshold, or time-window cutoff.
 * Passing this file's tests is implementation-fidelity evidence only.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.OASISCoreV01=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const token=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${n} must be a non-empty string`);return v.trim()};
  const unique=(xs)=>{const s=new Set(),out=[];for(const x of xs)if(!s.has(x)){s.add(x);out.push(x)}return out};

  function directedStep(x){
    if(!x||typeof x!=='object')throw new TypeError('step must be an object');
    return Object.freeze({
      from:token(x.from,'step.from'),
      relation:token(x.relation,'step.relation'),
      to:token(x.to,'step.to'),
      participants:Object.freeze(unique((x.participants||[]).map(p=>token(p,'participant'))))
    });
  }

  const stepKey=s=>`${s.from} -[${s.relation}]-> ${s.to}`;
  const processKey=steps=>steps.map(stepKey).join(' :: ');

  function validateContinuity(steps){
    for(let i=1;i<steps.length;i++)if(steps[i-1].to!==steps[i].from)throw new Error(`process discontinuity between step ${i-1} and ${i}`);
  }

  function relationProcess(x){
    if(!x||typeof x!=='object')throw new TypeError('process must be an object');
    const steps=(x.steps||[]).map(directedStep);
    if(!steps.length)throw new Error('process requires at least one directed step');
    validateContinuity(steps);
    return Object.freeze({
      id:x.id?token(x.id,'process.id'):processKey(steps),
      steps:Object.freeze(steps),
      key:processKey(steps),
      start:steps[0].from,
      end:steps[steps.length-1].to,
      participants:Object.freeze(unique(steps.flatMap(s=>s.participants)))
    });
  }

  function presentFlow(x){
    if(!x||typeof x!=='object')throw new TypeError('flow must be an object');
    const steps=(x.steps||[]).map(directedStep);
    if(!steps.length)throw new Error('present flow requires at least one directed step');
    validateContinuity(steps);
    return Object.freeze({steps:Object.freeze(steps),key:processKey(steps),start:steps[0].from,end:steps[steps.length-1].to,participants:Object.freeze(unique(steps.flatMap(s=>s.participants)))});
  }

  // Structural bridge v0.1: direction continuity is necessary but not sufficient.
  // A second exact symbolic bridge must exist: shared participant or same relation kind.
  // No graded similarity, threshold, or forced top-k retrieval is used.
  function hasStructuralBridge(past,flow){
    const p=past.steps[past.steps.length-1], n=flow.steps[0];
    const directionContinues=p.to===n.from;
    if(!directionContinues)return false;
    const sharedParticipant=p.participants.some(v=>n.participants.includes(v));
    const sameRelationKind=p.relation===n.relation;
    return sharedParticipant||sameRelationKind;
  }

  function reactivate(memory,flowInput){
    if(!Array.isArray(memory))throw new TypeError('memory must be an array');
    const flow=flowInput&&flowInput.steps&&!flowInput.key?presentFlow(flowInput):flowInput;
    if(!flow||!Array.isArray(flow.steps))throw new TypeError('valid present flow required');
    const out=[];
    for(const item of memory){
      const past=item&&item.steps&&!item.key?relationProcess(item):item;
      if(!past||!Array.isArray(past.steps))throw new TypeError('invalid memory process');
      if(hasStructuralBridge(past,flow))out.push(past);
    }
    return Object.freeze(out);
  }

  function createCore(){
    const memory=[];
    return Object.freeze({
      remember(input){const p=input&&input.key?input:relationProcess(input);if(!memory.some(m=>m.key===p.key))memory.push(p);return p},
      memory(){return Object.freeze([...memory])},
      reactivate(flow){return reactivate(memory,flow)},
      clear(){memory.length=0}
    });
  }

  return Object.freeze({directedStep,relationProcess,presentFlow,stepKey,processKey,hasStructuralBridge,reactivate,createCore});
});
