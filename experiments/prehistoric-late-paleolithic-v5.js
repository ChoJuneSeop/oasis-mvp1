(function(){
// v0.5 late-Paleolithic progression layer.
// New materials may appear after prolonged stagnation; agents receive no instruction about their use.
const oldReset=reset,oldUpdateEnvironment=updateEnvironment,oldActs=acts,oldExecute=execute,oldUtilityValue=utilityValue,oldOasisRank=oasisRank,oldRuleDecide=ruleDecide,oldRender=render;

function ensureLate(A){if(!A.late)A.late={qualityStone:0,pigment:0,bone:0,advancedTool:0,boneTool:0,rareOrigins:{},lastCoopSuccess:A.metrics.coopSuccess||0};return A.late;}
function nodeExists(id){return E.nodes.some(n=>n.id===id);}
function spawnQualityStone(){if(nodeExists('qualitystone'))return;E.nodes.push({id:'qualitystone',kind:'quality_stone',x:75,y:72,stock:28,max:28,regen:.0015,label:'질 좋은 희귀 석재'});E.lateWorld.qualitySpawned=true;log('멀리 떨어진 노두에서 기존 돌과 성질이 다른 질 좋은 석재가 드러났다. 용도는 누구에게도 주어지지 않았다.');}
function spawnPigment(){if(nodeExists('ochre'))return;E.nodes.push({id:'ochre',kind:'pigment',x:905,y:525,stock:32,max:32,regen:.001,label:'붉은 안료층'});E.lateWorld.pigmentSpawned=true;log('침식된 지층에서 손과 표면에 색이 남는 붉은 광물이 드러났다. 용도는 누구에게도 주어지지 않았다.');}
function advancedCount(){return living().filter(a=>ensureLate(a).advancedTool||ensureLate(a).boneTool).length;}
function symbolCount(){return E.nodes.filter(n=>n.kind==='symbol_site').length;}
function maybeLateMaterials(){if(E.tick>=9000&&!E.lateWorld.qualitySpawned&&advancedCount()===0)spawnQualityStone();if(E.tick>=12000&&!E.lateWorld.pigmentSpawned&&symbolCount()===0)spawnPigment();}
function grantHuntBones(){for(const A of living()){const L=ensureLate(A),now=A.metrics.coopSuccess||0;if(now>L.lastCoopSuccess){L.bone+=now-L.lastCoopSuccess;L.lastCoopSuccess=now;}}}

reset=function(){oldReset();E.lateWorld={qualitySpawned:false,pigmentSpawned:false,longTransfers:0,symbols:0};E.lateMilestones={firstCompositeTool:null,firstBoneTool:null,firstSymbol:null,firstSymbolObserved:null,firstLongTransfer:null};for(const A of Object.values(E.people))ensureLate(A);log('v0.5: 후기 구석기 수준의 물질·상징·광역전승 가능성을 관찰하기 시작했다.');};
updateEnvironment=function(){oldUpdateEnvironment();for(const A of Object.values(E.people))ensureLate(A);grantHuntBones();maybeLateMaterials();};

acts=function(A,P){const L=ensureLate(A),xs=oldActs(A,P);
  for(const n of P.nearNodes){
    if(n.d<=30&&n.kind==='quality_stone'&&n.stock>0)xs.push({type:'gather_quality',target:n.id,kind:'quality_stone'});
    if(n.d<=30&&n.kind==='pigment'&&n.stock>0)xs.push({type:'gather_pigment',target:n.id,kind:'pigment'});
    if(n.d<=45&&n.kind==='symbol_site')xs.push({type:'study_symbol',target:n.id,kind:'symbol'});
  }
  if(L.qualityStone>0&&A.inventory.wood>0&&A.tool)xs.push({type:'make_composite',kind:'technology'});
  if(L.bone>0&&A.tool)xs.push({type:'shape_bone_tool',kind:'technology'});
  const hasMarkPlace=P.nearNodes.some(n=>n.kind==='shelter'||n.kind==='hearth'||n.kind==='symbol_site');if(L.pigment>0&&hasMarkPlace)xs.push({type:'make_symbol',kind:'symbol'});
  if((L.qualityStone>0||L.pigment>0||L.bone>0)&&P.nearAgents.some(n=>n.d<=30))for(const B of P.nearAgents.filter(n=>n.d<=30))xs.push({type:'exchange_rare',target:B.id,kind:'exchange'});
  return dedupe(xs);
};

utilityValue=function(A,P,a){let v=oldUtilityValue(A,P,a);if(a.type==='gather_quality'||a.type==='gather_pigment')v+=.65;if(a.type==='make_composite')v+=1.7;if(a.type==='shape_bone_tool')v+=1.35;if(a.type==='make_symbol')v+=.25+(A.human?.prestige||0)*.05;if(a.type==='study_symbol')v+=.4;if(a.type==='exchange_rare')v+=.35+(A.human?.prestige||0)*.05;return v;};
oasisRank=function(A,P,a,active){const r=oldOasisRank(A,P,a,active);const culturalNovel=['make_composite','shape_bone_tool','make_symbol','exchange_rare','study_symbol'].includes(a.type)?1:0;return[r[0],r[1],r[2],r[3],r[4],culturalNovel,...r.slice(5)];};
ruleDecide=function(A,P,as){let a;if(P.self.water<38)a=as.find(x=>x.type==='drink')||as.find(x=>x.type==='move'&&x.kind==='water');if(!a&&P.self.energy<45)a=as.find(x=>x.type==='join_hunt')||as.find(x=>x.type==='propose_hunt')||as.find(x=>x.type==='hunt')||as.find(x=>x.type==='forage')||as.find(x=>x.type==='move'&&x.kind==='food')||as.find(x=>x.type==='rest');if(!a)a=as.find(x=>x.type==='make_composite')||as.find(x=>x.type==='shape_bone_tool')||as.find(x=>x.type==='craft')||as.find(x=>x.type==='fire')||as.find(x=>x.type==='interact')||as.find(x=>x.type==='move'&&x.kind==='direction')||as[0];return{a,why:'내부 조건규칙의 첫 충족 분기'}};

function recordOrigin(A,kind,node){const L=ensureLate(A);L.rareOrigins[kind]={x:node.x,y:node.y,id:node.id};}
function transferRare(A,B){const L=ensureLate(A),R=ensureLate(B);let k=null;if(L.qualityStone>0)k='qualityStone';else if(L.pigment>0)k='pigment';else if(L.bone>0)k='bone';if(!k)return null;L[k]--;R[k]++;const o=L.rareOrigins[k];if(o){R.rareOrigins[k]={...o};if(Math.hypot(A.x-o.x,A.y-o.y)>280){E.lateWorld.longTransfers++;if(!E.lateMilestones.firstLongTransfer)E.lateMilestones.firstLongTransfer={t:E.tick,from:A.id,to:B.id,material:k,distance:+Math.hypot(A.x-o.x,A.y-o.y).toFixed(1)};}}return k;}

execute=function(A,P,a){const L=ensureLate(A);
  if(a.type==='hunt'){const before=A.metrics.resource,out=oldExecute(A,P,a);if(out>0){L.bone++;}return out;}
  if(a.type==='gather_quality'){const n=E.nodes.find(n=>n.id===a.target);A.actions++;A.metrics.resource++;A.culture.actions.gather_quality=(A.culture.actions.gather_quality||0)+1;if(n&&n.stock>0){n.stock--;L.qualityStone++;recordOrigin(A,'qualityStone',n);A.lastOutcome=.75;return .75}return 0;}
  if(a.type==='gather_pigment'){const n=E.nodes.find(n=>n.id===a.target);A.actions++;A.metrics.resource++;A.culture.actions.gather_pigment=(A.culture.actions.gather_pigment||0)+1;if(n&&n.stock>0){n.stock--;L.pigment++;recordOrigin(A,'pigment',n);A.lastOutcome=.35;return .35}return 0;}
  if(a.type==='make_composite'){A.actions++;A.metrics.innovation++;A.culture.actions.make_composite=(A.culture.actions.make_composite||0)+1;if(L.qualityStone>0&&A.inventory.wood>0&&A.tool){L.qualityStone--;A.inventory.wood--;L.advancedTool=1;A.tool=2;E.innovations++;if(!E.lateMilestones.firstCompositeTool)E.lateMilestones.firstCompositeTool={t:E.tick,id:A.id};log('한 사람이 질 좋은 석재와 나무를 결합한 복합 도구를 만들었다.');A.lastOutcome=1.7;return 1.7}return 0;}
  if(a.type==='shape_bone_tool'){A.actions++;A.metrics.innovation++;A.culture.actions.shape_bone_tool=(A.culture.actions.shape_bone_tool||0)+1;if(L.bone>0&&A.tool){L.bone--;L.boneTool=1;E.innovations++;if(!E.lateMilestones.firstBoneTool)E.lateMilestones.firstBoneTool={t:E.tick,id:A.id};log('사냥 부산물의 뼈가 반복 가공되어 새로운 도구가 되었다.');A.lastOutcome=1.35;return 1.35}return 0;}
  if(a.type==='make_symbol'){A.actions++;A.metrics.innovation++;A.culture.actions.make_symbol=(A.culture.actions.make_symbol||0)+1;if(L.pigment>0){L.pigment--;const id='symbol:'+E.tick+':'+A.id;E.nodes.push({id,kind:'symbol_site',x:A.x,y:A.y,stock:999,max:999,regen:0,label:'반복되는 색 표식',maker:A.id});E.lateWorld.symbols++;if(!E.lateMilestones.firstSymbol)E.lateMilestones.firstSymbol={t:E.tick,id:A.id,site:id};log('한 사람이 붉은 광물로 반복되는 표식을 남겼다. 의미는 관찰자가 지정하지 않는다.');A.lastOutcome=.8;return .8}return 0;}
  if(a.type==='study_symbol'){A.actions++;A.metrics.observe++;A.culture.actions.study_symbol=(A.culture.actions.study_symbol||0)+1;A.culture.knownKinds.add('symbolic_mark');if(!E.lateMilestones.firstSymbolObserved)E.lateMilestones.firstSymbolObserved={t:E.tick,id:A.id,site:a.target};A.lastOutcome=.4;return .4;}
  if(a.type==='exchange_rare'){const B=E.people[a.target];A.actions++;A.metrics.social++;A.culture.actions.exchange_rare=(A.culture.actions.exchange_rare||0)+1;if(B&&B.alive){const k=transferRare(A,B);if(k){relation(A,B,.07);if(A.human)A.human.prestige=clamp(A.human.prestige+.015,0,5);A.lastOutcome=.65;return .65}}return 0;}
  return oldExecute(A,P,a);
};

render=function(){oldRender();let box=document.getElementById('latePaleo');if(!box){box=document.createElement('div');box.id='latePaleo';box.className='foot';document.querySelector('.app')?.appendChild(box);}const m=E.lateMilestones||{};box.textContent='후기구석기 지표: 복합도구 '+(m.firstCompositeTool?'발생':'미발생')+' · 뼈도구 '+(m.firstBoneTool?'발생':'미발생')+' · 상징표식 '+(m.firstSymbol?'발생':'미발생')+' · 타인 관찰 '+(m.firstSymbolObserved?'발생':'미발생')+' · 희귀재료 장거리 전달 '+(m.firstLongTransfer?'발생':'미발생');};

reset();render();
})();
