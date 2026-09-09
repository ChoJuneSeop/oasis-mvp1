# Gamma v2.1 설계잠금

2026-09-09. 선행 킬서치 commit `17e036f`. 기존 코드 기준 `1ec3c3684d7004820bf998440039de84e53138e3`.

연구질문: 현재 현실/과거 관계/재진입 규칙/참여/canonical Omega 및 공통 후보 R_c를 유지하면서 과거 과정 브리지 후보 생성만 차단하면 이후 외부 현실 흐름이 달라지는가?

- G0: 기존 v2 canonical Omega + historical process bridge(과거 과정 브리지).
- G1: Gamma override 금지. 동일한 activeRelations/participation으로 canonical Omega를 생성한다. 추가 브리지 생성 호출만 차단한다.
- G2: canonical Omega/primitive는 원래 activeRelations를 받는다. 브리지 생성에 넘기는 복사본에서 sourceSigmaActions 순서만 기존 해시 방식으로 섞는다. 원본 역사/관계/참여자/행동 multiset은 불변이다.
- G3: 동일 현재 상태의 G0 브리지 수와 sigma 깊이 분포를 현재 물리적으로 가능한 후보로 맞춘다. 기존 sham pool 생성/해시 정렬을 재사용하고 실제 활성 과거 adjacency(인접 행동 순서)는 제외한다. 중복 후보로 수를 부풀리지 않는다. raw 및 life-admissible(생명 조건 통과) 수/깊이를 검사한다. 부족하면 해당 seed를 감사 실패로 봉인하며 confirmatory 전체 통과를 주장하지 않는다. 조건/seed를 바꾸지 않는다.

개입은 최초 적격 의사결정 직전 활성화하고 이후 각 현재 상태에서 동일한 후보 생성 규칙을 적용한다. 이후 자연히 갈라진 세계를 강제로 같게 맞추지 않는다. 동일성 감사는 같은 현재 입력의 G0/G1 반사실 비교로 수행한다.

## 동일성 의미

공통 후보 전체 객체 및 A_c/R_c/B_c/sigma/K_c 각각 deep strict equality(중첩 구조까지 엄격한 동일성), activeRelations, participation, historyRelations, primitive, kappa, Psi, 후보별 responsibility, life 판정, 선택기에 전달되는 공통 관측/참여/관계/round/공통 후보 입력을 검사한다. 유일한 원인 개입은 브리지 후보 존재다.

기존 선택 함수의 정규화는 유지한다. P(c)=exp(Psi(c))/sum(exp(Psi))이므로 후보 집합이 바뀌면 공통 후보의 P(c)는 바뀔 수 있다. 공통 후보끼리의 조건부 정규화와 원래 Psi는 동일해야 한다. 전체 choice payload의 후보 목록과 정규화 확률까지 동일하다고 보고하지 않는다. 이 구분은 결과 관찰 전에 명시했다.

세계의 가려진 RNG(난수 생성기) 상태와 전체 actor/world 상태를 읽기 전용 계측으로 노출한다. 기존 파일을 수정하지 않고 동등한 복사본을 사용하며, 원본 대비 변화는 난수 상태 읽기와 감사 snapshot뿐임을 자동 검사한다. 선택 난수는 seed/actor/observation id/round 해시로 생성되는 무상태 함수이며 입력과 함수 원본을 보존한다.

## 강화 감사와 실행 차단

실험 전 합성 양성·음성·빈 역사·연속성 중복·실제 기본 문법 동등성 검사를 수행한다. v2의 activeRelations=[] 결함, 공통 후보 R_c 변경, Psi/participation/책임/life/선택 입력 변경을 주입한 mutation test(결함 주입 검사)가 반드시 실패해야 한다.
실행 시 최초 적격 preview와 실제 개입 전 상태, 실제 choice 경계에서 동일성을 검사한다. 모든 검사 오류는 fail-closed. seed 결과/미래 궤적을 읽어 감사 문턱을 조정하지 않는다.

40 seed 및 분석 정의는 다음 사전등록 문서에서 동결한다. 설계잠금→사전등록→구현→강화 감사→40 seed→맹검 집계→사후 코드감사 순서를 commit과 Actions 의존성으로 남긴다.
