(function(){
function topologyEdges(S){return S?.realityFlowTopology?.edges||[]}

function structuralCrossings(S){
  const edges=topologyEdges(S);
  if(!edges.length)return[];
  let origin=edges[0].from;
  let extreme=origin;
  let dir=0;
  const out=[];
  for(const e of edges){
    const x=e.to;
    if(dir===0){
      if(x>origin){dir=1;extreme=x}
      else if(x<origin){dir=-1;extreme=x}
      continue;
    }
    if(dir===1){
      if(x>=extreme){extreme=x;continue}
      if(x<origin){
        const priorOrigin=origin,priorExtreme=extreme;
        out.push({t:e.t,source:e.source||null,fromDir:1,toDir:-1,anchor:priorOrigin,priorExtreme,at:x});
        dir=-1;origin=priorExtreme;extreme=x;
      }
    }else{
      if(x<=extreme){extreme=x;continue}
      if(x>origin){
        const priorOrigin=origin,priorExtreme=extreme;
        out.push({t:e.t,source:e.source||null,fromDir:-1,toDir:1,anchor:priorOrigin,priorExtreme,at:x});
        dir=1;origin=priorExtreme;extreme=x;
      }
    }
  }
  return out;
}

function firstDeparture(S){return structuralCrossings(S)[0]||null}

window.OASISFlowObservationAnchor={
  structuralCrossings,
  firstDeparture,
  principle:'observation anchor only: derive structural crossing from observed flow without granting authority'
};
})();
