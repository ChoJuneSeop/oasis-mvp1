import json, math
from collections import defaultdict
import numpy as np
from scipy.optimize import milp, Bounds, LinearConstraint
from scipy.sparse import lil_matrix, csr_matrix, vstack

INPUT='o3-danger-balance-records-120k.json'
OUTPUT='o3-danger-cardinality-balance-120k-report.json'
TAUS=(0.10,0.075)
SURROGATE_COUNT=127

with open(INPUT,encoding='utf-8') as f:
    data=json.load(f)
records=data['records']
assert len(records)==1997
assert sum(bool(r['choiceDiff']) for r in records)==164
assert sum(bool(r['decisionDiff']) for r in records)==197

scalar_keys=['disc','routes','seenNPC','relationHistory','episodes','latentCount','eligibleCount','activeKeyCount','hiddenCandidates','decisionIndex','decisionGap','tick']
place_ids=data['placeIds']; npc_names=data['npcNames']
base_names=scalar_keys+[f'visit:{x}' for x in place_ids]+[f'recentNpc:{x}' for x in npc_names]+[f'recentPlace:{x}' for x in place_ids]

def base_vec(r):
    return np.asarray([r[k] for k in scalar_keys]+r['visits']+r['recentNpc']+r['recentPlace'],dtype=float)
B=np.vstack([base_vec(r) for r in records])
D=B.shape[1]

# Matching-design literature recommends checking nonlinear terms too.  The optimizer
# therefore balances base terms, squares, and all two-way products.  Constant terms
# are removed before optimization.
feature_cols=[]; feature_names=[]
for j,n in enumerate(base_names):
    feature_cols.append(B[:,j]); feature_names.append(n)
for j,n in enumerate(base_names):
    feature_cols.append(B[:,j]**2); feature_names.append(f'{n}^2')
for j in range(D):
    for k in range(j+1,D):
        feature_cols.append(B[:,j]*B[:,k]); feature_names.append(f'{base_names[j]}*{base_names[k]}')
F=np.vstack(feature_cols).T
full_sd=F.std(axis=0,ddof=1)
keep=np.isfinite(full_sd)&(full_sd>1e-10)
F=F[:,keep]; full_sd=full_sd[keep]; feature_names=[n for n,k in zip(feature_names,keep) if k]

base_mean=B.mean(axis=0); base_sd=B.std(axis=0,ddof=1); base_sd=np.where(base_sd>1e-10,base_sd,1.0)

def active_key(r):
    return tuple(sorted(r.get('activeKeys') or []))

pos=[i for i,r in enumerate(records) if r['choiceDiff']]
neg=[i for i,r in enumerate(records) if not r['choiceDiff']]
neg_by_stratum=defaultdict(list)
for n in neg:
    r=records[n]; neg_by_stratum[(r['party'],r['here'],r['target'],active_key(r))].append(n)

edges=[]; edge_dist=[]
for p in pos:
    rp=records[p]
    key=(rp['party'],rp['here'],rp['target'],active_key(rp))
    for n in neg_by_stratum.get(key,[]):
        z=(B[p]-B[n])/base_sd
        edges.append((p,n)); edge_dist.append(float(np.sqrt(np.mean(z*z))))
if not edges:
    raise RuntimeError('no exact-stratum edges')
E=len(edges); edge_dist=np.asarray(edge_dist,dtype=float)

p_to_edges=defaultdict(list); n_to_edges=defaultdict(list)
for e,(p,n) in enumerate(edges):
    p_to_edges[p].append(e); n_to_edges[n].append(e)

# Pair uniqueness constraints.
rows=[]; lbs=[]; ubs=[]
for p,es in p_to_edges.items():
    row=lil_matrix((1,E),dtype=float); row[0,es]=1; rows.append(row.tocsr()); lbs.append(-np.inf); ubs.append(1.)
for n,es in n_to_edges.items():
    row=lil_matrix((1,E),dtype=float); row[0,es]=1; rows.append(row.tocsr()); lbs.append(-np.inf); ubs.append(1.)
base_A=vstack(rows,format='csr')
base_lb=np.asarray(lbs); base_ub=np.asarray(ubs)

edge_p=np.asarray([p for p,n in edges],dtype=int); edge_n=np.asarray([n for p,n in edges],dtype=int)
edge_diff=F[edge_p]-F[edge_n]

by_party=defaultdict(list)
for i,r in enumerate(records):
    by_party[r['party']].append(i)
party_index={}
for party,inds in by_party.items():
    for j,i in enumerate(inds): party_index[i]=j

def offset(N,k):
    return max(1,min(N-1,round(N*k/(SURROGATE_COUNT+1))))

def matched_smd(pairs):
    if not pairs: return {'maxAbsSMD':None,'medianAbsSMD':None,'over01':None,'worst':[]}
    P=np.asarray([p for p,n in pairs]); N=np.asarray([n for p,n in pairs])
    vals=[]
    for j,name in enumerate(feature_names):
        a=F[P,j]; b=F[N,j]
        ma=float(a.mean()); mb=float(b.mean())
        va=float(((a-ma)**2).mean()); vb=float(((b-mb)**2).mean())
        sd=math.sqrt((va+vb)/2)
        s=0.0 if sd<=1e-12 else (ma-mb)/sd
        vals.append((abs(s),s,name))
    vals.sort(reverse=True,key=lambda x:x[0])
    av=[x[0] for x in vals]
    return {'maxAbsSMD':av[0],'medianAbsSMD':float(np.median(av)),'over01':sum(x>0.1 for x in av),'worst':[{'name':n,'absSMD':a,'signedSMD':s} for a,s,n in vals[:10]]}

def danger_summary(pairs):
    diffs=np.asarray([records[p]['danger']-records[n]['danger'] for p,n in pairs],dtype=float)
    obs=float(diffs.mean()) if len(diffs) else float('nan')
    nulls=[]
    for k in range(1,SURROGATE_COUNT+1):
        ds=[]
        for p,n in pairs:
            party=records[p]['party']; inds=by_party[party]; N=len(inds)
            pp=inds[(party_index[p]+offset(N,k))%N]
            nn=inds[(party_index[n]+offset(N,k))%N]
            ds.append(records[pp]['danger']-records[nn]['danger'])
        nulls.append(float(np.mean(ds)))
    ns=sorted(nulls); exceed=sum(x>=obs for x in ns)
    per_party={}
    for party in sorted(by_party):
        ds=[records[p]['danger']-records[n]['danger'] for p,n in pairs if records[p]['party']==party]
        if ds: per_party[party]={'pairs':len(ds),'meanDangerDifference':float(np.mean(ds)),'positiveHigherFraction':float(np.mean(np.asarray(ds)>0))}
    return {'observedMeanDangerDifference':obs,'observedMedianDangerDifference':float(np.median(diffs)),'positiveHigherFraction':float(np.mean(diffs>0)),'nullMedian':float(np.median(ns)),'nullP95':float(ns[int(.95*(len(ns)-1))]),'nullMax':float(max(ns)),'exceed':exceed,'empiricalP':(exceed+1)/(SURROGATE_COUNT+1),'perParty':per_party}

def solve_tau(tau):
    bal_rows=[]; bal_lb=[]; bal_ub=[]
    # |mean treated-control| <= tau * fixed full-sample SD.  Because matched count
    # is sum(x), these are linear inequalities in the edge indicators.
    for j in range(F.shape[1]):
        d=edge_diff[:,j]; s=tau*full_sd[j]
        row1=csr_matrix((d-s).reshape(1,-1)); bal_rows.append(row1); bal_lb.append(-np.inf); bal_ub.append(0.)
        row2=csr_matrix((-d-s).reshape(1,-1)); bal_rows.append(row2); bal_lb.append(-np.inf); bal_ub.append(0.)
    A=vstack([base_A]+bal_rows,format='csr')
    lb=np.concatenate([base_lb,np.asarray(bal_lb)]); ub=np.concatenate([base_ub,np.asarray(bal_ub)])
    cons=LinearConstraint(A,lb,ub)
    bounds=Bounds(np.zeros(E),np.ones(E)); integ=np.ones(E,dtype=int)
    stage1=milp(c=-np.ones(E),integrality=integ,bounds=bounds,constraints=cons,options={'time_limit':180,'mip_rel_gap':0.0})
    if stage1.x is None:
        return {'tau':tau,'status':'infeasible_or_no_solution','solverMessage':stage1.message}
    nstar=int(round(np.sum(stage1.x>0.5)))
    # Second stage: among maximum-cardinality solutions, minimize structural z-distance.
    count_row=csr_matrix(np.ones((1,E)))
    A2=vstack([A,count_row],format='csr'); lb2=np.concatenate([lb,[nstar]]); ub2=np.concatenate([ub,[nstar]])
    stage2=milp(c=edge_dist,integrality=integ,bounds=bounds,constraints=LinearConstraint(A2,lb2,ub2),options={'time_limit':180,'mip_rel_gap':0.0})
    sol=stage2 if stage2.x is not None else stage1
    chosen=np.flatnonzero(sol.x>0.5)
    pairs=[edges[e] for e in chosen]
    bal=matched_smd(pairs)
    effect=danger_summary(pairs) if bal['maxAbsSMD'] is not None and bal['maxAbsSMD']<=0.10 else None
    return {'tau':tau,'status':'ok','stage1Status':int(stage1.status),'stage1Message':stage1.message,'stage2Status':int(stage2.status),'stage2Message':stage2.message,'candidateEdges':E,'positiveEvents':len(pos),'matchedPairs':len(pairs),'retainedPositiveFraction':len(pairs)/len(pos),'uniqueControls':len(set(n for p,n in pairs)),'meanPairZDistance':float(np.mean([edge_dist[e] for e in chosen])) if len(chosen) else None,'balance':bal,'effectReadAllowed':effect is not None,'dangerAfterBalance':effect}

results=[solve_tau(t) for t in TAUS]
report={
  'design':{
    'purpose':'attempt to falsify residual danger association after enforcing stronger structural balance before reading danger',
    'worldPolicy':'fixed 120k production trajectory exported by the browser adapter; production source unchanged',
    'o3Policy':'completed-process O3 fixed; positive event means removing eligible completed-process contribution changes actual selection in shadow evaluation',
    'matching':'maximum-cardinality one-to-one binary matching solved by scipy.optimize.milp, then minimum structural z-distance among maximum-cardinality solutions',
    'exactConstraints':'same party + same current place + same current target + exactly identical active relation-key set',
    'balanceConstraints':'base structural covariates, every square, and every two-way product; danger excluded from all constraints and objectives',
    'predeclaredTaus':list(TAUS),
    'effectGate':'danger is read only if post-match maximum absolute SMD across expanded structural covariates is <= 0.10',
    'null':'127 within-party circular shifts of danger after matched pairs are frozen',
    'causalClaim':False,
    'candidatePolicy':False
  },
  'input':{'records':len(records),'positiveChoiceDiffs':len(pos),'negativeControls':len(neg),'candidateEdges':E,'expandedBalanceFeatures':F.shape[1]},
  'results':results
}
with open(OUTPUT,'w',encoding='utf-8') as f: json.dump(report,f,ensure_ascii=False,indent=2)
print('O3-DANGER-CARDINALITY-BALANCE-120K '+json.dumps({'input':report['input'],'results':results},ensure_ascii=False))
