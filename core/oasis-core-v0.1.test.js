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
  const ab=proc(step('A','r','B',['agent-1']));
  const xy=proc(step('X','r','Y',['agent-2']));
  const active=O.reactivate([ab,xy],flow(step('B','next','C',['agent-1'])));
  assert.deepEqual(active.map(x=>x.key),[ab.key]);
}

// O2 — same present endpoint, different incoming flow can reactivate different past.
{
  const ab=proc(step('A','r','B',['agent-1']));
  const xy=proc(step('X','r','Y',['agent-2']));
  assert.deepEqual(O.reactivate([ab,xy],flow(step('B','arrives','C',['agent-1']))).map(x=>x.key),[ab.key]);
  assert.deepEqual(O.reactivate([ab,xy],flow(step('Y','arrives','C',['agent-2']))).map(x=>x.key),[xy.key]);
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
  const bridge=proc(step('P','r','Q',['agent-true']));
  memory.splice(243,0,bridge);
  const active=O.reactivate(memory,flow(step('Q','continues','R',['agent-true'])));
  assert.deepEqual(active.map(x=>x.key),[bridge.key]);
}

// Endpoint collision alone must not reactivate a whole relation field.
{
  const memory=[];
  for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,`r${i}`,'B',[`agent-${i}`])));
  const active=O.reactivate(memory,flow(step('B','new-relation','C',['current-agent'])));
  assert.equal(active.length,0,'shared endpoint alone is not a sufficient relational bridge');
}

// One genuine structural bridge remains selective among endpoint collisions.
{
  const memory=[];
  for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,`r${i}`,'B',[`agent-${i}`])));
  const bridge=proc(step('TRUE','old-relation','B',['current-agent']));
  memory.splice(177,0,bridge);
  const active=O.reactivate(memory,flow(step('B','new-relation','C',['current-agent'])));
  assert.deepEqual(active.map(x=>x.key),[bridge.key]);
}

console.log('OASIS Core v0.1 tests: 10/10 passed');
