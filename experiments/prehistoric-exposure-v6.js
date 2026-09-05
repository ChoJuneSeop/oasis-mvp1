(function(){
// v0.6 exposure layer: singularities enter actual living space, but their meaning/value is never injected.
const oldReset=reset,oldUpdateEnvironment=updateEnvironment,oldRender=render;
function chooseAnchor(tag){const xs=living();if(!xs.length)return null;const i=Math.floor(noise(tag)*xs.length);return xs[Math.max(0,Math.min(xs.length-1,i))]}
function placeNearLife(n,tag,minR,maxR){if(!n||n._exposed)return;const A=chooseAnchor(tag);if(!A)return;const ang=noise(tag+'a')*Math.PI*2,r=minR+noise(tag+'r')*(maxR-minR);n.x=clamp(A.x+Math.cos(ang)*r,30,W-30);n.y=clamp(A.y+Math.sin(ang)*r,30,H-30);n._exposed=true;n._exposedAt=E.tick}
function exposeNewSingularities(){
  const wf=E.nodes.find(n=>n.id==='wildfire'&&!n._exposed);if(wf){placeNearLife(wf,'fireExposure|'+(E.singularities?.fire?.attempts||0),55,105);E.exposure.fireOpportunities++;log('낙뢰가 현재 생활권과 멀지 않은 곳에 자연불을 만들었다.')}
  const sf=E.nodes.find(n=>n.id==='sharpflake'&&!n._exposed);if(sf){placeNearLife(sf,'edgeExposure',90,155);E.exposure.edgeOpportunities++;log('자연 파쇄된 예리한 돌이 사람들이 오가는 경계에서 드러났다.')}
  const qs=E.nodes.find(n=>n.id==='qualitystone'&&!n._exposed);if(qs){placeNearLife(qs,'qualityExposure',120,175);E.exposure.qualityOpportunities++;log('성질이 다른 석재 노두가 현재 이동권의 가장자리에서 노출되었다.')}
  const oc=E.nodes.find(n=>n.id==='ochre'&&!n._exposed);if(oc){placeNearLife(oc,'pigmentExposure',120,175);E.exposure.pigmentOpportunities++;log('붉은 광물층이 현재 이동권의 가장자리에서 노출되었다.')}
}
function passiveFirePhysics(){
  const fires=E.nodes.filter(n=>n.kind==='natural_fire'||n.kind==='hearth');
  for(const A of living()){
    if(A.inventory.rawMeat==null)A.inventory.rawMeat=0;if(A.inventory.cookedMeat==null)A.inventory.cookedMeat=0;
    const near=fires.some(f=>dist(A,f)<=42);A._heatExposure=near?(A._heatExposure||0)+1:0;
    if(near){A.warmth=clamp(A.warmth+.045,0,100);E.exposure.firePersonTicks++}
    if(near&&A.inventory.rawMeat>0&&A._heatExposure>=7){A.inventory.rawMeat--;A.inventory.cookedMeat++;A._heatExposure=0;E.exposure.accidentalCooking++;if(E.milestones&&!E.milestones.firstCookedMeat)E.milestones.firstCookedMeat={t:E.tick,id:A.id,mode:'passive_heat'};log('한 사람이 들고 있던 생고기가 불 가까이 오래 노출되어 익은 상태로 변했다.')}
  }
}
reset=function(){oldReset();E.exposure={fireOpportunities:0,edgeOpportunities:0,qualityOpportunities:0,pigmentOpportunities:0,firePersonTicks:0,accidentalCooking:0};log('v0.6: 특이점은 실제 생활권과 접촉 가능한 위치에 나타나지만 사용법은 제공되지 않는다.')}
updateEnvironment=function(){oldUpdateEnvironment();exposeNewSingularities();passiveFirePhysics()}
render=function(){oldRender();let b=document.getElementById('exposureStatus');if(!b){b=document.createElement('div');b.id='exposureStatus';b.className='foot';document.querySelector('.app')?.appendChild(b)}const x=E.exposure||{};b.textContent='특이점 접촉: 자연불 '+(x.fireOpportunities||0)+' · 예리한 돌 '+(x.edgeOpportunities||0)+' · 희귀석재 '+(x.qualityOpportunities||0)+' · 안료 '+(x.pigmentOpportunities||0)+' · 우연 조리 '+(x.accidentalCooking||0)}
reset();render();
})();
