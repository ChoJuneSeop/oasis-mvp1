# OASIS 통합 업무 시스템 1.1 — 특허·실험·투자자료 교차 감사

기준일: 2026-09-08

## 1. 목적
논문/실험의 현재 증거수준보다 특허 또는 투자자료의 기술·실증 문구가 강해졌는지 점검한다. 특허 청구의 법적 권리범위와 실험적 입증수준은 같은 것이 아니므로 분리한다.

## 2. 특허 청구범위와 현재 증거

### 정합성이 높은 부분
- 청구항 1(a)~(g)의 현실상태 → 관계과정/참여 → 후속 가능성 → 결정 → 실제 결과 → 후속 조건 반영의 전체 구조는 현재 OASIS 연구흐름과 의미론적으로 정합적이다.
- 청구항 3~5의 비참여/후보/참여 전이, 현재 유효조건, 저장시 미래 중요도 비고정은 현재 비현재/재현재화 관점과 정합적이다.
- 청구항 13~16의 관계과정 차이에 따른 후속 구조 차이, 신규 관계에 의한 조합 확장, 동일 상태 복귀 비필수는 내부 실험에서 부분적으로 관찰되었다.
- 청구항 9의 `과거 경험정보를 삭제하지 않고 관계형성 또는 판단참여 조건을 변경`은 OASIS의 `비현재 != 삭제` 원칙과 정합적이다.

### 실험적으로 아직 승격하면 안 되는 부분
- 청구항 1/17/19의 `복수 후속 가능성 후보 구성`은 특허 구조로는 유지되지만, 현재 production에서 논문 이론 전체와 동치인 native Possibility Composition operator가 직접 계측·검증된 것은 아니다. 현 증거에는 instrumentation projection이 포함된다.
- 청구항 10~11의 차량/로봇/제조/물류/네트워크 도메인 적용은 권리범위/실시예로 유지할 수 있으나, 현재 official full-flow engine의 독립 외부 재현이 완료됐다는 실증 문구로 사용하면 안 된다.
- 책임축과 Self-Intervention은 최신 핵심 연구축이지만 현재 청구범위의 기본 구조와 별개로 production native operator 검증이 미완료다.

판정: `PATENT STRUCTURAL CONSISTENCY = PASS WITH EVIDENCE-LEVEL BOUNDARY`.
특허 청구범위 자체를 실험결과 때문에 축소할 근거는 이번 감사에서 발견하지 못했다. 다만 특허의 권리범위를 곧바로 `실증 완료`로 표현해서는 안 된다.

## 3. 투자자 덱 감사

### 유지 가능한 문구
- `우월성 증명이 아니라 관계과정의 인과적 차이를 분리하는 synthetic smoke test`라는 제한은 적절하다.
- `모든 실제 산업에서 기존 AI보다 우월하다는 일반화`, `현실 세계 causal superiority의 외부 독립 검증`, `대규모 상용 트래픽 비용/latency 우위`를 아직 주장하면 안 된다고 명시한 Due Diligence 문구는 최신 결과와 정합적이다.
- 외부 재현, 산업 샌드박스, 비용 실증, 안전 실증을 다음 자본의 검증목표로 둔 것도 현재 증거수준과 정합적이다.

### 수정이 필요한 문구
1. **Responsibility Axis**: `위험이 커질수록 검증·탐색·연산예산 확대`를 현재 구현된 연산자처럼 표시하면 과장이다. 현재 danger는 Responsibility와 동일하지 않고 독립 native Responsibility operator는 미구현이다. `설계 가설 / 검증 예정`으로 변경해야 한다.
2. **Possibility Composition**: candidate-structure/hidden-path 관측은 존재하지만 완전한 theoretical native operator 검증이 아니다. `구현 projection/후보구조 계측`으로 표시해야 한다.
3. **Stage 30**: 단순 `FAIL / 반증 진행중` 표시는 구식이다. 최신 분류는 Stage30 `implementation/representation mismatch`, Stage31 `internal integrity but simple context-key baseline reproduces split`, Stage32 `test-only structural feasibility + production exact-key mismatch`다.
4. **폐기/비현재화**: `폐기/비현재화`를 한 항목으로 묶으면 안 된다. 비현재화는 삭제·폐기가 아니라 현재 판단 비참여 상태다. 삭제 정책이 있다면 별도 구현정책으로 분리한다.
5. **장기 기억/확장성**: `관계경험을 구조로 보존` 문구에는 production의 episode cap 80 / 기본 active-age 1,200 tick 제한을 숨기지 말아야 한다. 현재 장기 100k+ 효과는 selective-retention feasibility이지 production 무기한 보존 증명이 아니다.
6. **EVIDENCE 02**: 1,500-tick delayed relevance PASS는 legacy/internal evidence로 남길 수 있지만, `재활성화하면 판단이 바뀐다`를 일반명제로 확대하면 안 된다. 최신 H2와 새 F1에서 재출현/재생성이 있어도 15k 및 120k에서 행동분기 0인 유효 음성결과가 존재한다.

판정: `INVESTOR CLAIM TRACEABILITY = PARTIAL / UPDATE REQUIRED`.

## 4. 통합 판정
- 특허: 구조적 범위와 최신 OASIS 의미론은 대체로 정합. 실험적 입증수준과 권리범위를 구분하면 유지 가능.
- 실험: F0~F5 종합은 PARTIAL; 새 F1은 120k 유효 음성결과.
- 투자자료: 보수적 Due Diligence 문구는 양호하지만 Responsibility, Possibility Composition, Stage30, 비현재화, 장기보존 표현은 최신 증거에 맞춰 수정 필요.

최종 상태: `CROSS-ARTIFACT TRACEABILITY = PARTIAL PASS`.
불일치는 특허 핵심구조의 붕괴가 아니라, 최신 연구결과보다 앞서간 투자용 설명과 production 구현의 공백에서 발생한다.

## 5. 영문 용어 설명
- Evidence-level boundary: 특허/설계가 포괄하는 범위와 실제 실험으로 확인된 범위를 구분하는 경계.
- Claim traceability: 투자자료의 각 주장에 실제 코드·실험·결과 근거를 추적 연결하는 것.
- Native operator: 계측층이나 시험용 proxy가 아니라 production 판단흐름 안에서 실제 상태전이를 수행하는 연산자.
- Implementation projection: production 내부 상태를 직접 표현하지 못할 때 계측층이 관찰 가능한 값으로 재구성한 표현.
