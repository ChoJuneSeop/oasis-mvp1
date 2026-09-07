import json, math
from collections import defaultdict
import numpy as np
from scipy.optimize import milp, Bounds, LinearConstraint
from scipy.sparse import lil_matrix, vstack

INPUT='o3-danger-balance-records-120k.json'
OUTPUT='o3-danger-iterative-cardinality-balance-120k-report.json'
TARGET_TAU=0.05
EFFECT_GATE=0.10
MAX_ITER=6
SURROGATE_COUNT=127

with open(INPUT,encoding='utf-8') as f: data=json.load(f)
records=data['records']; assert len(records)==1997
assert sum(bool(r['choiceDiff']) for r in records)==164
assert sum(bool(r['decisionDiff']) for r in records)==197

scalar=['disc','routes','seenNPC','relationHistory','episodes','latentCount','eligibleCount','activeKeyCount','hiddenCandidates','decisionIndex','decisionGap','tick']
places=data['placeIds']; npcs=data['npcNames']
base_names=scalar+[f'visit:{x}' for x in places]+[f'recentNpc:{x}' for x in npcs]+[f'recentPlace:{x}' for x in places]

def base_vec(r): return np.asarray([r[k] for k in scalar]+r['visits']+r['recentNpc']+r['recentPlace'],dtype=float)
B=np.vstack([base_vec(r) for r in records]); D=B.shape[1]
cols=[]; names=[]
for j,n in enumerate(base_names): cols.append(B[:,j]); names.append(n)
for j,n in enumerate(base_names): cols.append(B[:,j]**2); names.append(f'{n}^2')
for j in range(D):
    for k in range(j+1,D): cols.append(B[:,j]*B[:,k]); names.append(f'{base_names[j]}*{base_names[k]}')
F=np.vstack(cols).T
ref_full_sd=F.std(axis=0,ddof=1)
keep=np.isfinite(ref_full_sd)&(ref_full_sd>1e-10)
F=F[:,keep]; ref_full_sd=ref_full_sd[keep]; names=[n for n,k in zip(names,keep) if k]
M=F.shape[1]; R=len(records)

pos=np.asarray([i for i,r in enumerate(records) if r['choiceDiff']],dtype=int)
neg=np.asarray([i for i,r in enumerate(records) if not r['choiceDiff']],dtype=int)
ispos=np.zeros(R,dtype=bool); ispos[pos]=True

def active_key(r): return tuple(sorted(r.get('activeKeys') or []))
strata=defaultdict(lambda:[[],[]])
for i,r in enumerate(records):
    key=(r['party'],r['here'],r['target'],active_key(r))
    strata[key][0 if r['choiceDiff'] else 1].append(i)

overlap=set(); exact_rows=[]
for key,(ps,ns) in strata.items():
    if not ps or not ns: continue
    overlap.update(ps); overlap.update(ns)
    row=lil_matrix((1,R),dtype=float); row[0,ps]=1; row[0,ns]=-1; exact_rows.append(row.tocsr())
Aexact=vstack(exact_rows,format='csr')
upper=np.asarray([1.0 if i in overlap else 0.0 for i in range(R)])
pos_overlap=sum(i in overlap for i in pos)
pos_indicator=ispos.astype(float)


def actual_balance(sp,sn):
    out=[]; pooled=np.zeros(M)
    for j,name in enumerate(names):
        a=F[sp,j]; b=F[sn,j]; ma=float(a.mean()); mb=float(b.mean())
        va=float(np.mean((a-ma)**2)); vb=float(np.mean((b-mb)**2)); sd=math.sqrt((va+vb)/2); pooled[j]=sd
        smd=0.0 if sd<=1e-12 else (ma-mb)/sd
        out.append((abs(smd),smd,name))
    out.sort(reverse=True,key=lambda x:x[0])
    absvals=[x[0] for x in out]
    return {'maxAbsSMD':absvals[0],'medianAbsSMD':float(np.median(absvals)),'over01':sum(x>EFFECT_GATE for x in absvals),'worst':[{'name':n,'absSMD':a,'signedSMD':s} for a,s,n in out[:12]]},pooled


def solve(refsd):
    A=lil_matrix((2*M,R),dtype=float)
    for j in range(M):
        diff=np.where(ispos,F[:,j],-F[:,j]); tol=TARGET_TAU*refsd[j]
        A[2*j,:]=diff-tol*pos_indicator
        A[2*j+1,:]=-diff-tol*pos_indicator
    AA=vstack([Aexact,A.tocsr()],format='csr')
    lb=np.concatenate([np.zeros(Aexact.shape[0]),np.full(2*M,-np.inf)])
    ub=np.zeros(Aexact.shape[0]+2*M)
    c=np.where(ispos,-1.0,0.0)
    res=milp(c=c,integrality=np.ones(R,dtype=int),bounds=Bounds(np.zeros(R),upper),constraints=LinearConstraint(AA,lb,ub),options={'time_limit':90,'mip_rel_gap':0.0})
    if res.x is None: return res,None,None
    selected=res.x>0.5
    return res,np.flatnonzero(selected&ispos),np.flatnonzero(selected&~ispos)

iterations=[]; refsd=ref_full_sd.copy(); final_sp=final_sn=None; final_balance=None
for it in range(MAX_ITER):
    res,sp,sn=solve(refsd)
    if sp is None:
        iterations.append({'iteration':it,'solverStatus':int(res.status),'solverMessage':res.message,'solution':False}); break
    bal,pooled=actual_balance(sp,sn)
    iterations.append({'iteration':it,'solverStatus':int(res.status),'solverMessage':res.message,'matchedPairs':len(sp),'retainedPositiveFraction':len(sp)/len(pos),'balance':bal})
    final_sp,final_sn,final_balance=sp,sn,bal
    if bal['maxAbsSMD']<=EFFECT_GATE: break
    # Danger-blind monotone refinement: never loosen a feature tolerance.
    refsd=np.minimum(refsd,np.maximum(pooled,1e-12))

by_party=defaultdict(list); party_index={}
for i,r in enumerate(records): by_party[r['party']].append(i)
for party,inds in by_party.items():
    for j,i in enumerate(inds): party_index[i]=j

def offset(N,k): return max(1,min(N-1,round(N*k/(SURROGATE_COUNT+1))))

def danger_read(sp,sn):
    # Called only after the balance gate has passed. Pair assignment is unnecessary
    # for the mean contrast because exact strata force equal group counts per stratum.
    obs=float(np.mean([records[i]['danger'] for i in sp])-np.mean([records[i]['danger'] for i in sn]))
    nulls=[]
    for k in range(1,SURROGATE_COUNT+1):
        ap=[]; an=[]
        for i in sp:
            inds=by_party[records[i]['party']]; ap.append(records[inds[(party_index[i]+offset(len(inds),k))%len(inds)]]['danger'])
        for i in sn:
            inds=by_party[records[i]['party']]; an.append(records[inds[(party_index[i]+offset(len(inds),k))%len(inds)]]['danger'])
        nulls.append(float(np.mean(ap)-np.mean(an)))
    ns=sorted(nulls); exceed=sum(x>=obs for x in ns)
    per_party={}
    for party in sorted(by_party):
        ap=[records[i]['danger'] for i in sp if records[i]['party']==party]; an=[records[i]['danger'] for i in sn if records[i]['party']==party]
        if ap: per_party[party]={'positiveN':len(ap),'controlN':len(an),'meanDangerDifference':float(np.mean(ap)-np.mean(an))}
    return {'observedMeanDangerDifference':obs,'nullMedian':float(np.median(ns)),'nullP95':float(ns[int(.95*(len(ns)-1))]),'nullMax':float(max(ns)),'exceed':exceed,'empiricalP':(exceed+1)/(SURROGATE_COUNT+1),'perParty':per_party}

gate_pass=bool(final_balance and final_balance['maxAbsSMD']<=EFFECT_GATE)
effect=danger_read(final_sp,final_sn) if gate_pass else None
report={
 'design':{
   'purpose':'falsify the residual danger association after achieving actual matched-sample balance on nonlinear structural flow features',
   'worldPolicy':'fixed 120k production trajectory exported by the browser adapter; production source unchanged',
   'o3Policy':'completed-process O3 fixed',
   'selectionModel':'binary unit-selection cardinality matching; exact stratum count equality allows pairing after selection and reduces optimization variables',
   'exactStrata':'same party + same current place + same current target + exactly identical active relation-key set',
   'expandedBalance':'650 nonconstant terms from base structural variables, their squares, and every two-way product',
   'targetTau':TARGET_TAU,
   'refinement':'after each danger-blind solution, recompute matched pooled SD and monotonically tighten reference SD; stop only when actual max |SMD| <= 0.10 or MAX_ITER reached',
   'effectGate':EFFECT_GATE,
   'dangerPolicy':'danger is not referenced by matching constraints/objectives and is read only after the effect gate passes',
   'null':'127 within-party circular shifts after selected groups are frozen',
   'causalClaim':False,
   'candidatePolicy':False
 },
 'input':{'records':R,'positiveChoiceDiffs':len(pos),'negativeControls':len(neg),'matchablePositiveEvents':pos_overlap,'exactStrataWithOverlap':Aexact.shape[0],'expandedBalanceFeatures':M},
 'iterations':iterations,
 'gatePassed':gate_pass,
 'finalBalance':final_balance,
 'finalMatchedPairs':None if final_sp is None else len(final_sp),
 'finalRetainedPositiveFraction':None if final_sp is None else len(final_sp)/len(pos),
 'dangerAfterBalance':effect
}
with open(OUTPUT,'w',encoding='utf-8') as f: json.dump(report,f,ensure_ascii=False,indent=2)
print('O3-DANGER-ITERATIVE-CARDINALITY-BALANCE-120K '+json.dumps(report,ensure_ascii=False))
