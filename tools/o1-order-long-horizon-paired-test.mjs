const HORIZON=1_000_000;
const SEEDS=[17,43,101];
const PAIR_INTERVAL=100;
const PAIR_CREATION_END=100_000;
function mix32(x){x|=0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0}
function pick(seed,t,s,n){return mix32(seed^Math.imul(t+1,0x9e3779b1)^Math.imul(s+11,0x85ebca6b))%n}
function eventAt(seed,t){const actor=pick(seed,t,1,12);let other=pick(seed,t,2,12);if(other===actor)other=(other+1)%12;return [actor,other,pick(seed,t,3,12),pick(seed,t,4,8),pick(seed,t,5,3),pick(seed,t,6,64)]}
const fp=e=>e.join('/');
const rank=e=>((((((e[0]*12+e[1])*12+e[2])*8+e[3])*3+e[4])*64+e[5])>>>0);
function orderKey(a,b){return [b[0],a[1],b[2],a[3],b[4],a[5]].join('/')}
function erasedKey(a,b){let x=a,y=b;if(rank(x)>rank(y)){x=b;y=a}return orderKey(x,y)}
function median(xs){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function p90(xs){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);return a[Math.floor(.9*(a.length-1))]}
function run(seed,ordered=true){
  const index=new Map(), pairs=[];
  const add=(k,id,side)=>{if(!index.has(k))index.set(k,[]);index.get(k).push([id,side])};
  const snapshots={};
  for(let t=1;t<=HORIZON;t++){
    const e=eventAt(seed,t), keyNow=fp(e);
    if(t<=PAIR_CREATION_END && t%PAIR_INTERVAL===0){
      const a=eventAt(seed,t-1),b=e;
      const kab=ordered?orderKey(a,b):erasedKey(a,b);
      const kba=ordered?orderKey(b,a):erasedKey(b,a);
      const id=pairs.length;pairs.push({born:t,ab:null,ba:null,kab,kba});add(kab,id,'ab');add(kba,id,'ba');
    }
    for(const [id,side] of index.get(keyNow)||[]){const p=pairs[id];if(t<=p.born||p[side]!==null)continue;p[side]=t}
    if(t===10_000||t===100_000||t===1_000_000)snapshots[t]=summarize(pairs,t);
  }
  return {seed,ordered,snapshots,final:summarize(pairs,HORIZON)};
}
function summarize(pairs,t){
  let neither=0,abOnly=0,baOnly=0,both=0;const lats=[],divs=[],bothGaps=[];
  for(const p of pairs){if(p.born>t)continue;const ab=p.ab!==null&&p.ab<=t,ba=p.ba!==null&&p.ba<=t;if(ab&&ba){both++;if(p.ab!==p.ba){divs.push(Math.min(p.ab,p.ba)-p.born);bothGaps.push(Math.abs(p.ab-p.ba))}}else if(ab){abOnly++;divs.push(p.ab-p.born)}else if(ba){baOnly++;divs.push(p.ba-p.born)}else neither++;if(ab)lats.push(p.ab-p.born);if(ba)lats.push(p.ba-p.born)}
  const born=neither+abOnly+baOnly+both;
  return {bornPairs:born,neither,abOnly,baOnly,both,activatedAny:abOnly+baOnly+both,firstDivergencePairs:divs.length,firstDivergenceRate:born?divs.length/born:0,medianActivationLatency:median(lats),medianFirstDivergence:median(divs),p90FirstDivergence:p90(divs),bothActivatedDifferentTime:bothGaps.length,medianGapWhenBoth:median(bothGaps)};
}
for(const seed of SEEDS){const full=run(seed,true),control=run(seed,false);console.log(JSON.stringify({seed,full:full.final,control:control.final,snapshots:full.snapshots},null,2));if(control.final.firstDivergencePairs!==0)throw new Error('order-erased control diverged');}
