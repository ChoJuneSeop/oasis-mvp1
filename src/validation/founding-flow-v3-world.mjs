const clone = value => value == null ? value : structuredClone(value);

const SOURCE = 'founding-flow-world-v3';
const ACCESS = ['founder'];
const SIZE = 5;

function claimBase(id, kind, subjects, payload, time, temporality = 'persistent', op = 'assert') {
  return { id, kind, temporality, op, subjects, payload, source: SOURCE, observed_at: time, available_at: time, accessible_to: ACCESS };
}
function posClaim(entity, x, y, time) { return claimBase(`pos:${entity}`, 'fact', [entity], { x, y }, time); }
function typeClaim(entity, type, time) { return claimBase(`type:${entity}`, 'fact', [entity], { type }, time); }
function participantClaim(entity, roles, time) { return claimBase(`participant:${entity}`, 'participant_state', [entity], { roles, available: true }, time); }
function eventClaim(id, subjects, event, time, extra = {}) { return claimBase(id, 'event', subjects, { event, ...extra }, time, 'instant'); }
function relationClaim(id, from, to, kind, time, op = 'assert') { return claimBase(id, 'relation', [from, to], { from, to, kind }, time, 'persistent', op); }
function constraintClaim(id, subjects, payload, time, op = 'assert') { return claimBase(id, 'constraint', subjects, payload, time, 'persistent', op); }

export function actionKey(action) {
  if (!action) return 'none';
  if (action.op === 'step') return `step:${action.dx}:${action.dy}`;
  if (action.op === 'touch') return `touch:${action.target}`;
  return action.op;
}
function inside(x, y) { return x >= 0 && x < SIZE && y >= 0 && y < SIZE; }
function distance(a, b) { return Math.abs(a.x-b.x) + Math.abs(a.y-b.y); }

export class FoundingFlowV3World {
  constructor() { this.reset(); }
  reset() {
    this.tick = 0;
    this.positions = new Map([
      ['founder', {x:2,y:2}],
      ['resource-A', {x:0,y:0}],
      ['resource-B', {x:4,y:4}],
      ['marker-M', {x:4,y:0}],
      ['other-O', {x:0,y:4}]
    ]);
    this.types = new Map([
      ['founder','founder'],['resource-A','resource'],['resource-B','resource'],['marker-M','marker'],['other-O','other']
    ]);
    this.heldBy = new Map();
    this.contacts = new Set();
    this.marks = new Set();
    this.signals = new Set();
  }
  initialFrame() {
    const time = 't0';
    return { id:'founding-flow-v3:init', claims:[
      participantClaim('founder',['founder'],time), participantClaim('other-O',['other'],time),
      ...[...this.positions].map(([id,p])=>posClaim(id,p.x,p.y,time)),
      ...[...this.types].map(([id,t])=>typeClaim(id,t,time))
    ], meta:{phase:'initial',tick:0,world:'founding-flow-v3'} };
  }
  legalActions() {
    const founder = this.positions.get('founder');
    const actions=[];
    for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) if (inside(founder.x+dx,founder.y+dy)) actions.push({op:'step',dx,dy});
    for (const [id,p] of this.positions) if (id!=='founder' && distance(founder,p)<=1) actions.push({op:'touch',target:id});
    actions.push({op:'emit'},{op:'idle'});
    return actions;
  }
  _assertLegal(action) {
    const legal = new Set(this.legalActions().map(actionKey));
    if (!legal.has(actionKey(action))) throw new Error(`Illegal primitive action: ${actionKey(action)}`);
  }
  apply(action, proposalRecordId) {
    this._assertLegal(action); this.tick += 1;
    const time=`a${this.tick}`; const claims=[]; const founder=this.positions.get('founder');
    if (action.op==='step') {
      const next={x:founder.x+action.dx,y:founder.y+action.dy}; this.positions.set('founder',next); claims.push(posClaim('founder',next.x,next.y,time));
      for (const [entity,holder] of this.heldBy) if (holder==='founder') { this.positions.set(entity,clone(next)); claims.push(posClaim(entity,next.x,next.y,time)); }
      claims.push(eventClaim(`event:${time}:move`,['founder'],'moved',time,{dx:action.dx,dy:action.dy}));
    } else if (action.op==='touch') {
      const target=action.target; const type=this.types.get(target);
      if (type==='resource') {
        for (const [held,holder] of [...this.heldBy]) if (holder==='founder' && held!==target) {
          this.heldBy.delete(held); this.positions.set(held,clone(founder));
          claims.push(relationClaim(`holds:founder:${held}`,'founder',held,'holds',time,'retract'));
          claims.push(posClaim(held,founder.x,founder.y,time));
          claims.push(eventClaim(`event:${time}:release:${held}`,['founder',held],'released',time,{target:held}));
        }
        if (!this.heldBy.has(target)) {
          this.heldBy.set(target,'founder'); this.positions.set(target,clone(founder));
          claims.push(relationClaim(`holds:founder:${target}`,'founder',target,'holds',time));
        }
      } else if (type==='other') {
        const id=`contact:founder:${target}`;
        if (this.contacts.has(target)) { this.contacts.delete(target); claims.push(relationClaim(id,'founder',target,'contacted',time,'retract')); }
        else { this.contacts.add(target); claims.push(relationClaim(id,'founder',target,'contacted',time)); }
      } else if (type==='marker') {
        const id=`mark:founder:${target}`;
        if (this.marks.has(target)) { this.marks.delete(target); claims.push(relationClaim(id,'founder',target,'touched-marker',time,'retract')); }
        else { this.marks.add(target); claims.push(relationClaim(id,'founder',target,'touched-marker',time)); }
      }
      claims.push(eventClaim(`event:${time}:touch:${target}`,['founder',target],'touched',time,{target}));
    } else if (action.op==='emit') {
      const other=this.positions.get('other-O');
      if (other && distance(founder,other)<=2) {
        const id='signal:founder:other-O';
        if (!this.signals.has('other-O')) { this.signals.add('other-O'); claims.push(relationClaim(id,'founder','other-O','signaled',time)); }
      }
      claims.push(eventClaim(`event:${time}:emit`,['founder'],'emitted-signal',time));
    } else claims.push(eventClaim(`event:${time}:idle`,['founder'],'remained',time));
    return { id:`founding-flow-v3:actualization:${this.tick}`, claims, meta:{phase:'actualization',actualization:true,proposalRecordId,primitiveAction:clone(action),actionKey:actionKey(action),tick:this.tick,world:'founding-flow-v3'} };
  }
  exogenousFrame(index) {
    const n=index+1, time=`x${n}`, claims=[];
    const move=(id,x,y,label)=>{ this.positions.set(id,{x,y}); claims.push(posClaim(id,x,y,time)); claims.push(eventClaim(`event:${time}:${label}`,[id],label,time)); };
    if (n===1) move('other-O',2,3,'other-moved');
    else if (n===2) move('other-O',0,4,'other-moved');
    else if (n===3) { this.positions.set('resource-C',{x:1,y:2}); this.types.set('resource-C','resource'); claims.push(posClaim('resource-C',1,2,time),typeClaim('resource-C','resource',time),eventClaim('event:x3:new-resource',['resource-C'],'resource-appeared',time)); }
    else if (n===4) move('marker-M',2,1,'marker-moved');
    else if (n===5) move('marker-M',4,0,'marker-moved');
    else if (n===6) claims.push(constraintClaim('condition:light',['environment'],{condition:'light-changed'},time),eventClaim('event:x6:light',['environment'],'light-condition-changed',time));
    else if (n===7) { this.positions.set('resource-D',{x:3,y:2}); this.types.set('resource-D','resource'); claims.push(posClaim('resource-D',3,2,time),typeClaim('resource-D','resource',time),eventClaim('event:x7:new-resource',['resource-D'],'resource-appeared',time)); }
    else if (n===8) move('other-O',2,3,'other-moved');
    else if (n===9) claims.push(eventClaim('event:x9:other-signal',['other-O'],'other-emitted-signal',time));
    else if (n===10) claims.push(constraintClaim('condition:light',['environment'],{condition:'light-changed'},time,'retract'),constraintClaim('condition:temperature',['environment'],{condition:'temperature-changed'},time),eventClaim('event:x10:condition',['environment'],'environment-condition-shifted',time));
    else if (n===11) move('other-O',4,2,'other-moved');
    else throw new Error(`No exogenous frame ${n}`);
    return { id:`founding-flow-v3:exogenous:${n}`, claims, meta:{phase:'exogenous',index:n,tick:this.tick,world:'founding-flow-v3'} };
  }
  snapshotState() { return {tick:this.tick,positions:Object.fromEntries([...this.positions].map(([k,v])=>[k,clone(v)])),types:Object.fromEntries(this.types),heldBy:Object.fromEntries(this.heldBy),contacts:[...this.contacts],marks:[...this.marks],signals:[...this.signals]}; }
}
