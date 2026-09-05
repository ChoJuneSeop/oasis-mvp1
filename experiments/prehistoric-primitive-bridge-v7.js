(function(){
// v0.7 primitive-affordance bridge.
// Historical singularities are expressed only through action primitives already present in every controller:
// observe, move, forage, gather, rest, interact, share, craft, hunt, wait.
const oldReset=reset,oldActs=acts,oldExecute=execute,oldUpdateEnvironment=updateEnvironment,oldRender=render;
const PRIMITIVES=new Set(['observe','move','forage','drink','gather','rest','interact','share','craft','fire','hunt','wait']);
function ensureLateState(A){if(!A.late)A.late={qualityStone:0,pigment:0,bone:0,advancedTool:0,boneTool:0,rareOrigins:{},lastCoopSuccess:A.metrics.coopSuccess||0};return A.late}
function livingAnchor(tag){const xs=living();if(!xs.length)return null;return xs[Math.floor(noise(tag)*xs.length)%xs.length]}
function exposeClose(node,tag,r=24){const A=livingAnchor(tag);if(!node||!A)return;const ang=noise(tag+'|a')*Math.PI*2,rr=8+noise(tag+'|r')*(r-8);node.x=clamp(A.x+Math.cos(ang)*rr,20,W-20);node.y=clamp(A.y+Math.sin(ang)*rr,20,H-20)}
function pairKey(a,b){return [String(a),String(b)].sort().join('|')}
function markCulture(A,k){A.culture.actions[k]=(A.culture.actions[k]||0)+1}
function makeHearth(A){if(A.ember!==1)return false;const id='hearth:'+A.id+':'+E.tick;E.nodes.push({id,kind:'hearth',x:A.x,y:A.y,stock:999,max:999,regen:0,label:'이어진 불씨',owner:A.id});A.ember=0;A.fire=1;E.innovations++;if(!E.milestones.firstPreservedFire)E.milestones.firstPreservedFire={t:E.tick,id:A.id,hearth:id,mode:'smolder_to_camp'};log('불 가까이 있던 마른 재료의 불씨가 이동 뒤 머문 자리에서도 이어졌다.');return true}
function firstRaw(id){if(!E.milestones.firstRawMeat)E.milestones.firstRawMeat={t:E.tick,id,mode:'carcass_or_hunt'}}
function spawnCarcass(){if(E.nodes.some(n=>n.kind==='carcass'))return;const A=livingAnchor('carcass|'+E.tick);if(!A)return;const id='carcass:'+E.tick;E.nodes.push({id,kind:'carcass',x:clamp(A.x+10,20,W-20),y:clamp(A.y-8,20,H-20),stock:5,max:5,regen:0,label:'죽은 짐승의 사체',expires:E.tick+900});E.primitiveWorld.carcassOpportunities++;log('사람들이 오가는 곳 가까이에 죽은 짐승의 사체가 남았다.')}
function reExpose(){
 const M=E.milestones||{},L=E.lateMilestones||{};
 const sf=E.nodes.find(n=>n.id==='sharpflake');if(sf&&!M.firstSharpTool&&E.tick>=E.primitiveWorld.nextEdge){exposeClose(sf,'edge|'+E.primitiveWorld.edgeAttempts,24);E.primitiveWorld.edgeAttempts++;E.primitiveWorld.nextEdge=E.tick+2600;log('침식과 이동으로 예리한 돌 조각이 다시 생활 동선 가까이에 드러났다.')}
 const qs=E.nodes.find(n=>n.id==='qualitystone');if(qs&&!L.firstCompositeTool&&E.tick>=E.primitiveWorld.nextQuality){exposeClose(qs,'quality|'+E.primitiveWorld.qualityAttempts,28);E.primitiveWorld.qualityAttempts++;E.primitiveWorld.nextQuality=E.tick+3500;log('성질이 다른 석재가 다시 생활 동선 가까이에 노출되었다.')}
 const oc=E.nodes.find(n=>n.id==='ochre');if(oc&&!L.firstMark&&E.tick>=E.primitiveWorld.nextPigment){exposeClose(oc,'pigment|'+E.primitiveWorld.pigmentAttempts,28);E.primitiveWorld.pigmentAttempts++;E.primitiveWorld.nextPigment=E.tick+3500;log('붉은 광물이 다시 생활 동선 가까이에 노출되었다.')}
 if(!M.firstRawMeat&&E.tick>=E.primitiveWorld.nextCarcass){spawnCarcass();E.primitiveWorld.nextCarcass=E.tick+4800}
}
function firePhysics(){
 const fires=E.nodes.filter(n=>n.kind==='natural_fire'||n.kind==='hearth');
 for(const A of living()){
   const near=fires.some(f=>dist(A,f)<=40);A._emberTicks=near&&A.inventory.wood>0?(A._emberTicks||0)+1:0;
   if(A._emberTicks>=12&&A.ember!==1){A.ember=1;A._emberTicks=0;E.primitiveWorld.emberTransfers++;log('불 가까이에 있던 마른 재료 일부가 완전히 꺼지지 않은 채 옮겨질 수 있는 상태가 되었다.')}
 }
}
function convertAction(a){
 if(PRIMITIVES.has(a.type))return a;
 if(a.type==='gather_quality')return{type:'gather',target:a.target,kind:'quality_stone'};
 if(a.type==='gather_pigment')return{type:'gather',target:a.target,kind:'pigment'};
 if(a.type==='combine_stone_wood')return{type:'craft',kind:'quality_composite'};
 if(a.type==='shape_bone')return{type:'craft',kind:'bone'};
 if(a.type==='observe_mark')return{type:'observe',target:a.target,kind:'mark'};
 if(a.type==='study_fire'||a.type==='inspect_edge')return{type:'observe',target:a.target,kind:a.kind};
 if(a.type==='transfer_rare')return{type:'share',target:a.target,kind:'rare'};
 return null
}
reset=function(){oldReset();E.primitiveWorld={edgeAttempts:0,qualityAttempts:0,pigmentAttempts:0,carcassOpportunities:0,emberTransfers:0,nextEdge:6500,nextQuality:9000,nextPigment:12000,nextCarcass:1800,socialCoord:{},coopHunts:0,coopSuccess:0};for(const A of Object.values(E.people)){A.ember=0;ensureLateState(A)};log('v0.7: 역사적 특이점은 기존 행동 프리미티브만으로 접촉·변형되도록 전환했다.')}
acts=function(A,P){const xs=oldActs(A,P),out=[];for(const a of xs){const b=convertAction(a);if(b)out.push(b)}for(const n of P.nearNodes)if(n.kind==='carcass'&&n.d<=30&&n.stock>0)out.push({type:'forage',target:n.id,kind:'carcass'});return dedupe(out)}
updateEnvironment=function(){oldUpdateEnvironment();for(const n of E.nodes.filter(n=>n.kind==='carcass'&&n.expires&&E.tick>n.expires))n.stock=0;E.nodes=E.nodes.filter(n=>n.kind!=='carcass'||n.stock>0);reExpose();firePhysics()}
function gatherSpecial(A,a){const n=E.nodes.find(n=>n.id===a.target),L=ensureLateState(A);A.actions++;A.metrics.resource++;markCulture(A,actionKey(a));if(!n||n.stock<=0)return 0;n.stock--;if(a.kind==='quality_stone'){L.qualityStone++;L.rareOrigins.qualityStone={x:n.x,y:n.y,id:n.id};A.lastOutcome=.45;return .45}if(a.kind==='pigment'){L.pigment++;L.rareOrigins.pigment={x:n.x,y:n.y,id:n.id};A.lastOutcome=.15;return .15}return null}
function craftSpecial(A,a){const L=ensureLateState(A);A.actions++;A.metrics.innovation++;markCulture(A,actionKey(a));if(a.kind==='bone'&&L.bone>0&&A.tool){L.bone--;L.boneTool=1;E.innovations++;if(!E.lateMilestones.firstBoneTool)E.lateMilestones.firstBoneTool={t:E.tick,id:A.id,mode:'primitive_craft'};log('사냥 부산물의 뼈가 기존 제작 행동 속에서 도구 형태로 바뀌었다.');A.lastOutcome=1;return 1}if(a.kind==='quality_composite'&&L.qualityStone>0&&A.inventory.wood>0&&A.tool){L.qualityStone--;A.inventory.wood--;L.advancedTool=1;A.tool=2;E.innovations++;if(!E.lateMilestones.firstCompositeTool)E.lateMilestones.firstCompositeTool={t:E.tick,id:A.id,mode:'primitive_craft'};log('서로 다른 재료가 기존 제작 행동 속에서 복합 도구로 결합되었다.');A.lastOutcome=1.25;return 1.25}return 0}
function maybeMark(A,a){const L=ensureLateState(A);if(L.pigment<=0||a.type!=='rest')return;const surface=E.nodes.find(n=>(n.kind==='shelter'||n.kind==='hearth')&&dist(A,n)<=38);if(!surface)return;L.pigment--;const id='mark:'+E.tick+':'+A.id;E.nodes.push({id,kind:'mark_site',x:A.x,y:A.y,stock:999,max:999,regen:0,label:'표면에 남은 붉은 흔적',maker:A.id});E.lateWorld.marks++;if(!E.lateMilestones.firstMark)E.lateMilestones.firstMark={t:E.tick,id:A.id,site:id,mode:'pigment_contact_during_rest'};log('붉은 광물을 지닌 사람이 머문 표면에 반복해서 볼 수 있는 흔적이 남았다.')}
function observeMark(A,a){if(a.type!=='observe'||a.kind!=='mark')return false;A.actions++;A.metrics.observe++;markCulture(A,'observe:mark');A.culture.knownKinds.add('persistent_mark');if(!E.lateMilestones.firstMarkObserved)E.lateMilestones.firstMarkObserved={t:E.tick,id:A.id,site:a.target};A.lastOutcome=.2;return true}
function forageCarcass(A,a){if(a.type!=='forage'||a.kind!=='carcass')return null;const n=E.nodes.find(n=>n.id===a.target);A.actions++;A.metrics.resource++;markCulture(A,'forage:carcass');if(n&&n.stock>0){n.stock--;A.inventory.rawMeat=(A.inventory.rawMeat||0)+1;firstRaw(A.id);A.lastOutcome=.65;return .65}return 0}
function socialCoord(A,a){if(a.type!=='interact'||!a.target)return;E.primitiveWorld.socialCoord[pairKey(A.id,a.target)]=E.tick}
function coopAfterHunt(A,a,out){if(a.type!=='hunt'||out<=0)return;const animal=E.nodes.find(n=>n.id===a.target);if(!animal)return;const ps=living().filter(B=>B.id!==A.id&&B.tool&&dist(B,animal)<=65&&E.tick-(E.primitiveWorld.socialCoord[pairKey(A.id,B.id)]??-9999)<=80);if(!ps.length)return;const group=[A,...ps];E.primitiveWorld.coopHunts++;E.primitiveWorld.coopSuccess++;for(const B of ps){B.inventory.rawMeat=(B.inventory.rawMeat||0)+1;firstRaw(B.id);B.metrics.coopSuccess=(B.metrics.coopSuccess||0)+1;markCulture(B,'coop_hunt');relation(A,B,.04)}A.metrics.coopSuccess=(A.metrics.coopSuccess||0)+1;markCulture(A,'coop_hunt');if(!E.milestones.firstCoopHuntSuccess)E.milestones.firstCoopHuntSuccess={t:E.tick,leader:A.id,participants:group.map(x=>x.id),mode:'recent_interaction_plus_shared_hunt'};log(`${group.length}명이 최근의 상호작용 뒤 같은 사냥감 주변에서 협동 결과를 만들었다.`)}
execute=function(A,P,a){
 if(a.type==='gather'&&(a.kind==='quality_stone'||a.kind==='pigment'))return gatherSpecial(A,a);
 if(a.type==='craft'&&(a.kind==='bone'||a.kind==='quality_composite'))return craftSpecial(A,a);
 if(observeMark(A,a))return .2;
 const carr=forageCarcass(A,a);if(carr!==null)return carr;
 const out=oldExecute(A,P,a);socialCoord(A,a);maybeMark(A,a);if(a.type==='rest'&&A.ember===1&&!P.nearNodes.some(n=>n.kind==='natural_fire'||n.kind==='hearth'))makeHearth(A);coopAfterHunt(A,a,out);return out
}
render=function(){oldRender();let b=document.getElementById('primitiveV7');if(!b){b=document.createElement('div');b.id='primitiveV7';b.className='foot';document.querySelector('.app')?.appendChild(b)}const x=E.primitiveWorld||{};b.textContent='v0.7 프리미티브: 예리한 돌 재노출 '+(x.edgeAttempts||0)+' · 희귀석재 '+(x.qualityAttempts||0)+' · 안료 '+(x.pigmentAttempts||0)+' · 사체 '+(x.carcassOpportunities||0)+' · 옮겨진 불씨 '+(x.emberTransfers||0)+' · 협동결과 '+(x.coopSuccess||0)}
reset();render();
})();
