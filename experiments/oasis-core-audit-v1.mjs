import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const ctx={clearRect(){},fillRect(){},beginPath(){},arc(){},fill(){},fillText(){},stroke(){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){}};
function el(){return {textContent:'',innerHTML:'',value:'',className:'',onclick:null,onchange:null,classList:{toggle(){}},appendChild(){},getContext(){return ctx}}}
const els=new Map();
globalThis.document={getElementById(id){if(!els.has(id))els.set(id,el());return els.get(id)},querySelectorAll(){return[]},querySelector(){return el()},createElement(){return el()}};
globalThis.setInterval=()=>0;globalThis.clearInterval=()=>{};

for(const f of ['prehistoric-society-v3-core.js','prehistoric-society-v3-decisions.js']){
  vm.runInThisContext(fs.readFileSync(path.join(here,f),'utf8'),{filename:f});
}
const worldSrc=fs.readFileSync(path.join(here,'prehistoric-society-v3-world.js'),'utf8');

vm.runInThisContext(`
E={tick:5000,nodes:[{id:'newfire',kind:'natural_fire',x:10,y:10,stock:1,max:1,regen:0}],people:{},nextId:1,births:0,deaths:0,events:0,relations:0,innovations:0,maxGeneration:0,temp:.5,weather:'보통',log:[],paused:0};
const A=mkPerson('oasis',0,0,'oasis',true,0,[]);A.energy=70;A.water=70;A.warmth=70;A.health=100;E.people.oasis=A;
const friend=mkPerson('friend',5,5,'human',false,0,[]);E.people.friend=friend;
function baseP(){return {tick:E.tick,temp:.5,weather:'보통',self:{energy:A.energy,water:A.water,warmth:A.warmth,health:A.health,tool:0,fire:0,inventory:{food:0,stone:0,wood:0},x:0,y:0},nearNodes:[],nearAgents:[]}}
const tests=[];
function add(name,expected,actual,detail){tests.push({name,expected,actual,pass:Object.is(expected,actual),detail})}

// 1. New-candidate generation: OASIS spec expects relation recombination to be able to create a candidate not prelisted in primitive affordances.
{
  const P=baseP();P.nearAgents=[{id:'friend',name:'사람',x:5,y:5,d:7}];
  A.relationEpisodes=[
    {t:4900,action:'observe',context:['agent:friend','node:fire'],sig:'a',outcome:.5},
    {t:4920,action:'share',context:['agent:friend','node:meat'],sig:'b',outcome:.8},
    {t:4940,action:'rest',context:['node:cave'],sig:'c',outcome:.4}
  ];
  const as=[{type:'observe'},{type:'interact',target:'friend'},{type:'move',target:'dir:N',kind:'direction',x:0,y:30},{type:'wait'}];
  const d=oasisDecide(A,P,as);const input=new Set(as.map(actionKey));
  add('new_candidate_generation',true,!input.has(actionKey(d.a)),{chosen:actionKey(d.a),input:[...input]});
}

// 2. Structural reactivation across different IDs: same relational kind, different concrete object id.
{
  const P=baseP();P.nearNodes=[{id:'newfire',kind:'natural_fire',x:10,y:10,stock:1,d:14}];
  A.relationEpisodes=[{t:4900,action:'study_fire',context:['node:oldfire'],sig:'old',outcome:.5}];
  add('structural_reactivation_different_id',true,activeRelations(A,P).length>0,{active:activeRelations(A,P).length});
}

// 3. Current relevance should not be hard-cut only because an episode is older than a fixed tick window.
{
  const P=baseP();P.nearNodes=[{id:'newfire',kind:'natural_fire',x:10,y:10,stock:1,d:14}];
  A.relationEpisodes=[{t:3000,action:'study_fire',context:['node:newfire'],sig:'aged',outcome:.5}];
  add('no_fixed_age_cutoff_for_currently_relevant_relation',true,activeRelations(A,P).length>0,{age:E.tick-3000,active:activeRelations(A,P).length});
}

// 4. More simultaneously active relations should change combinatorial structure, not merely flip a binary flag.
{
  const P=baseP(),a={type:'move',target:'dir:N',kind:'direction',x:0,y:30};
  const one=[{context:['node:x']}],three=[{context:['node:x']},{context:['node:y']},{context:['node:z']}];
  const r1=oasisRank(A,P,a,one),r3=oasisRank(A,P,a,three);
  add('combination_sensitive_to_relation_set_size',true,r1[2]!==r3[2],{one:r1,three:r3});
}

// 5. Axes are expected to interact dynamically; strict lexicographic ordering means any positive responsibility difference dominates all later relation terms.
{
  const P=baseP();P.self.water=15;P.nearAgents=[{id:'friend',name:'사람',x:5,y:5,d:7}];
  const drink={type:'drink',target:'river'},interact={type:'interact',target:'friend'};
  const active=Array.from({length:12},(_,i)=>({context:['agent:friend','node:r'+i]}));
  const rd=oasisRank(A,P,drink,active),ri=oasisRank(A,P,interact,active);
  const rows=[{a:drink,r:rd},{a:interact,r:ri}].sort((x,y)=>cmpTuple(x.r,y.r));
  const relationCanOverride=actionKey(rows[0].a)==='interact';
  add('dynamic_axis_interaction_not_strict_lexicographic',true,relationCanOverride,{drink:rd,interact:ri,winner:actionKey(rows[0].a)});
}

globalThis.__AUDIT_TESTS__=tests;
`);

const sequenceOverwrite=/findIndex\(x=>x\.sig===sig\)[\s\S]{0,120}relationEpisodes\[ix\]=ep/.test(worldSrc);
const boundedHistory=/relationEpisodes\s*=\s*A\.relationEpisodes\.slice\(-160\)/.test(worldSrc);
const staticTests=[{
  name:'preserve_repeated_relational_sequence',
  expected:true,
  actual:!(sequenceOverwrite||boundedHistory),
  pass:!(sequenceOverwrite||boundedHistory),
  detail:{sequenceOverwrite,boundedHistory}
}];

const tests=[...globalThis.__AUDIT_TESTS__,...staticTests];
const summary={specChecks:tests.length,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,verdict:tests.every(t=>t.pass)?'implementation-consistent':'implementation-mismatch'};
console.log(JSON.stringify(summary,null,2));
if(summary.failed)process.exitCode=2;
