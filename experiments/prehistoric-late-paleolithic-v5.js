(function(){
// v0.5 late-Paleolithic singularity layer.
// The observer may expose historically plausible materials/opportunities after prolonged stagnation.
// No model-specific score, rule, goal, or preference is added here.
const oldReset=reset,oldUpdateEnvironment=updateEnvironment,oldActs=acts,oldExecute=execute,oldRender=render;

function ensureLate(A){
  if(!A.late)A.late={qualityStone:0,pigment:0,bone:0,advancedTool:0,boneTool:0,rareOrigins:{},lastCoopSuccess:A.metrics.coopSuccess||0};
  return A.late;
}
function nodeExists(id){return E.nodes.some(n=>n.id===id)}
function spawnQualityStone(){
  if(nodeExists('qualitystone'))return;
  E.nodes.push({id:'qualitystone',kind:'quality_stone',x:75,y:72,stock:28,max:28,regen:.0015,label:'성질이 다른 희귀 석재'});
  E.lateWorld.qualitySpawned=true;
  log('멀리 떨어진 노두에서 기존 돌과 성질이 다른 석재가 드러났다. 용도는 누구에게도 주어지지 않았다.');
}
function spawnPigment(){
  if(nodeExists('ochre'))return;
  E.nodes.push({id:'ochre',kind:'pigment',x:905,y:525,stock:32,max:32,regen:.001,label:'손과 표면에 색이 남는 붉은 광물'});
  E.lateWorld.pigmentSpawned=true;
  log('침식된 지층에서 손과 표면에 색이 남는 붉은 광물이 드러났다. 의미와 용도는 누구에게도 주어지지 않았다.');
}
function advancedCount(){return living().filter(a=>{const L=ensureLate(a);return L.advancedTool||L.boneTool}).length}
function markCount(){return E.nodes.filter(n=>n.kind==='mark_site').length}
function maybeLateMaterials(){
  // Stagnation-triggered observer interventions. Timing is invisible to agents.
  if(E.tick>=9000&&!E.lateWorld.qualitySpawned&&advancedCount()===0)spawnQualityStone();
  if(E.tick>=12000&&!E.lateWorld.pigmentSpawned&&markCount()===0)spawnPigment();
}
function grantHuntBones(){
  for(const A of living()){
    const L=ensureLate(A),now=A.metrics.coopSuccess||0;
    if(now>L.lastCoopSuccess){L.bone+=now-L.lastCoopSuccess;L.lastCoopSuccess=now;}
  }
}

reset=function(){
  oldReset();
  E.lateWorld={qualitySpawned:false,pigmentSpawned:false,longTransfers:0,marks:0};
  E.lateMilestones={firstCompositeTool:null,firstBoneTool:null,firstMark:null,firstMarkObserved:null,firstLongTransfer:null};
  for(const A of Object.values(E.people))ensureLate(A);
  log('v0.5: 후기 구석기 특이점은 재료와 물리적 가능성으로만 주어진다.');
};
updateEnvironment=function(){oldUpdateEnvironment();for(const A of Object.values(E.people))ensureLate(A);grantHuntBones();maybeLateMaterials();};

acts=function(A,P){
  const L=ensureLate(A),xs=oldActs(A,P);
  for(const n of P.nearNodes){
    if(n.d<=30&&n.kind==='quality_stone'&&n.stock>0)xs.push({type:'gather_quality',target:n.id,kind:'quality_stone'});
    if(n.d<=30&&n.kind==='pigment'&&n.stock>0)xs.push({type:'gather_pigment',target:n.id,kind:'pigment'});
    if(n.d<=45&&n.kind==='mark_site')xs.push({type:'observe_mark',target:n.id,kind:'mark'});
  }
  // Physical combination affordances only; no action is given extra preference here.
  if(L.qualityStone>0&&A.inventory.wood>0&&A.tool)xs.push({type:'combine_stone_wood',kind:'technology'});
  if(L.bone>0&&A.tool)xs.push({type:'shape_bone',kind:'technology'});
  const nearSurface=P.nearNodes.some(n=>n.kind==='shelter'||n.kind==='hearth'||n.kind==='mark_site');
  if(L.pigment>0&&nearSurface)xs.push({type:'mark_surface',kind:'mark'});
  if((L.qualityStone>0||L.pigment>0||L.bone>0)&&P.nearAgents.some(n=>n.d<=30)){
    for(const B of P.nearAgents.filter(n=>n.d<=30))xs.push({type:'transfer_rare',target:B.id,kind:'transfer'});
  }
  return dedupe(xs);
};

function recordOrigin(A,kind,node){ensureLate(A).rareOrigins[kind]={x:node.x,y:node.y,id:node.id};}
function transferRare(A,B){
  const L=ensureLate(A),R=ensureLate(B);let k=null;
  if(L.qualityStone>0)k='qualityStone';else if(L.pigment>0)k='pigment';else if(L.bone>0)k='bone';if(!k)return null;
  L[k]--;R[k]++;
  const o=L.rareOrigins[k];if(o){R.rareOrigins[k]={...o};const d=Math.hypot(A.x-o.x,A.y-o.y);if(d>280){E.lateWorld.longTransfers++;if(!E.lateMilestones.firstLongTransfer)E.lateMilestones.firstLongTransfer={t:E.tick,from:A.id,to:B.id,material:k,distance:+d.toFixed(1)};}}
  return k;
}

execute=function(A,P,a){
  const L=ensureLate(A);
  if(a.type==='hunt'){const out=oldExecute(A,P,a);if(out>0)L.bone++;return out;}
  if(a.type==='gather_quality'){
    const n=E.nodes.find(n=>n.id===a.target);A.actions++;A.metrics.resource++;A.culture.actions.gather_quality=(A.culture.actions.gather_quality||0)+1;
    if(n&&n.stock>0){n.stock--;L.qualityStone++;recordOrigin(A,'qualityStone',n);A.lastOutcome=.45;return .45}return 0;
  }
  if(a.type==='gather_pigment'){
    const n=E.nodes.find(n=>n.id===a.target);A.actions++;A.metrics.resource++;A.culture.actions.gather_pigment=(A.culture.actions.gather_pigment||0)+1;
    if(n&&n.stock>0){n.stock--;L.pigment++;recordOrigin(A,'pigment',n);A.lastOutcome=.15;return .15}return 0;
  }
  if(a.type==='combine_stone_wood'){
    A.actions++;A.metrics.innovation++;A.culture.actions.combine_stone_wood=(A.culture.actions.combine_stone_wood||0)+1;
    if(L.qualityStone>0&&A.inventory.wood>0&&A.tool){L.qualityStone--;A.inventory.wood--;L.advancedTool=1;A.tool=2;E.innovations++;if(!E.lateMilestones.firstCompositeTool)E.lateMilestones.firstCompositeTool={t:E.tick,id:A.id};log('한 사람이 서로 다른 재료를 결합한 복합 도구를 만들었다.');A.lastOutcome=1.25;return 1.25}return 0;
  }
  if(a.type==='shape_bone'){
    A.actions++;A.metrics.innovation++;A.culture.actions.shape_bone=(A.culture.actions.shape_bone||0)+1;
    if(L.bone>0&&A.tool){L.bone--;L.boneTool=1;E.innovations++;if(!E.lateMilestones.firstBoneTool)E.lateMilestones.firstBoneTool={t:E.tick,id:A.id};log('사냥 부산물의 뼈가 반복 가공되어 도구가 되었다.');A.lastOutcome=1.0;return 1.0}return 0;
  }
  if(a.type==='mark_surface'){
    A.actions++;A.metrics.innovation++;A.culture.actions.mark_surface=(A.culture.actions.mark_surface||0)+1;
    if(L.pigment>0){L.pigment--;const id='mark:'+E.tick+':'+A.id;E.nodes.push({id,kind:'mark_site',x:A.x,y:A.y,stock:999,max:999,regen:0,label:'색이 남은 반복 표면흔적',maker:A.id});E.lateWorld.marks++;if(!E.lateMilestones.firstMark)E.lateMilestones.firstMark={t:E.tick,id:A.id,site:id};log('한 사람이 붉은 광물로 표면에 반복되는 흔적을 남겼다. 그 의미는 지정되지 않았다.');A.lastOutcome=.35;return .35}return 0;
  }
  if(a.type==='observe_mark'){
    A.actions++;A.metrics.observe++;A.culture.actions.observe_mark=(A.culture.actions.observe_mark||0)+1;A.culture.knownKinds.add('persistent_mark');if(!E.lateMilestones.firstMarkObserved)E.lateMilestones.firstMarkObserved={t:E.tick,id:A.id,site:a.target};A.lastOutcome=.2;return .2;
  }
  if(a.type==='transfer_rare'){
    const B=E.people[a.target];A.actions++;A.metrics.social++;A.culture.actions.transfer_rare=(A.culture.actions.transfer_rare||0)+1;
    if(B&&B.alive){const k=transferRare(A,B);if(k){relation(A,B,.04);A.lastOutcome=.3;return .3}}return 0;
  }
  return oldExecute(A,P,a);
};

render=function(){
  oldRender();let box=document.getElementById('latePaleo');if(!box){box=document.createElement('div');box.id='latePaleo';box.className='foot';document.querySelector('.app')?.appendChild(box);}
  const m=E.lateMilestones||{};box.textContent='후기구석기 관찰: 복합도구 '+(m.firstCompositeTool?'발생':'미발생')+' · 뼈도구 '+(m.firstBoneTool?'발생':'미발생')+' · 표면흔적 '+(m.firstMark?'발생':'미발생')+' · 타인 관찰 '+(m.firstMarkObserved?'발생':'미발생')+' · 희귀재료 장거리 전달 '+(m.firstLongTransfer?'발생':'미발생');
};

reset();render();
})();
