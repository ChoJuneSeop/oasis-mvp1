function execute(A,P,a){
 const before={e:A.energy,w:A.water,t:A.warmth,h:A.health},key=actionKey(a);A.actions++;A.metrics[a.type==='interact'||a.type==='share'?'social':a.type==='rest'?'rest':a.type==='observe'?'observe':a.type==='move'?'move':['forage','drink','gather','hunt'].includes(a.type)?'resource':['craft','fire'].includes(a.type)?'innovation':'observe']++;A.culture.actions[key]=(A.culture.actions[key]||0)+1;let out=0;
 if(a.type==='observe'){for(const n of P.nearNodes){A.known.add(n.id);A.culture.knownKinds.add(n.kind)}out=.3}
 if(a.type==='move'){if(a.target?.startsWith('agent:')){const B=E.people[a.target.slice(6)];if(B&&B.alive)moveToward(A,B.x,B.y)}else if(a.target?.startsWith('dir:'))moveToward(A,a.x,a.y);else{const n=E.nodes.find(n=>n.id===a.target);if(n)moveToward(A,n.x,n.y)}out=.1}
 if(a.type==='forage'){const n=E.nodes.find(n=>n.id===a.target);if(n&&n.stock>=1){n.stock-=1;A.inventory.food++;A.energy=clamp(A.energy+14,0,100);out=1}}
 if(a.type==='drink'){A.water=clamp(A.water+28,0,100);out=1}
 if(a.type==='gather'){const n=E.nodes.find(n=>n.id===a.target);if(n&&n.stock>=1){n.stock-=1;A.inventory[a.kind]++;out=.7}}
 if(a.type==='rest'){A.energy=clamp(A.energy+13,0,100);A.warmth=clamp(A.warmth+7,0,100);out=.7}
 if(a.type==='craft'){A.inventory.stone-=2;A.inventory.wood-=1;A.tool=1;E.innovations++;out=1.4;log('누군가 돌과 나무를 결합해 도구를 만들었다.')}
 if(a.type==='fire'){A.inventory.wood-=2;A.inventory.stone-=1;A.fire=1;A.warmth=clamp(A.warmth+22,0,100);E.innovations++;out=1.4;log('누군가 불을 안정적으로 사용했다.')}
 if(a.type==='hunt'){const n=E.nodes.find(n=>n.id===a.target);if(n&&n.stock>=1&&A.tool){n.stock-=1;A.energy=clamp(A.energy+24,0,100);A.inventory.food++;out=1.2}}
 if(a.type==='interact'){const B=E.people[a.target];if(B&&B.alive){relation(A,B,.08);learnCulture(A,B);out=.55}}
 if(a.type==='share'){const B=E.people[a.target];if(B&&B.alive){let shared=0;for(const k of ['food','wood','stone'])if(A.inventory[k]>0){A.inventory[k]--;B.inventory[k]++;shared++;break}relation(A,B,.12);learnCulture(B,A);out=.6+shared*.3}}
 if(a.type==='wait')out=0;
 if(A.controller==='q'&&A.lastPerception){const st=stateKey(A.lastPerception),qk=st+'|'+key,reward=((A.energy-before.e)+(A.water-before.w)+(A.warmth-before.t)+(A.health-before.h))/30;A.q[qk]=(A.q[qk]??0)+.22*(reward-(A.q[qk]??0));out+=reward}
 if(A.controller==='retrieval')A.memory.push({ctx:contextVector(P),action:key,outcome:out});
 if(A.controller==='oasis'){
   const context=['weather:'+P.weather,...P.nearNodes.map(n=>'node:'+n.kind),...P.nearAgents.map(n=>'agent:'+n.id)];
   A.relationEpisodes.push({t:E.tick,action:key,context:[...new Set(context)],outcome:out});A.relationEpisodes=A.relationEpisodes.slice(-160);
 }
 A.lastOutcome=out;return out;
}
function bodyFlow(A){
 // 생리적 항상성은 의사결정 모델의 목표가 아니라 모든 인간에게 동일한 신체 과정으로 둔다.
 const river=E.nodes.find(n=>n.kind==='water'),cave=E.nodes.find(n=>n.kind==='shelter');
 if(A.water<24&&river&&dist(A,river)<38)A.water=clamp(A.water+18,0,100);
 if(A.energy<24&&A.inventory.food>0){A.inventory.food--;A.energy=clamp(A.energy+20,0,100)}
 if(A.warmth<18&&cave&&dist(A,cave)<38)A.warmth=clamp(A.warmth+8,0,100);
 A.energy-=.028;A.water-=.034;A.warmth+=E.temp<.25?-.045:E.temp>.8?-.018:.014;if(A.fire)A.warmth+=.03;A.energy=clamp(A.energy,0,100);A.water=clamp(A.water,0,100);A.warmth=clamp(A.warmth,0,100);
 const stress=(A.energy<8?1:0)+(A.water<7?1.5:0)+(A.warmth<6?1:0);if(stress)A.health-=stress*.055;else if(A.health<100&&A.energy>40&&A.water>40)A.health+=.05;A.health=clamp(A.health,0,100);
 if(A.birthCooldown>0)A.birthCooldown--;
 const oldAge=!A.founder&&(E.tick-A.age)>A.lifeLimit;
 if(A.health<=0||oldAge){if(A.founder){A.health=28;A.energy=35;A.water=35;A.warmth=35;A.recoveryUntil=E.tick+55;log('한 사람이 심각한 쇠약 뒤 회복기에 들어갔다.');}else{A.alive=0;E.deaths++;log('한 사람이 생애를 마쳤다.');}}
}
function passiveCoPresence(){const xs=living();for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++){const A=xs[i],B=xs[j];if(dist(A,B)<24){A.relations[B.id]=clamp((A.relations[B.id]||0)+.004,0,1);B.relations[A.id]=clamp((B.relations[A.id]||0)+.004,0,1)}}}
function closeKin(A,B){if(A.parents.includes(B.id)||B.parents.includes(A.id))return true;return A.parents.some(p=>B.parents.includes(p))}
function reproduction(){
 if(living().length>=MAX_POP)return;
 const adults=living().filter(a=>E.tick-a.age>240&&a.birthCooldown<=0&&a.health>55&&a.energy>48&&a.water>48);
 for(let i=0;i<adults.length;i++)for(let j=i+1;j<adults.length;j++){
   const A=adults[i],B=adults[j];if(A.sex===B.sex||dist(A,B)>30||closeKin(A,B))continue;const bond=Math.min(A.relations[B.id]||0,B.relations[A.id]||0);if(bond<.10)continue;
   const p=.0042*(.45+bond)*(A.health+B.health)/200;if(noise('birth|'+A.id+'|'+B.id+'|'+Math.floor(E.tick/5))<p){
     const id=String(E.nextId++),C=mkPerson(id,(A.x+B.x)/2+((noise('bx|'+id)-.5)*16),(A.y+B.y)/2+((noise('by|'+id)-.5)*16),'human',false,Math.max(A.generation,B.generation)+1,[A.id,B.id]);C.traits=childTraits(A,B,id);C.energy=58;C.water=58;C.health=100;
     for(const k of new Set([...A.culture.knownKinds,...B.culture.knownKinds]))if(noise('inheritCulture|'+id+'|'+k)<.35)C.culture.knownKinds.add(k);
     const merged={...A.culture.actions};for(const [k,v] of Object.entries(B.culture.actions))merged[k]=(merged[k]||0)+v;for(const [k,v] of Object.entries(merged))if(noise('imitAction|'+id+'|'+k)<.18)C.culture.actions[k]=Math.min(3,v);
     E.people[id]=C;E.maxGeneration=Math.max(E.maxGeneration,C.generation);A.birthCooldown=B.birthCooldown=320;A.metrics.births++;B.metrics.births++;E.births++;log('새로운 아이가 태어났다. 부모의 숨은 모델 라벨은 전달되지 않았다.');if(living().length>=MAX_POP)return;
   }
 }
}
function homeostaticReflex(A){
  // 관찰자/모델의 목표가 아니라 인간 신체의 공통 비의사결정 반사층.
  if(A.water<23){const n=E.nodes.find(x=>x.kind==='water');if(n){if(dist(A,n)<30)A.water=clamp(A.water+30,0,100);else moveToward(A,n.x,n.y,8);A.metrics.bioReflex++;return true}}
  if(A.energy<21){if(A.inventory.food>0){A.inventory.food--;A.energy=clamp(A.energy+22,0,100);A.metrics.bioReflex++;return true}const n=E.nodes.filter(x=>x.kind==='food').sort((x,y)=>dist(A,x)-dist(A,y))[0];if(n){if(dist(A,n)<30&&n.stock>=1){n.stock-=1;A.energy=clamp(A.energy+18,0,100)}else moveToward(A,n.x,n.y,8);A.metrics.bioReflex++;return true}}
  if(A.warmth<13){const n=E.nodes.find(x=>x.kind==='shelter');if(n){if(dist(A,n)<30)A.warmth=clamp(A.warmth+10,0,100);else moveToward(A,n.x,n.y,7);A.metrics.bioReflex++;return true}}
  return false;
}
function stepPerson(A){if(!A.alive||E.tick<A.recoveryUntil)return;if(homeostaticReflex(A)){bodyFlow(A);return}const P=perception(A),as=acts(A,P),d=decide(A,P,as);if(!d||!d.a)return;execute(A,P,d.a);A.lastAction=d.a.type;A.lastWhy=d.why;A.lastPerception=P;bodyFlow(A)}
function tick(n=1){while(n--){E.tick++;updateEnvironment();for(const A of [...living()])stepPerson(A);passiveCoPresence();reproduction();}render()}
function topAction(A){const xs=Object.entries(A.culture.actions).sort((a,b)=>b[1]-a[1]);return xs[0]?.[0]||'-'}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#173326';ctx.fillRect(0,0,W,H);for(const n of E.nodes){ctx.fillStyle=n.kind==='water'?'#78b7c8':n.kind==='food'?'#9fc77d':n.kind==='animal'?'#d7b27d':'#b9b4a5';ctx.beginPath();ctx.arc(n.x,n.y,9,0,TAU);ctx.fill();ctx.fillStyle='#eaf3ec';ctx.font='11px sans-serif';ctx.fillText(n.label,n.x+12,n.y+4)}for(const A of living()){const isF=A.founder;ctx.fillStyle=isF?(FOUNDERS[A.id]?.color||'#fff'):'#d8e1dc';ctx.beginPath();ctx.arc(A.x,A.y,isF?6:4,0,TAU);ctx.fill();if(A.id===focus){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(A.x,A.y,10,0,TAU);ctx.stroke()}}}
function render(){const pop=living(),maxGen=E.maxGeneration;$('tick').textContent=E.tick;$('pop').textContent=pop.length;$('births').textContent=E.births;$('deaths').textContent=E.deaths;$('generations').textContent=maxGen;$('relations').textContent=E.relations;$('innovations').textContent=E.innovations;
 const fids=Object.keys(FOUNDERS);$('focus').innerHTML=[...fids,...pop.filter(a=>!a.founder).slice(0,40).map(a=>a.id)].map(id=>{const A=E.people[id];return `<option value="${id}" ${id===focus?'selected':''}>${A?.observerLabel||id}</option>`}).join('');
 $('founders').innerHTML=fids.map(id=>{const A=E.people[id],d=FOUNDERS[id];return `<div class="founder ${id===focus?'on':''}" data-id="${id}"><h3>${d.label}</h3><div class="tag">세계 내부 라벨: 사람</div><div class="mini">행동 ${A.actions} · 관계사용 ${A.metrics.relationUse}<br>자녀 ${A.metrics.births} · 최빈 ${topAction(A)}<br>${E.tick<A.recoveryUntil?'회복 중':'활동 중'}</div></div>`}).join('');document.querySelectorAll('.founder').forEach(x=>x.onclick=()=>{focus=x.dataset.id;render()});
 $('metrics').innerHTML='<tr><th>관찰대상</th><th>행동</th><th>이동</th><th>사회</th><th>자원</th><th>혁신</th><th>기억</th><th>관계활성</th></tr>'+fids.map(id=>{const A=E.people[id],m=A.metrics;return `<tr><td>${FOUNDERS[id].label}</td><td>${A.actions}</td><td>${m.move}</td><td>${m.social}</td><td>${m.resource}</td><td>${m.innovation}</td><td>${m.memoryUse}</td><td>${m.relationUse}</td></tr>`}).join('');
 const A=E.people[focus]||E.people.oasis;if(A){const P=A.alive&&E.tick>=A.recoveryUntil?perception(A):null;$('explain').innerHTML=`<b>${A.observerLabel}</b> ${A.founder?'(관찰자만 시조임을 앎)':'(일반 인간)'}<br>세계 내부 자기표상: 사람<br>세대 ${A.generation} · 부모 ${A.parents.length?A.parents.map(()=> '사람').join(', '):'없음'}<br>현재 행동: ${ACTION_LABEL[A.lastAction]||A.lastAction||'-'}<br>내부 근거: ${A.lastWhy}<br>에너지 ${A.energy.toFixed(1)} · 물 ${A.water.toFixed(1)} · 건강 ${A.health.toFixed(1)}<br>관계 수 ${Object.keys(A.relations).length} · 문화 행동형 ${Object.keys(A.culture.actions).length}${P?`<br>현재 주변 사람 ${P.nearAgents.length} · 주변 자원 ${P.nearNodes.length}`:''}`}
 $('log').innerHTML=E.log.slice(0,50).map(x=>`<div>[${x.t}] ${x.msg}</div>`).join('');$('legend').innerHTML='큰 색 점 = 관찰자에게만 보이는 시조 표시 · 작은 흰 점 = 일반 인간 · 세계 내부 에이전트들은 이 표시를 볼 수 없음 · 인구 계산은 회복 중 시조를 제외한 현재 활동 인원';draw();}
$('focus').onchange=e=>{focus=e.target.value;render()};$('toggle').onclick=()=>{E.paused=!E.paused;$('toggle').textContent=E.paused?'재생':'일시정지'};$('step').onclick=()=>tick(1);$('run100').onclick=()=>tick(100);$('run1000').onclick=()=>tick(1000);$('run10000').onclick=()=>tick(10000);$('reset').onclick=reset;$('speed').onchange=start;
function start(){clearInterval(timer);timer=setInterval(()=>{if(!E.paused)tick(1)},+$('speed').value)}reset();start();
