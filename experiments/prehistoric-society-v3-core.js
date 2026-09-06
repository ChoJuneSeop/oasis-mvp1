
const $=id=>document.getElementById(id),cv=$('world'),ctx=cv.getContext('2d');
const W=960,H=600,TAU=Math.PI*2,MAX_POP=220;
const FOUNDERS={
 oasis:{label:'OASIS 시조',controller:'oasis',color:'#f3c677'},
 rule:{label:'Rule 시조',controller:'rule',color:'#8dd3c7'},
 utility:{label:'Utility 시조',controller:'utility',color:'#80b1d3'},
 q:{label:'Q-like 시조',controller:'q',color:'#bebada'},
 retrieval:{label:'Retrieval 시조',controller:'retrieval',color:'#fb8072'}
};
const ACTION_LABEL={observe:'관찰',move:'이동',forage:'채집',drink:'물',gather:'재료',rest:'휴식',interact:'접촉',share:'나눔',craft:'도구',fire:'불',hunt:'사냥',wait:'대기'};
const BASE_NODES=[
{id:'berries',kind:'food',x:155,y:150,stock:55,max:55,regen:.04,label:'열매숲'},
{id:'river',kind:'water',x:475,y:350,stock:999,max:999,regen:0,label:'강'},
{id:'stone',kind:'stone',x:780,y:155,stock:34,max:34,regen:.008,label:'돌무더기'},
{id:'wood',kind:'wood',x:250,y:470,stock:44,max:44,regen:.022,label:'마른나무'},
{id:'cave',kind:'shelter',x:810,y:455,stock:999,max:999,regen:0,label:'동굴'},
{id:'meadow',kind:'animal',x:590,y:115,stock:20,max:20,regen:.014,label:'짐승터'}];
const DIRS=[['N',480,30],['NE',910,50],['E',930,300],['SE',900,555],['S',480,570],['SW',55,545],['W',30,300],['NW',55,55]];
let E,timer,focus='oasis';
function rng(seed){let x=seed>>>0;return()=>((x=Math.imul(1664525,x)+1013904223>>>0)/4294967296)}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function noise(tag){return rng(hash(tag+'|'+E.tick))()}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function log(msg,kind='world'){E.log.unshift({t:E.tick,msg,kind});E.log=E.log.slice(0,220);E.events++}
function neutralName(id){return '사람'+String(id).replace(/\D/g,'').padStart(2,'0')}
function baseTraits(seed){const r=rng(seed),xs=[r(),r(),r(),r(),r()];const s=xs.reduce((a,b)=>a+b,0);return{explore:xs[0]/s,social:xs[1]/s,safety:xs[2]/s,utility:xs[3]/s,habit:xs[4]/s}}
function mkPerson(id,x,y,controller='human',founder=false,generation=0,parents=[]){
 const s=hash('person|'+id),r=rng(s);
 return{id:String(id),observerLabel:founder?FOUNDERS[id].label:neutralName(id),publicName:'사람',controller,founder,generation,parents:[...parents],sex:r()>.5?'F':'M',x,y,energy:68+r()*12,water:68+r()*12,warmth:58+r()*8,health:100,inventory:{food:0,stone:0,wood:0},tool:0,fire:0,known:new Set(),memory:[],relations:{},relationEpisodes:[],activeRelations:[],q:{},traits:baseTraits(s),culture:{actions:{},knownKinds:new Set()},lastAction:null,lastWhy:'첫 관측 전',lastPerception:null,lastOutcome:0,actions:0,birthCooldown:0,recoveryUntil:0,age:E?.tick||0,lifeLimit:7000+r()*4000,metrics:{observe:0,move:0,resource:0,social:0,rest:0,innovation:0,relationUse:0,memoryUse:0,births:0,bioReflex:0},alive:1};
}
function manifestTraits(P){const m=P.metrics,total=Math.max(1,P.actions);return{explore:(m.observe+m.move)/total,social:m.social/total,safety:(m.rest+(P.lastAction==='drink'?1:0))/total,utility:m.resource/total,habit:Math.min(1,P.memory.length/Math.max(1,total))}}
function childTraits(A,B,id){const ra=manifestTraits(A),rb=manifestTraits(B),r=rng(hash('childtraits|'+id));const out={};for(const k of ['explore','social','safety','utility','habit'])out[k]=Math.max(.02,(ra[k]+rb[k])/2+(r()-.5)*.12);const s=Object.values(out).reduce((a,b)=>a+b,0);for(const k in out)out[k]/=s;return out}
function reset(){
 E={tick:0,nodes:BASE_NODES.map(n=>({...n})),people:{},nextId:100,births:0,deaths:0,events:0,relations:0,innovations:0,maxGeneration:0,temp:.5,weather:'보통',log:[],paused:0};
 let i=0;for(const [k,d] of Object.entries(FOUNDERS)){const a=mkPerson(k,430+(i-2)*26,275+(i%2)*30,d.controller,true,0,[]);a.observerLabel=d.label;E.people[k]=a;i++}
 const r=rng(20260905);for(let n=0;n<20;n++){const id=String(E.nextId++),a=mkPerson(id,350+r()*250,235+r()*170,'human',false,0,[]);E.people[id]=a}
 log('하나의 구석기 세계가 시작되었다. 시조·일반 인간 모두 세계 내부에서는 서로를 같은 인간으로 관측한다.');render();
}
function living(){return Object.values(E.people).filter(a=>a.alive&&E.tick>=a.recoveryUntil)}
function updateEnvironment(){
 const seasonal=(Math.sin(E.tick/220)+1)/2,shock=noise('weather|'+Math.floor(E.tick/45));E.temp=clamp(.28+.48*seasonal+(shock<.05?-.24:shock>.95?.2:0),0,1);E.weather=E.temp<.24?'한랭':E.temp>.78?'고온':'보통';
 for(const n of E.nodes)if(n.stock<n.max)n.stock=Math.min(n.max,n.stock+n.regen);
 if(E.tick%170===0){const a=E.nodes.find(n=>n.kind==='animal');a.x=clamp(a.x+(noise('animalx')-.5)*190,70,W-70);a.y=clamp(a.y+(noise('animaly')-.5)*140,70,H-70);log('짐승 무리의 위치가 이동했다.');}
}
function perception(A){
 const nearNodes=E.nodes.filter(n=>dist(A,n)<185).map(n=>({id:n.id,kind:n.kind,x:n.x,y:n.y,stock:n.stock,d:dist(A,n)}));
 const nearAgents=living().filter(B=>B.id!==A.id&&dist(A,B)<145).map(B=>({id:B.id,name:'사람',x:B.x,y:B.y,d:dist(A,B)}));
 return{tick:E.tick,temp:E.temp,weather:E.weather,self:{energy:A.energy,water:A.water,warmth:A.warmth,health:A.health,tool:A.tool,fire:A.fire,inventory:{...A.inventory},x:A.x,y:A.y},nearNodes,nearAgents};
}
function acts(A,P){
 const out=[{type:'observe'}];
 for(const n of P.nearNodes){if(n.d>30)out.push({type:'move',target:n.id,kind:n.kind});else{if(n.kind==='food'&&n.stock>1)out.push({type:'forage',target:n.id});if(n.kind==='water')out.push({type:'drink',target:n.id});if((n.kind==='stone'||n.kind==='wood')&&n.stock>1)out.push({type:'gather',target:n.id,kind:n.kind});if(n.kind==='shelter')out.push({type:'rest',target:n.id});if(n.kind==='animal'&&A.tool)out.push({type:'hunt',target:n.id})}}
 for(const B of P.nearAgents){if(B.d>30)out.push({type:'move',target:'agent:'+B.id,kind:'agent'});else{out.push({type:'interact',target:B.id});if(A.inventory.food||A.inventory.wood||A.inventory.stone)out.push({type:'share',target:B.id})}}
 if(A.inventory.stone>=2&&A.inventory.wood>=1&&!A.tool)out.push({type:'craft'});if(A.inventory.wood>=2&&A.inventory.stone>=1&&!A.fire)out.push({type:'fire'});
 for(const [dir,x,y] of DIRS)out.push({type:'move',target:'dir:'+dir,kind:'direction',x,y});out.push({type:'wait'});return dedupe(out)
}
function dedupe(xs){const m=new Map();for(const a of xs)m.set(a.type+'|'+(a.target||'')+'|'+(a.kind||''),a);return[...m.values()]}
function actionKey(a){return a.type+(a.kind?':'+a.kind:'')}
function needScore(P,a){const nE=(100-P.self.energy)/100,nW=(100-P.self.water)/100,nT=(100-P.self.warmth)/100,nH=(100-P.self.health)/100;let s=0;if(a.type==='drink'||(a.type==='move'&&a.kind==='water'))s+=nW*2.3;if(a.type==='forage'||a.type==='hunt'||(a.type==='move'&&a.kind==='food'))s+=nE*1.8;if(a.type==='rest'||(a.type==='move'&&a.kind==='shelter'))s+=(nE+nT+nH)*1.1;if(a.type==='fire')s+=nT*1.5;return s}
