'use strict';
const assert=require('node:assert/strict');
const O=require('./oasis-core-v0.1.js');

const step=(from,relation,to,participants=[])=>({from,relation,to,participants});
const proc=(...steps)=>O.relationProcess({steps});
const flow=(...steps)=>O.presentFlow({steps});

// O3 — direction is preserved.
{
  const ab=proc(step('A','meets','B'));
  const ba=proc(step('B','meets','A'));
  assert.notEqual(ab.key,ba.key);
}

// O3 — multi-step temporal order is preserved.
{
  const abc=proc(step('A','r1','B'),step('B','r2','C'));
  const cba=proc(step('C','r2','B'),step('B','r1','A'));
  assert.notEqual(abc.key,cba.key);
}

// O4/O11 — unrelated past remains silent.
{
  const memory=[proc(step('A','r','B'))];
  assert.equal(O.reactivate(memory,flow(step('X','r','Y'))).length,0);
}

// O2/O4 — current directed flow selects structurally connected past.
{
  const ab=proc(step('A','r','B'));
  const xy=proc(step('X','r','Y'));
  const active=O.reactivate([ab,xy],flow(step('B','next','C')));
  assert.deepEqual(active.map(x=>x.key),[ab.key]);
}

// O2 — same present endpoint, different incoming flow can reactivate different past.
{
  const ab=proc(step('A','r','B'));
  const xy=proc(step('X','r','Y'));
  assert.deepEqual(O.reactivate([ab,xy],flow(step('B','arrives','C'))).map(x=>x.key),[ab.key]);
  assert.deepEqual(O.reactivate([ab,xy],flow(step('Y','arrives','C'))).map(x=>x.key),[xy.key]);
}

// O11 — memory existence does not imply mandatory activation.
{
  const core=O.createCore();
  core.remember({steps:[step('A','r','B')]});
  core.remember({steps:[step('C','r','D')]});
  assert.equal(core.reactivate({steps:[step('X','r','Y')]}).length,0);
}

// Large irrelevant memory must not create activation by volume alone.
{
  const memory=[];
  for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,'r',`B${i}`)));
  assert.equal(O.reactivate(memory,flow(step('CURRENT_A','r','CURRENT_B'))).length,0);
}

// A real directed bridge remains detectable inside large irrelevant memory.
{
  const memory=[];
  for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,'r',`B${i}`)));
  const bridge=proc(step('P','r','Q'));
  memory.splice(243,0,bridge);
  const active=O.reactivate(memory,flow(step('Q','continues','R')));
  assert.deepEqual(active.map(x=>x.key),[bridge.key]);
}

console.log('OASIS Core v0.1 tests: 8/8 passed');
