/* OASIS Core v0.2 — typed relational scaffold
 * Scope: O2/O3/O4/O11 only.
 * actor is represented separately from relational counterparts.
 * Actor identity, score similarity, top-k, thresholds, and time windows do not
 * constitute reactivation evidence.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.OASISCoreV02=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const tok=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${n} must be a non-empty string`);return v.trim()};
  const uniq=xs=>[...new Set(xs)];

  function directedStep(x){
    if(!x||typeof x!=='object')throw new TypeError('step must be an object');
    const actor=tok(x.actor,'step.actor');
    const from=tok(x.from,'step.from'),relation=tok(x.relation,'step.relation'),to=tok(x.to,'step.to');
    const counterparts=uniq((x.counterparts||[]).map(v=>tok(v,'counterpart'))).filter(v=>v!==actor);
    return Object.freeze({actor,from,relation,to,counterparts:Object.freeze(counterparts)});
  }

  const stepKey=s=>`${s.actor}: ${s.from} -[${s.relation}]-> ${s.to} | {${s.counterparts.join(',')}}`;
  const processKey=steps=>steps.map(stepKey).join(' :: ');

  function validateContinuity(steps){
    for(let i=1;i<steps.length;i++){
      if(steps[i-1].actor!==steps[i].actor)throw new Error('process actor changed inside one process');
      if(steps[i-1].to!==steps[i].from)throw new Error(`process discontinuity between step ${i-1} and ${i}`);
    }
  }

  function relationProcess(x){
    const steps=(x?.steps||[]).map(directedStep);
    if(!steps.length)throw new Error('process requires at least one directed step');
    validateContinuity(steps);
    return Object.freeze({id:x.id?tok(x.id,'process.id'):processKey(steps),actor:steps[0].actor,steps:Object.freeze(steps),key:processKey(steps),start:steps[0].from,end:steps.at(-1).to});
  }

  function presentFlow(x){
    const steps=(x?.steps||[]).map(directedStep);
    if(!steps.length)throw new Error('present flow requires at least one directed step');
    validateContinuity(steps);
    return Object.freeze({actor:steps[0].actor,steps:Object.freeze(steps),key:processKey(steps),start:steps[0].from,end:steps.at(-1).to});
  }

  // A past process can re-enter the present only when its directed endpoint
  // continues into the current flow and at least one non-actor relational
  // counterpart from the past boundary is actually present again now.
  // Same actor, place, relation label, reward, or scalar similarity alone is insufficient.
  function hasStructuralBridge(past,flow){
    const p=past.steps.at(-1),n=flow.steps[0];
    if(p.to!==n.from)return false;
    return p.counterparts.some(v=>n.counterparts.includes(v));
  }

  function reactivate(memoryInput,flowInput){
    if(!Array.isArray(memoryInput))throw new TypeError('memory must be an array');
    const memory=memoryInput.map(x=>x?.key?x:relationProcess(x));
    const flow=flowInput?.key?flowInput:presentFlow(flowInput);
    return Object.freeze(memory.filter(p=>hasStructuralBridge(p,flow)));
  }

  function createCore(){
    const memory=[];
    return Object.freeze({
      remember(x){const p=x?.key?x:relationProcess(x);if(!memory.some(m=>m.key===p.key))memory.push(p);return p},
      memory(){return Object.freeze([...memory])},
      reactivate(flow){return reactivate(memory,flow)},
      clear(){memory.length=0}
    });
  }

  return Object.freeze({directedStep,relationProcess,presentFlow,stepKey,processKey,hasStructuralBridge,reactivate,createCore});
});
