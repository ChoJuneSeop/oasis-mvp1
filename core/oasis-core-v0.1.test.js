'use strict';
const assert=require('node:assert/strict');
const O=require('./oasis-core-v0.1.js');
const step=(from,relation,to,participants=[])=>({from,relation,to,participants});
const proc=(...steps)=>O.relationProcess({steps});
const flow=(...steps)=>O.presentFlow({steps});

// 1 O3 direction.
{const ab=proc(step('A','meets','B')),ba=proc(step('B','meets','A'));assert.notEqual(ab.key,ba.key)}
// 2 O3 order.
{const abc=proc(step('A','r1','B'),step('B','r2','C'));const cba=proc(step('C','r2','B'),step('B','r1','A'));assert.notEqual(abc.key,cba.key)}
// 3 O11 unrelated silence.
{assert.equal(O.reactivate([proc(step('A','r','B',['ally']))],flow(step('X','r','Y',['ally']))).length,0)}
// 4 O2/O4 directed flow + recurring relational participant.
{const ab=proc(step('A','r','B',['ally']));const xy=proc(step('X','r','Y',['other']));const active=O.reactivate([ab,xy],flow(step('B','next','C',['ally'])));assert.deepEqual(active.map(x=>x.key),[ab.key])}
// 5 Same endpoint C, different incoming flow, same long-term memory.
{const ab=proc(step('A','r','B',['ally-B']));const xy=proc(step('X','r','Y',['ally-Y']));assert.deepEqual(O.reactivate([ab,xy],flow(step('B','arrives','C',['ally-B']))).map(x=>x.key),[ab.key]);assert.deepEqual(O.reactivate([ab,xy],flow(step('Y','arrives','C',['ally-Y']))).map(x=>x.key),[xy.key])}
// 6 Existing memory may remain silent.
{const core=O.createCore();core.remember({steps:[step('A','r','B',['a'])]});core.remember({steps:[step('C','r','D',['b'])]});assert.equal(core.reactivate({steps:[step('X','r','Y',['a'])]}).length,0)}
// 7 Large irrelevant memory remains silent.
{const memory=[];for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,'r',`B${i}`,[`agent-${i}`])));assert.equal(O.reactivate(memory,flow(step('CURRENT_A','r','CURRENT_B',['current']))).length,0)}
// 8 Genuine bridge detectable in large irrelevant memory.
{const memory=[];for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,'r',`B${i}`,[`agent-${i}`])));const bridge=proc(step('P','old','Q',['ally']));memory.splice(243,0,bridge);assert.deepEqual(O.reactivate(memory,flow(step('Q','new','R',['ally']))).map(x=>x.key),[bridge.key])}
// 9 Shared endpoint alone cannot saturate.
{const memory=[];for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,`r${i}`,'B',[`agent-${i}`])));assert.equal(O.reactivate(memory,flow(step('B','new','C',['current']))).length,0)}
// 10 One genuine bridge remains selective among endpoint collisions.
{const memory=[];for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,`r${i}`,'B',[`agent-${i}`])));const bridge=proc(step('TRUE','old','B',['ally']));memory.splice(177,0,bridge);assert.deepEqual(O.reactivate(memory,flow(step('B','new','C',['ally']))).map(x=>x.key),[bridge.key])}
// 11 Shared endpoint + shared relation kind still cannot saturate.
{const memory=[];for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,'trust','B',[`agent-${i}`])));assert.equal(O.reactivate(memory,flow(step('B','trust','C',['current']))).length,0)}
// 12 Ubiquitous self cannot act as the relational bridge.
{const memory=[];for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,'r','B',['self',`agent-${i}`])));assert.equal(O.reactivate(memory,flow(step('B','next','C',['self']))).length,0)}
// 13 Ubiquitous self is ignored while a non-ubiquitous ally can select one process.
{const memory=[];for(let i=0;i<500;i++)memory.push(proc(step(`A${i}`,'r','B',['self',`agent-${i}`])));const bridge=proc(step('TRUE','r','B',['self','ally']));memory.splice(200,0,bridge);const active=O.reactivate(memory,flow(step('B','next','C',['self','ally'])));assert.deepEqual(active.map(x=>x.key),[bridge.key])}

console.log('OASIS Core v0.1 tests: 13/13 passed');
