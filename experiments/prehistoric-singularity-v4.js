(function(){
// v0.4 observer layer: no goals or history are injected into agents.
// When the world remains technologically stagnant, only physical opportunities appear.
const oldReset=reset,oldUpdateEnvironment=updateEnvironment,oldActs=acts,oldExecute=execute,oldHomeostaticReflex=homeostaticReflex,oldRender=render;

function techSnapshot(){
  const pop=living();
  return {tools:pop.filter(a=>a.tool).length,fires:pop.filter(a=>a.fire).length,pop:pop.length};
}
function addSingularity(kind){
  E.singularities=E.singularities||{};
  if(E.singularities[kind]?.spawned)return;
  if(kind==='fire'){
    E.nodes.push({id:'wildfire',kind:'natural_fire',x:655,y:405,stock:1,max:1,regen:0,label:'번개 뒤 남은 불씨',expires:E.tick+1800});
    E.singularities.fire={spawned:true,t:E.tick,adopted:false};
    log('낙뢰 뒤 마른 초지에 자연불이 남았다. 누구에게도 사용법은 주어지지 않았다.');
  }
  if(kind==='edge'){
    E.nodes.push({id:'sharpflake',kind:'sharp_stone',x:335,y:105,stock:14,max:14,regen:0,label:'자연 파쇄된 예리한 돌'});
    E.singularities.edge={spawned:true,t:E.tick,adopted:false};
    log('낙석으로 깨진 돌들 사이에 매우 예리한 파편이 드러났다. 누구에게도 용도는 주어지지 않았다.');
  }
}
function maybeSingularity(){
  const s=techSnapshot();
  // Intervention is observer-only and reacts to prolonged stagnation, never to a model label.
  if(E.tick>=3000&&!E.singularities?.fire?.spawned&&s.fires===0)addSingularity('fire');
  if(E.tick>=6500&&!E.singularities?.edge?.spawned&&s.tools===0)addSingularity('edge');
  // Natural fire is transient if nobody preserves it.
  const wf=E.nodes.find(n=>n.id==='wildfire');
  if(wf&&wf.expires&&E.tick>wf.expires&&!E.singularities.fire.adopted){E.nodes=E.nodes.filter(n=>n.id!=='wildfire');log('자연불은 보존되지 못하고 사라졌다.');}
}

reset=function(){
  oldReset();
  E.singularities={fire:{spawned:false,adopted:false},edge:{spawned:false,adopted:false}};
  E.milestones={firstPreservedFire:null,firstSharpTool:null};
  log('v0.4: 장기 정체 시 관찰자 레이어가 자연적 특이점만 허용한다.');
};
updateEnvironment=function(){oldUpdateEnvironment();maybeSingularity();};

acts=function(A,P){
  const xs=oldActs(A,P);
  for(const n of P.nearNodes){
    if(n.kind==='natural_fire'&&n.d<=30){
      xs.push({type:'rest',target:n.id,kind:'natural_fire'});
      xs.push({type:'study_fire',target:n.id,kind:'natural_fire'});
      if(A.inventory.wood>=1)xs.push({type:'preserve_fire',target:n.id,kind:'natural_fire'});
    }
    if(n.kind==='sharp_stone'&&n.d<=30&&n.stock>0){
      xs.push({type:'inspect_edge',target:n.id,kind:'sharp_stone'});
      xs.push({type:'gather',target:n.id,kind:'sharp_stone'});
    }
  }
  return dedupe(xs);
};

// These are consequences of interacting with a physical opportunity, not assigned objectives.
execute=function(A,P,a){
  if(a.type==='study_fire'){
    A.actions++;A.metrics.observe++;A.culture.actions[actionKey(a)]=(A.culture.actions[actionKey(a)]||0)+1;
    A.warmth=clamp(A.warmth+10,0,100);A.culture.knownKinds.add('natural_fire');A.lastOutcome=.45;return .45;
  }
  if(a.type==='preserve_fire'){
    A.actions++;A.metrics.innovation++;A.culture.actions[actionKey(a)]=(A.culture.actions[actionKey(a)]||0)+1;
    if(A.inventory.wood>=1){A.inventory.wood--;A.fire=1;E.innovations++;E.singularities.fire.adopted=true;if(!E.milestones.firstPreservedFire)E.milestones.firstPreservedFire={t:E.tick,id:A.id};log('한 사람이 자연불의 불씨를 꺼뜨리지 않고 옮겨 보존했다.');A.lastOutcome=1.5;return 1.5}return 0;
  }
  if(a.type==='inspect_edge'){
    A.actions++;A.metrics.observe++;A.culture.actions[actionKey(a)]=(A.culture.actions[actionKey(a)]||0)+1;
    A.culture.knownKinds.add('sharp_stone');A.lastOutcome=.5;return .5;
  }
  if(a.type==='gather'&&a.kind==='sharp_stone'){
    const n=E.nodes.find(n=>n.id===a.target);A.actions++;A.metrics.resource++;A.culture.actions[actionKey(a)]=(A.culture.actions[actionKey(a)]||0)+1;
    if(n&&n.stock>0){n.stock--;A.tool=1;E.innovations++;E.singularities.edge.adopted=true;if(!E.milestones.firstSharpTool)E.milestones.firstSharpTool={t:E.tick,id:A.id};log('한 사람이 자연 파쇄된 예리한 돌을 그대로 도구처럼 사용하기 시작했다.');A.lastOutcome=1.2;return 1.2}return 0;
  }
  return oldExecute(A,P,a);
};

homeostaticReflex=function(A){
  // Correct v0.3 physiological dead-zone: feeding can restore an adult above the reproduction threshold.
  if(A.water<23){const n=E.nodes.find(x=>x.kind==='water');if(n){if(dist(A,n)<30)A.water=clamp(A.water+30,0,100);else moveToward(A,n.x,n.y,8);A.metrics.bioReflex++;return true}}
  if(A.energy<24){if(A.inventory.food>0){A.inventory.food--;A.energy=clamp(A.energy+36,0,100);A.metrics.bioReflex++;return true}const n=E.nodes.filter(x=>x.kind==='food').sort((x,y)=>dist(A,x)-dist(A,y))[0];if(n){if(dist(A,n)<30&&n.stock>=1){n.stock-=1;A.energy=clamp(A.energy+36,0,100)}else moveToward(A,n.x,n.y,8);A.metrics.bioReflex++;return true}}
  if(A.warmth<13){const n=E.nodes.find(x=>x.kind==='shelter');if(n){if(dist(A,n)<30)A.warmth=clamp(A.warmth+10,0,100);else moveToward(A,n.x,n.y,7);A.metrics.bioReflex++;return true}}
  return false;
};

render=function(){oldRender();if(document.getElementById('singularityStatus'))return;const box=document.createElement('div');box.id='singularityStatus';box.className='foot';box.textContent='특이점은 정체 시 세계에 물리적 가능성으로만 출현하며, 사용법·가치·목표는 에이전트에게 전달되지 않는다.';document.querySelector('.app')?.appendChild(box);};

reset();render();
})();
