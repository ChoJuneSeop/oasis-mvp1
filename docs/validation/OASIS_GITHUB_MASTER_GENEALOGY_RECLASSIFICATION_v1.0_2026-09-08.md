# OASIS GitHub 전체 연구 계보 및 최종 관점 재분류 v1.0

기준일: 2026-09-08  
작업 브랜치: `validation/integrated-work-system-v1.1-2026-09-08`  
production/main 변경: 없음  
상위 연구 거버넌스: `OASIS_RESEARCH_PROTOCOL.md`  
현재 수학 의미론 기준: **OASIS Mathematical Operator Model v1.0 — Closed Baseline**

---

## 0. 목적

이 문서는 GitHub에서 수행된 OASIS의 과거 코딩·반증·실험·오염감사·외부검증·인과연구를 삭제하거나 성공 결과로 다시 쓰기 위한 문서가 아니다.

목적은 오직 하나다.

> 과거의 모든 GitHub 작업을 현재 최종 OASIS 관점에서 다시 위치시키고, 무엇이 현재 구조의 근거이며 무엇이 구현가설·오염진단·구형 의미론·외부 경계증거인지 하나의 계보로 통합한다.

과거 결과의 원시 trace와 branch는 보존한다. 현재 해석과 충돌하는 경우 **결과 자체를 삭제하지 않고 증거 용도만 재분류**한다.

---

# 1. 현재 최종 의미론

## 1.1 유일한 최상위 공리

**현실은 관측 가능하다 / Reality is observable.**

`O_t(F_t) = Y_t`

- `F_t`: 현재 현실 흐름
- `O_t`: 관측 과정
- `Y_t`: 관측된 현실

관측 가능하다는 것은 현실을 완전히 안다는 뜻이 아니다. 예상하지 못한 현실이 나오면 현실이 모델을 위반한 것이 아니라 현재 모델의 설명·표현 범위가 부족한 것으로 본다.

## 1.2 현재 실행 의미론

현재 닫힌 수학모델의 실행 흐름은 다음이다.

`F_t`
→ `O_t`
→ `Y_t`
→ `Γ_t` 관계 재현재화
↔ `Ω_t` 가능성 조합
→ `κ_t(U)` 관계 하위결합
→ `Ψ_t(c)` 관계 잠재구조
→ `P_t(c)` 조건부 가능성 분포
↔ `χ_t` 선택축
↔ `ρ_t` 책임축
→ `A_resource` 동적 연산자원 배분
→ 필요 시 `S_t` 자기개입
→ 최신 현실 재관측
→ 생명가치 상위제약
→ `D_t` 단일 현실화 또는 `⊥` 비개입
→ 실제 결과 관측
→ `W_t` 현실화 경험 편입
→ 다음 `F_(t+1)`

보조 상태/분석:

- `e_t(r)`: 관계가 과거 관계구조에 존재
- `q_t(r)`: 현재 판단에 참여
- 비현재: `e=1, q=0`
- 삭제: `e=0`
- `ℛ`: 관계 재생성/기능적 재형성 분석
- `Θ_I(τ)`: 개입 이후 시간에 따른 인과궤적
- `N_ij`: 연산순서/과정차이 분석

## 1.3 현재 가능성 정의

가능성 `c`는 사전 행동 하나가 아니다.

`c = <A_c, R_c, B_c, σ_c, K_c>`

- `A_c`: 참여자
- `R_c`: 현재/재현재화 관계
- `B_c`: 현실에서 실제 수행 가능한 기본 능력
- `σ_c`: 능력과 관계의 순서적 조합
- `K_c`: 현재 실행조건

따라서 **기본 능력(capability)과 가능성(possibility)은 다르다.**

## 1.4 현재 폐기된 강한 해석

다음은 현재 canonical 의미론으로 사용하지 않는다.

- `danger = Responsibility Axis`
- 고정 위험/유사도/시간 임계값을 OASIS 원리로 간주
- 미실현 가능성을 독립된 미래 객체/평행 미래로 영구 보존
- 현실화 뒤 관계구조 전체가 즉시 재작성된다는 해석
- 비현재화를 삭제와 동일시
- 이질성을 고정 anomaly event로 분류하고 복구모드 진입
- 관계 재출현이 곧 행동변화를 보장
- 같은 현재 출력이면 같은 인과과정
- 하나의 context-free 인과상수가 OASIS 인과를 충분히 대표
- 실험자 사전 행동메뉴를 native Possibility Composition으로 간주
- 관계필드 전체 제거형 NoRelation의 성능차를 OASIS 전체 우월성으로 간주

---

# 2. 재분류 등급

이 문서에서는 다음 등급을 사용한다.

1. **CANONICAL FOUNDATION**  
   현재 v1.0 의미론과 양립하며 후속 구현의 구조적 기초로 유지.

2. **PARTIAL / PROXY IMPLEMENTATION**  
   최종 개념의 일부를 구현했으나 native 연산자 전체는 아님.

3. **FLOW-PRESERVED EVIDENCE**  
   전체 흐름을 유지한 관찰 또는 국소개입 증거.

4. **QA / VALIDATION INFRASTRUCTURE**  
   오염차단, 재현성, 순서보존, fail-closed 등 검증 품질 증거. 이론 성능증거가 아님.

5. **LEGACY DISCOVERY / LEGACY HYPOTHESIS**  
   이후 관점을 형성하는 데 기여했으나 현재 실행규칙으로 승계하지 않는 탐색·가설.

6. **IMPLEMENTATION / REPRESENTATION MISMATCH**  
   이론이 아니라 당시 코드/표현이 현재 의미론을 충족하지 못함을 드러낸 음성증거.

7. **CONTAMINATED DIAGNOSTIC**  
   실행흔적과 오염발견은 보존하지만 논문 이론증거로 사용하지 않음.

8. **EXTERNAL BOUNDARY EVIDENCE**  
   외부 데이터/강한 baseline에서 OASIS-specific 또는 우월성 주장을 제한하는 증거.

9. **CURRENT SYNTHESIS**  
   현재 main의 인과/논문/검증 종합. 단, Mathematical Operator v1.0의 native production 구현을 뜻하지 않음.

---

# 3. GitHub 전체 계보

## Phase A — `oasis-core-v0.1` ~ `oasis-core-v0.9`

### `oasis-core-v0.1`
재분류: **LEGACY IMPLEMENTATION-FIDELITY FAILURE + FOUNDATIONAL AUDIT**

- 수학→코드 역추적을 처음 체계화.
- 이후 adversarial test에서 endpoint/label/self saturation이 드러나 v0.2에서 교정.
- 당시 문서의 `전체 field rewrite`, 미현실 가능성 독립보존, 일부 `λ` 표기는 현재 의미론에서 폐기.

승계: “수학적 개념과 실제 코드함수는 1:1 추적돼야 한다”는 감사 원칙.

### `oasis-core-v0.2`
재분류: **PARTIAL Γ PROTOTYPE / INTERNAL CONSTRUCT QA**

- actor와 counterpart 분리.
- directed endpoint continuity와 non-actor counterpart reappearance를 이용한 provisional reactivation.
- 12/12 내부검사 통과.
- 그러나 counterpart reappearance 규칙 자체는 연구자 설계 가설이므로 native `Γ`의 최종 정의로 승계하지 않음.

### `oasis-core-v0.3`
재분류: **CANONICAL FOUNDATION — OBSERVATION/FLOW SEPARATION**

- measurement → observation → flow → history의 분리.
- 고정 similarity/reward/timeout 없이 열린 순서 흐름을 보존하려 한 구조.
- 최종 `O_t`, `Y_t`, 흐름관점의 직접 선행 구현으로 유지.

### `oasis-core-v0.4`
재분류: **CANONICAL FOUNDATION — DIRECTIONAL RELATIONAL FLOW**

- 관계 방향과 순서 보존.
- 단순 미관측을 관계종료로 간주하지 않는 경계.
- relation lifecycle 규칙 자체는 표현규칙이며 현실의 불변법칙은 아님.

### `oasis-core-v0.5`
재분류: **CANONICAL FOUNDATION — OBSERVATION UNCERTAINTY QA**

- 측정과 관측의 불확실성 분리.
- 미래정보, reward, 임의 epsilon/threshold를 넣지 않는 adapter 원칙.
- OASIS 고유성보다 관측계층 품질보증으로 사용.

### `oasis-core-v0.6`
재분류: **LEGACY RELATION-LIFECYCLE REPRESENTATION**

- relation emerged/continued/ceased lifecycle을 다룸.
- 관계 하나의 종료를 OASIS 전체 경험의 완결과 동일시하지 않는 경고는 유지.
- 현재 `W_t` 경험편입 경계의 직접 구현으로 보지는 않음.

### `oasis-core-v0.7`
재분류: **LEGACY RESPONSIBILITY HYPOTHESIS / RETIRED RUNTIME RULE**

- responsibility trough/rise를 experience boundary와 연결한 가설.
- 당시 `rho`는 component-wise proxy.
- 현재 `ρ_t`는 danger/trough scalar가 아니므로 이 규칙을 canonical runtime에 사용하지 않음.

### `oasis-core-v0.8`
재분류: **PARTIAL PARTICIPATION PROTOTYPE / SCRIPTED-DEMAND RISK**

- 책임상태와 기능적 참여 변화를 연결하려 함.
- 입력 자체가 숨은 정답키가 될 수 있음을 감사에서 이미 경고.
- 최종 `A_t`, `ρ_t`의 부분 선행연구지만 native 결합 증거 아님.

### `oasis-core-v0.9`
재분류: **PARTIAL RELATION-FIRST PARTICIPATION FOUNDATION**

- `non-participating ↔ candidate ↔ participating`
- relation-first participation을 복원.
- 고정 threshold와 scripted healer/goddess demand를 제거하는 방향.
- 단 upstream responsibility proxy가 외부값이므로 `ρ_t/A_resource` native 구현은 아님.

---

## Phase B — `experiment/prehistoric-personality-lab`

재분류: **LEGACY DOMAIN LAB + FIRST-ACTION OBSERVATION + IMPLEMENTATION MISMATCH DISCOVERY**

유지되는 것:
- 초기 OASIS founder는 `memory=[]`, `relations={}`, `relationEpisodes=[]`, `activeRelations=[]`에서 시작.
- 외부 역사스트림, 공통 목표, 공통 reward, 발전 정답을 주지 않은 상태에서 첫 행동이 발생.
- 따라서 `H_0=∅`, `Γ_0=∅`이어도 현재 현실과 기본 능력으로 첫 행동이 가능하다는 관찰은 유지.

제한:
- `observe/move/forage/...` 같은 action primitives가 미리 존재.
- 따라서 이는 **native Ω가 행동 구조 자체를 무제한 자생생성했다는 증거가 아님**.
- branch 자체의 OASIS Core Audit v1은 6개 핵심검사에서 `0/6`, 즉 candidate generation, ID-independent reactivation, long retention, combination scaling, choice/responsibility interaction, order preservation 모두 implementation mismatch를 기록.

증거 사용:
- 첫 행동·장기 공동세계·관계발생의 역사적 관찰: 유지.
- OASIS 완성모델 성능/우월성/문명진화 증거: 사용 금지.

---

## Phase C — `mvp3-reality-flow-kill`

재분류: **MAJOR INTERNAL FALSIFICATION GENEALOGY + PARTIAL FLOW/RE-CURRENTIZATION FEASIBILITY**

핵심 계보:
- Stage 2: same endpoint / opposite trajectory를 동일 처리한 MVP2 path-sensitivity 반증.
- Stage 7: last-direction proxy 반증.
- Stage 8: qualitative run topology가 반례를 구분.
- Stage 9: legacy threshold authority contamination 발견.
- Stage 10: causal isolation.
- Stage 11: 단순 history possession이 execution authority를 주는 누출 발견.
- Stage 12: remembered evidence와 current execution authority 분리.
- Stage 13~15: fixed window/cap이 delayed relevance를 손실시키는 경계 확인.

현재 v1.0으로 승계되는 핵심:
- 좌표값보다 흐름을 본다.
- 비현재 evidence와 현재 execution authority는 다르다.
- 비현재는 삭제가 아니다.
- 오래됐다는 이유만으로 관계를 삭제하는 것은 OASIS 원리가 아니다.
- 관계는 늦게 다시 현재화될 수 있다.

승계하지 않는 것:
- 특정 topology key 방식 자체를 OASIS 고유 연산자로 간주하지 않음.
- topology mechanics는 구현후보/선행기술 가능성이 있는 표현도구.

### Stage 30
재분류: **IMPLEMENTATION / REPRESENTATION MISMATCH**

- unrealized `possibilityPaths` tracker entry 자체가 이후 인과적으로 소비되는지 시험.
- 현재 v1.0에서는 미실현 가능성을 독립 미래 객체로 보존할 필요가 없으므로 tracker causal failure는 전체 이론 반증이 아님.

### Stage 31
재분류: **PROCESS-CONDITIONED RE-CURRENTIZATION FEASIBILITY / INTERNAL INTEGRITY ONLY**

- 같은 현재 scalar, 같은 relation inventory에서도 다른 과거 관계과정이 이후 동일 cue에서 다른 가능성을 현재화할 수 있음을 관찰.
- 단순 context-key lookup이 동일 split을 재현하여 OASIS 고유성/신규성 증거는 아님.

### Stage 32 corrected
재분류: **TEST-ONLY STRUCTURAL FEASIBILITY + PRODUCTION IMPLEMENTATION MISMATCH**

- 구조적으로 관계된 exact-key-different flow에서 test-only structural recurrentization은 가능.
- production exact key는 이를 못함.
- native production 증거로 사용 금지.

---

## Phase D — `implementation/oasis-integrated-core-v1`

재분류: **MAJOR PARTIAL EXECUTABLE PREDECESSOR**

유지:
- 현실 관측 → 관계 재구성 → 참여 → 가능성 → 책임 → 단일 현실화 → 결과 → 다음 흐름의 통합 실행경로를 하나의 reference core로 묶음.
- fixed danger/window/argmax/sorted pair-key 등에 대한 강한 금지방향.

현재 v1.0과의 차이:
- current affordances가 외부 adapter에서 공급됨.
- 따라서 native `Ω_t`의 가능성 구조 생성과 일치하지 않음.
- life를 “invariant”로 부른 과거 표현은 현재는 higher value constraint로 재분류.
- Responsibility/Self-Intervention 완전 native가 아님.

용도:
- production predecessor와 regression history로 보존.
- Mathematical Operator v1.0의 최종 native implementation으로 부르지 않음.

---

## Phase E — Blind Historical Flow

### `experiment/blind-historical-flow-v1`
재분류: **PREREGISTERED MECHANISM PILOT / LEGACY PROTOCOL FOUNDATION**

- 역사 결과를 reward/정답으로 쓰지 않음.
- 관계 방향/순서, 미래정보 차단, no danger/window를 명시.
- 목적 자체가 superiority가 아니라 mechanism validation.
- 후속 v2 및 통합검증 인프라가 더 강한 contamination 경계를 만들었으므로 현재 본증거로 승격하지 않음.

### `experiment/blind-historical-flow-v2`
재분류: **CONTAMINATED DIAGNOSTIC — PAPER EVIDENCE INVALID**

초기 result에서 더 넓은 completed-experience reactivation을 관찰했지만 후속 contamination audit가 우선한다.

확정 오염:
- unrealized affordance entity가 current seed로 유입
- 모든 available participant를 current seed로 투입
- warmup deliberation 누출
- 과거 event relation의 current relation 잔존
- OASIS treatment가 comparator에 누출
- comparator가 OASIS core를 상속
- current/reactivated action executability 비대칭
- atomic action universe 사전열거
- responsibility/process bridge의 실험자 작성

용도:
- 오염원 발견과 검증설계 개선의 핵심 진단자료.
- OASIS relational superiority 또는 possibility-structure 증거로 사용 금지.

---

## Phase F — Heterogeneity / relation holdout 계보

대상:
- `experiment/heterogeneity-flow`
- `validation/heterogeneity-flow`
- `validation/relation-process-holdout`
- `validation/relation-process-loco-holdout`
- `validation/relation-matched-transition-holdout`
- `validation/relation-support-scaling-holdout`

재분류: **LEGACY DISCOVERY + PARTIAL LOCAL-COUPLING DIAGNOSTIC**

유지:
- 이질성을 고정 event가 아니라 이후 흐름으로 보도록 실험방향을 교정.
- 자연복귀와 장기 미해소 흐름을 사후 관찰.
- relation support/coupling이 실제 선택을 바꾸는 시점이 존재함을 탐색.

제한:
- 구형 `relation-field.js`, fixed window, danger/responsibility proxy가 섞인 계보가 존재.
- NoRelation은 전체 relation field 제거형 강한 decomposition.
- “relation field가 더 안정화한다”는 우월성 주장은 실패/미지지.

현재 의미:
- 이질성은 runtime anomaly operator가 아니다.
- 자연복귀/비현재/재구성은 결과로 관찰.
- 이 계보는 `L5` validation lens의 역사적 진단증거로만 유지.

---

## Phase G — `architecture/oasis-unified-validation-system-v1` + Founding Flow v1~v12

재분류: **QA / VALIDATION INFRASTRUCTURE — HIGH VALUE, NOT THEORY PERFORMANCE EVIDENCE**

핵심 승계:
- Reality Ledger와 Proposal 분리.
- historical replay와 interactive actualization 분리.
- provenance/time-access 요구.
- experimenter action menu/reward/score/winner 주입 금지.
- comparator independent state.
- 미실현 proposal이 reality를 변경하지 못하게 함.

Founding Flow에서 발견/교정한 핵심 품질문제:
- CI `pipefail` 누락으로 false-green 발생 → fail-closed 교정.
- same-frame relation array serialization order가 구조 identity에 누출.
- temporal order와 simultaneous unordered set을 구분하여 canonicalize.
- C7 수정 중 role semantics regression 발생 → 재수정.
- v12에서 fingerprint serialization leakage 교정 및 regression chain 통과.

현재 재분류:
- 이들은 OASIS가 옳다는 증거가 아니라 **어떤 실험도 믿을 수 있게 만드는 품질보증 자산**.
- 문서에서 “오염 차단 불변조건”이라고 부른 항목은 현재 철학의 불변법칙이 아니라 **validation protocol constraints**로 다시 명명.

---

## Phase H — External validation

### `experiment/enron-realworld-c0-20260905`
재분류: **EXTERNAL BOUNDARY EVIDENCE / REPRESENTATION BENCHMARK**

- Pairwise/Temporal Hypergraph가 Local보다 강함.
- OASISFlow는 Temporal Hypergraph 대비 top-1 개선을 확립하지 못했고 한 seed에서 유의하게 나쁨.
- AP/AUC/log-loss의 작은 차이는 feature-count 등 대안설명 존재.

현재 의미:
- 관계/시간이 유용할 수 있다는 일반방향의 외부 증거.
- native `Γ→Ω→χ/ρ→D→W` 전체 검증 아님.
- universal superiority rejected / OASIS-specific incremental value unresolved.

### `verification/p1`
재분류: **INDEPENDENT EXTERNAL FALSIFICATION / OASIS-SPECIFICITY BOUNDARY**

- MOOC에서 strong generic second-order Markov가 OASIS-like O2보다 약 4.87% 우수.
- MovieLens에서도 strong baseline 대비 O2 추가가치 미확립.
- K3 OASIS-specificity kill triggered.

현재 의미:
- generic history dependence와 OASIS-specific operator value를 분리해야 함.
- 이 결과는 final v1.0 전체의 반증이 아니라 당시 minimal relational-reactivation operationalization의 외부 추가가치 미지지.

---

## Phase I — current `main`: Causal Research v0.1 → v3.0 / Evidence Ledger v3.1

재분류: **CURRENT SYNTHESIS + VALID NARROW CAUSAL EVIDENCE**

현재 main에서 유지되는 강한 결과:

### H0 relational candidate trace
- 1,997/1,997 decision에서 relational candidate layer 계측.
- selected possibility direct relational support 1,988/1,997.
- 재분류: **FLOW-PRESERVED OBSERVATIONAL / PARTIAL IMPLEMENTATION**.
- 제한: full theoretical `Ω`, candidate necessity/sufficiency, Responsibility/Self-Intervention 결합 미검증.

### H1 incorporation genealogy
- 현실화 경험 → 구조형성 → non-current → reactivation → participation → later outcome의 exact ordered genealogy 대량 관찰.
- 재분류: **FLOW-PRESERVED OBSERVATIONAL**.
- whole overwrite 또는 유일원인 주장은 금지.

### EX-04M / EX-05 PRS condition contribution
- same prior / different initial PRS: canonical 3/3, shifted 9/9 trajectory divergence.
- different prior / same PRS: canonical 일부, shifted 0/9.
- 재분류: EX-04M **FLOW-PRESERVED INITIAL-CONDITION INTERVENTION**, EX-05 **FLOW-PRESERVED REPLICATED**.
- 현재 가장 강한 내부 인과기여 증거 중 하나.

### H2 joint/cross-key contribution
- active relational set joint effect와 cross-key overdetermination 관찰.
- 재분류: **PARTIAL COUPLING EVIDENCE**.
- whole PRS necessity/sufficiency 미검증.

### H3 non-current reappearance
- 자연 재출현 관찰.
- 제거 후 재출현해도 15k 행동분기 0인 음성결과 보존.
- 재분류: **REAPPEARANCE OBSERVED; BEHAVIORAL GENERALIZATION REJECTED**.

### causal form
- 하나의 context-free causal-rate scalar는 충분하지 않음.
- `theta_I(z;Q)` 같은 조건부 효과표현이 최소한 더 적합.
- 최종 v1.0에서는 이를 더 일반적인 `Θ_I(τ)` 시간적 인과궤적 분석과 양립하는 보조 분석결과로 유지.

---

## Phase J — 장기 관계·순서 연구

### `SECOND_GENERATION_REACTIVATION_2026-09-07`
재분류: **LONG-HORIZON OPERATOR FEASIBILITY / PRODUCTION PERSISTENCE LIMIT**

- 실제 형성된 6개 관계 episode가 비현재 구간 후 모두 다시 관계조건에 진입.
- relevance re-entry 1,854회에 비해 실제 판단차이는 3회.
- 최초 판단차이는 형성 후 104,260 tick 뒤.

현재 의미:
- `재현재화 ≠ 판단기여`.
- 구조효과와 행동효과의 발현시간을 분리해야 함.
- `Θ_I(τ)` 관점과 직접 양립.
- 단 production cap 80 / 기본 active-age 1,200 때문에 동일 장기보존을 production이 native로 제공하지 않음.

### O1 long-horizon order
재분류: **AUXILIARY SYNTHETIC ORDER-EFFECT FEASIBILITY**

- order-normalized control과 차이를 보이는 장기 발현.
- production key-level sorting 때문에 native `N_ij` 실행증거 아님.

---

## Phase K — `validation/integrated-work-system-v1.1-2026-09-08`

재분류: **CURRENT FLOW-PRESERVING SYNTHESIS / PRE-PRODUCTION CLOSURE**

### F0
`PARTIAL / OBSERVATIONAL + REPRESENTATION LIMIT`

### F1
`PARTIAL`이지만 가장 중요한 신규 국소개입이 존재.

#### incorporation-link local intervention
- 120,000 tick × 2회 동일 재현.
- tick 5,038에서 자연 발생한 `엘리@forest` 현실화 경험의 relationHistory 편입 1건만 차단.
- 구조차이는 즉시 발생.
- 행동차이는 120k 동안 0.
- 같은 관계는 tick 5,786에 자연 재생성.

최종 v1.0 매핑:
- `W_t`: 편입 한 건이 구조를 실제로 바꿈.
- `ℛ`: 이후 동일 관계 재생성 관찰.
- `Θ_I(τ)`: 구조효과는 즉시, 행동효과는 `NULL_WITHIN_HORIZON`.

따라서 이 결과는 “한 사건이 한 미래를 고정한다”는 모델을 지지하지 않으며, 지속 현실흐름의 중복·재구성·재관계가 효과전파를 흡수할 수 있음을 보여주는 **FLOW-PRESERVED LOCAL-INTERVENTION EVIDENCE**다.

### F2
`PARTIAL / OPEN OPERATOR GAPS`

- native Responsibility 없음.
- Self-Intervention 없음.
- full theoretical Possibility Composition 없음.

### F3
`PARTIAL / IMPLEMENTATION LIMIT`

- 장기 지연효과 feasibility 존재.
- production persistence semantics가 제한.

### F4
`PARTIAL / NEGATIVE BOUNDARY`

- external strong baseline 대비 일반 우월성/증분가치 미확립.

### F5
`PARTIAL / NOT YET CONFIRMED`

---

# 4. 모든 GitHub 브랜치의 최종 분류표

| Branch | 최종 분류 | 현재 증거용도 |
|---|---|---|
| `main` | CURRENT SYNTHESIS | 현재 인과/논문 증거 원장. full Mathematical v1.0 native 구현은 아님 |
| `oasis-core-v0.1` | Legacy failed fidelity + audit | 최초 math-code gap/실패 계보 |
| `oasis-core-v0.2` | Partial Γ prototype | 내부 construct QA, provisional bridge |
| `oasis-core-v0.3` | Canonical foundation | observation/flow 분리 |
| `oasis-core-v0.4` | Canonical foundation | 관계 방향·순서·관측연속성 |
| `oasis-core-v0.5` | Canonical foundation | measurement/observation uncertainty QA |
| `oasis-core-v0.6` | Legacy lifecycle | relation lifecycle 표현, experience 전체와 분리 |
| `oasis-core-v0.7` | Retired responsibility hypothesis | trough/rise runtime 규칙은 폐기 |
| `oasis-core-v0.8` | Partial participation prototype | 기능참여 탐색, scripted demand 위험 |
| `oasis-core-v0.9` | Partial relation-first participation | 참여상태 구조의 직접 선행연구 |
| `experiment/prehistoric-personality-lab` | Legacy domain + implementation mismatch | 첫 행동 관찰, 장기환경 진단, 완성모델 성능증거 아님 |
| `mvp3-reality-flow-kill` | Major falsification genealogy | flow-not-coordinate, delayed relevance, evidence/authority separation |
| `implementation/oasis-integrated-core-v1` | Partial executable predecessor | reference-core 역사, native Ω/ρ/S 미완 |
| `experiment/blind-historical-flow-v1` | Preregistered pilot | mechanism protocol history, superseded |
| `experiment/blind-historical-flow-v2` | Contaminated diagnostic | 오염발견만 유지, paper evidence 금지 |
| `experiment/heterogeneity-flow` | Legacy flow observation/decomposition | 이질성 이후 흐름 관찰, 우월성 금지 |
| `validation/heterogeneity-flow` | Legacy coupling diagnostic | 흐름형 이질성·책임결합 병목 발견 |
| `validation/relation-process-holdout` | Partial local causal diagnostic | relation process contribution 탐색 |
| `validation/relation-process-loco-holdout` | Partial composition diagnostic | relation-process×locomotion 조합 탐색 |
| `validation/relation-matched-transition-holdout` | Partial matched transition diagnostic | 관계조건 통제 전이 검사 |
| `validation/relation-support-scaling-holdout` | Partial support-scaling diagnostic | support mass/behavior coupling 탐색 |
| `architecture/oasis-unified-validation-system-v1` | QA / validation infrastructure | contamination boundary, provenance, fail-closed, Founding Flow QA |
| `experiment/enron-realworld-c0-20260905` | External boundary | universal superiority rejected, incremental value unresolved |
| `verification/p1` | External falsification boundary | generic history vs OASIS-specificity 분리 |
| `validation/integrated-work-system-v1.1-2026-09-08` | Current validation synthesis | F0–F5 closure, 120k×2 flow-preserved F1 최신 증거 |

---

# 5. 최종 수학 연산자별 GitHub 증거상태

| 요소 | GitHub 현재 상태 | 최종 판정 |
|---|---|---|
| `O_t`, `Y_t` 관측 | v0.3~v0.5, Unified Validation에서 강한 기반 | **FOUNDATIONAL / QA STRONG** |
| `F_t` 현실흐름 | mvp3에서 scalar/last-direction 반증을 거쳐 강화 | **FOUNDATIONAL / PARTIAL EXECUTION** |
| `Γ_t` 관계 재현재화 | v0.2~v0.9, mvp3, H1/H3에서 다수 관찰 | **PARTIAL NATIVE + REPRESENTATION LIMIT** |
| `A_t` 참여상태 | v0.8/v0.9 및 main trace | **PARTIAL** |
| `B_t` 기본 능력 | prehistoric action primitives 등 scaffold 존재 | **CAPABILITY SCAFFOLD, NOT FORMAL NATIVE STATE** |
| `Ω_t` 가능성 조합 | 과거는 affordance/candidate projection 중심 | **PARTIAL / PROXY; FULL NATIVE MISSING** |
| `κ_t, Ψ_t, P_t` | 수학/분석 표현은 존재, production 1:1 native 미확인 | **FORMAL / NOT NATIVE-PROVEN** |
| `χ_t` 선택축 | selection은 존재하지만 독립 축으로 완전 분리되지 않음 | **PARTIAL / IMPLICIT** |
| `ρ_t` 책임축 | danger/needScore 등 proxy 실험 다수, 동일시 실패 | **PROXY ONLY / NATIVE MISSING** |
| `A_resource` | 책임→검증/탐색 자원 연결 시도, 일관성 미확립 | **PARTIAL / OPEN** |
| `S_t` 자기개입 | 독립 native causal isolation 없음 | **MISSING** |
| 생명가치 상위제약 | 설계원칙 존재, reward와 분리 | **POLICY CONSTRAINT; NATIVE OPERATOR EVIDENCE OPEN** |
| `D_t` 단일 현실화 | 대부분 환경에서 one-choice actualization 존재 | **SUBSTANTIALLY IMPLEMENTED; `⊥` semantics not separately audited** |
| `W_t` 경험편입 | H1 genealogy + 120k×2 local intervention | **STRONGEST CURRENT FLOW EVIDENCE** |
| `e/q` 비현재/현재참여 | mvp3·second-generation에서 개념/관찰 강함 | **SEMANTICALLY STRONG / PRODUCTION RETENTION LIMIT** |
| `ℛ` 관계 재생성 | H2 reappearance + F1 tick 5786 regeneration | **OBSERVED ANALYTIC PHENOMENON** |
| `Θ_I(τ)` 인과궤적 | 15k null, 120k F1, 100k+ delayed effect와 양립 | **ANALYTICALLY SUPPORTED FRAME** |
| `N_ij` 순서효과 | v0.x QA + synthetic long-horizon, production 일부 sorting | **AUXILIARY / NOT FULL NATIVE** |
| 이질성 | 별도 operator 불필요; 흐름결과로 관찰 | **VALIDATION LENS ONLY** |

---

# 6. 최종적으로 유지되는 과학적 증거

## A. 가장 강한 내부 흐름보존 증거

1. EX-04M: 동일 prior / 다른 PRS → 3/3 장기 trajectory 분기.
2. EX-05: 세 대체 외생흐름에서 동일 조건 9/9 반복.
3. H1: 현실화 경험 편입 → non-current → reactivation → participation → later outcome exact genealogy.
4. F1 incorporation-link: 120k×2에서 편입 한 건 차단 → 즉시 구조차이, 행동차이 0, 이후 관계 재생성.

## B. 강하게 유지되는 음성/반증 경계

1. 관계 재출현은 행동변화를 보장하지 않음.
2. 개성 prior의 일반효과는 shifted 0/9.
3. danger는 Responsibility Axis가 아님.
4. 단일 context-free causal scalar는 충분하지 않음.
5. strong external baseline 대비 OASIS-specific incremental value는 현재 미확립.
6. prehistoric 초기 코어는 final OASIS 구현이 아니었음.
7. Blind Historical v2는 contamination 때문에 paper evidence 사용 금지.

## C. 높은 가치의 방법론적 자산

1. GitHub workflow fail-closed / pipefail 교정.
2. same-frame serialization order leak 교정.
3. actual temporal order와 unordered simultaneous set 분리.
4. Reality와 Proposal, observation과 possibility, evidence와 execution authority 분리.
5. comparator treatment leakage 탐지.
6. 미래정보/미실현 possibility/reward/action-menu contamination 감사를 정규화.

---

# 7. 현재부터 사용하지 않을 구형 용어/판정

다음 표현은 과거 문서의 원시역사에는 남기되 새 기준문서/코드사양에서는 그대로 재사용하지 않는다.

- “relation field 전체 rewrite” → **현실화 경험의 기존 관계구조 편입**
- “unrealized possibility 저장/판단유보 객체가 반드시 미래에 소비” → **미실현 가능성은 독립 미래가 아니며, 생성 관계조건이 이후 새로운 가능성을 다시 만들 수 있음**
- “life invariant” → **higher value constraint**
- “danger/responsibility score” → **danger는 관측/환경 proxy; Responsibility는 별도 다차원 상태/제어축**
- “anomaly detected/recovery target” → **이질성 이후 지속 현실흐름 관찰**
- “fixed 80/1200/1800 window = OASIS memory rule” → **implementation assumption**
- “action affordance list = possibility space” → **capability/constraint와 relational possibility composition을 분리**
- “NoRelation 우위/열세 = OASIS 전체 판정” → **legacy decomposition only**
- “같은 출력 = 같은 원인” → 사용 금지
- “재현재화 = 선택기여” → 사용 금지

---

# 8. 현재 최종 상태

## 8.1 수학

**OASIS Mathematical Operator Model v1.0 — Closed Baseline**은 conceptual-operator level에서 닫혀 있다.

## 8.2 GitHub 구현

**현재 어떤 기존 branch도 Mathematical Operator Model v1.0 전체를 native production으로 구현했다고 판정하지 않는다.**

특히 미구현/부분구현:
- full native `Ω_t`
- explicit `χ_t` axis separation
- native `ρ_t`
- `A_resource`의 일관된 책임-자원 결합
- native `S_t`
- long-lived `e/q` semantics를 보존하는 scalable persistence
- external provenance-aware independent reproduction adapter

## 8.3 코드화 전 최종 원칙

다음 production 단계는 과거 branch 하나를 그대로 “완성 OASIS”로 승격하는 작업이 아니다.

진행 순서는:

**Mathematical Operator Model v1.0**
→ 각 operator의 executable specification
→ 기존 GitHub 구현에서 재사용 가능한 부분만 추출
→ `NATIVE / PARTIAL / PROXY / MISSING` 매핑
→ production 재구성
→ Flow-Preservation Gate
→ 새 검증

으로 고정한다.

과거 구현을 수학에 맞춰 억지로 해석하지 않고, **코드를 현재 닫힌 수학적·관계적 의미론에 맞춘다.**

---

# 9. 최종 한 줄 결론

> OASIS의 GitHub 역사는 실패한 코드를 버리고 성공한 코드만 남기는 계보가 아니다. 관측과 흐름의 분리, 관계 방향과 순서, 오염과 표현누출의 제거, 비현재와 삭제의 분리, 관계 재현재화와 실제 행동기여의 분리, 장기 지연효과와 중복·재생성의 발견을 거치며 현재의 Mathematical Operator Model v1.0으로 수렴한 **반증·정화·재구성의 연구계보**로 재분류한다.
