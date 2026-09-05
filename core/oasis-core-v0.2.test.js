'use strict';
const assert=require('node:assert/strict');
const O=require('./oasis-core-v0.2.js');
const s=(actor,from,relation,to,counterparts=[])=>({actor,from,relation,to,counterparts});
const p=(...steps)=>O.relationProcess({steps});
const f=(...steps)=>O.presentFlow({steps});

{assert.notEqual(p(s('self','A','r','B',['ally'])).key,p(s('self','B','r','A',['ally'])).key)}
{assert.notEqual(p(s('self','A','r1','B',['ally']),s('self','B','r2','C',['ally'])).key,p(s('self','C','r2','B',['ally']),s('self','B','r1','A',['ally'])).key)}
{assert.equal(O.reactivate([p(s('self','A','r','B',['ally']))],f(s('self','X','r','Y',['ally']))).length,0)}
{const a=p(s('self','A','old','B',['ally']));const b=p(s('self','X','old','Y',['other']));assert.deepEqual(O.reactivate([a,b],f(s('self','B','new','C',['ally']))).map(x=>x.key),[a.key])}
{const a=p(s('self','A','r','B',['ally-B']));const y=p(s('self','X','r','Y',['ally-Y']));assert.deepEqual(O.reactivate([a,y],f(s('self','B','arrive','C',['ally-B']))).map(x=>x.key),[a.key]);assert.deepEqual(O.reactivate([a,y],f(s('self','Y','arrive','C',['ally-Y']))).map(x=>x.key),[y.key])}
{const core=O.createCore();core.remember({steps:[s('self','A','r','B',['a'])]});assert.equal(core.reactivate({steps:[s('self','X','r','Y',['a'])]}).length,0)}
{const m=[];for(let i=0;i<500;i++)m.push(p(s('self',`A${i}`,'r',`B${i}`,[`ally-${i}`])));assert.equal(O.reactivate(m,f(s('self','NOW-A','r','NOW-B',['ally-1']))).length,0)}
{const m=[];for(let i=0;i<500;i++)m.push(p(s('self',`A${i}`,`r${i}`,'B',[`ally-${i}`])));assert.equal(O.reactivate(m,f(s('self','B','new','C',['current-ally']))).length,0)}
{const m=[];for(let i=0;i<500;i++)m.push(p(s('self',`A${i}`,'trust','B',[`ally-${i}`])));assert.equal(O.reactivate(m,f(s('self','B','trust','C',['current-ally']))).length,0)}
{const m=[];for(let i=0;i<500;i++)m.push(p(s('self',`A${i}`,'r','B',[])));assert.equal(O.reactivate(m,f(s('self','B','next','C',[]))).length,0)}
{const x=O.directedStep(s('self','A','r','B',['self','ally']));assert.deepEqual(x.counterparts,['ally'])}
{const m=[];for(let i=0;i<500;i++)m.push(p(s('self',`A${i}`,'r','B',[`ally-${i}`])));const truth=p(s('self','TRUE','old','B',['returning-ally']));m.splice(211,0,truth);assert.deepEqual(O.reactivate(m,f(s('self','B','new','C',['returning-ally']))).map(x=>x.key),[truth.key])}

console.log('OASIS Core v0.2 tests: 12/12 passed');
