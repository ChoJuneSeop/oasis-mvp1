# OASIS G3 Completed Experience / Relation-Process Closure Design

상태: DRAFT / NOT FROZEN
목적: Completed Experience의 편입 조건을 고정 시간·거리·상태변화 없이 연속 현실 흐름 안에서 정의한다.

---

## 1. 핵심 원칙

Completed Experience는 '현실이 끝났다'는 뜻이 아니다.

하나의 현실화에 연결된 관계과정이 역사적 관계요소로 편입 가능한 경계에 도달했다는 뜻이다.

따라서 relation-process closure는 terminal state와 다르다.

완결된 경험의 종착점은 동시에 다음 현실 흐름의 일부다.

---

## 2. 과도한 완결조건 금지

다음 조건을 일반적 Completed Experience 필수조건으로 두지 않는다.

- 반드시 관계상태가 변화해야 한다.
- 반드시 위치가 변해야 한다.
- 반드시 reward가 발생해야 한다.
- 반드시 성공 또는 실패 판정이 있어야 한다.
- 고정 N초가 지나야 한다.
- 고정 거리 이상 이동해야 한다.
- 고정 frame count를 충족해야 한다.
- 관계가 물리적으로 완전히 사라져야 한다.

특히 '관계상태 변화가 없었다'는 이유만으로 경험을 미완결로 판정하지 않는다.

---

## 3. 최소 완결구조

하나의 경험 E_k가 historical admission 대상이 되려면 최소한 다음이 필요하다.

### CE-1. Actual Realization

실제 현실에 정확히 하나의 가능성이 현실화되어야 한다.

sum_c y_tau(c) = 1

counterfactual branch는 Completed Experience가 아니다.

### CE-2. Observed Outcome

현실화 이후 실제 흐름에서 관측된 outcome이 있어야 한다.

Outcome은 reward 또는 평가라벨과 동일하지 않다.

관찰 가능한 변화, 유지, 무변화, 중단, 회복, 새로운 관계 형성 등 모두 outcome이 될 수 있다.

### CE-3. Relation-Process Closure Evidence

이 현실화가 시작하거나 변경한 관계과정이 historical admission 가능한 경계에 도달했다는 evaluator evidence가 있어야 한다.

Closure는 고정 시간규칙이 아니라 현재 관계과정에 대한 근거다.

### CE-4. Provenance Integrity

현재 현실 근거, 실제 현실화, outcome, closure, 그리고 판단에 실제 참여한 historical source가 존재했다면 그 genealogy를 잃지 않아야 한다.

### CE-5. Forward Causal Order

Decision <= Realization <= Outcome <= Closure

미래 outcome 또는 closure가 과거 decision 계산에 역으로 들어가면 안 된다.

---

## 4. Closure with Continuation

OASIS는 연속 현실 흐름을 다루므로 관계가 계속된다고 이전 경험을 영원히 미완결로 둘 수 없다.

따라서 closure는 '관계 소멸'만을 뜻하지 않는다.

관계가 지속되는 경우에도 다음 조건을 만족하면 이전 relation episode는 닫히고 다음 현재 관계로 이어질 수 있다.

1. 이전 현실화의 직접 outcome이 관측되었다.
2. 이전 decision에 귀속되어 추적하던 relation-process의 현재 상태를 evaluator가 명시할 수 있다.
3. 계속되는 관계가 다음 decision epoch의 current relation으로 이어지는 genealogy link를 가진다.
4. 이전 episode에서 아직 추적되지 않은 핵심 consequence를 임의로 버리지 않는다.

이를 Closure with Continuation이라고 한다.

즉,

closed historical episode
-> continuation link
-> next current relation

구조가 허용된다.

이 방식은 '관계가 계속된다 = 경험이 완결될 수 없다'는 문제를 피하면서도 흐름을 끊지 않는다.

---

## 5. Closure evidence의 성격

closure evidence는 도메인별로 다를 수 있다.

예:

- 상호작용 참여자 관계의 종료 또는 전환 근거
- 이전 현실화의 직접 영향이 관측 가능한 범위에서 정리되었다는 근거
- 다음 decision epoch로 relation lineage가 인계되었다는 근거
- 외부 evaluator가 이전 episode와 다음 episode의 경계를 구별할 수 있는 근거

이 예시는 고정 enum이 아니다.

각 도메인의 relation-process semantics에 따라 다른 evidence가 추가될 수 있다.

---

## 6. 무변화 outcome

현실화 후 관찰된 상태가 외형적으로 동일할 수 있다.

이 경우에도 다음이 가능하다.

- 현재 상태 유지가 실제 현실화의 결과일 수 있다.
- 위험이 발생하지 않은 것이 관측 outcome일 수 있다.
- relation role은 유지되었지만 책임 또는 가능성 구조가 달라졌을 수 있다.
- 관계과정이 종료되고 동일 형태의 새로운 관계가 다음 epoch에 다시 형성될 수 있다.

따라서 Delta-X != 0을 Completed Experience의 보편적 필수조건으로 두지 않는다.

---

## 7. Failed / Risky Experience도 편입 가능

Completed Experience는 좋은 경험만 저장하는 구조가 아니다.

다음도 편입 가능하다.

- 잘못된 선택
- 위험이 증가한 현실화
- 검증이 충분하지 못한 채 시간제약으로 현실화된 선택
- 회복 과정
- 목표 미달성
- 무변화

단, 실제 현실화와 실제 outcome, relation-process closure, provenance가 있어야 한다.

이렇게 해야 이후 현실에서 실패 경험도 현재 관계에 따라 재참여할 수 있다.

---

## 8. 현재 구현과의 정합성

현재 HistoryEntry는 다음을 이미 요구한다.

- forward causal order
- exactly one realization
- observed outcome
- closure method
- closure evidence

현재 HistoryAdmissionBridge는 다음을 이미 요구한다.

- 실제 HistoryEntry에서 closed relation element를 추출
- relation element completion time과 evidenced closure time의 일치
- 빈 historical anchor 생성 금지
- recency/importance semantics의 historical semantic context 침투 금지

따라서 현재 구현 방향은 본 설계와 대체로 정합적이다.

다만 다음 보완이 남는다.

1. closure가 관계소멸뿐 아니라 continuation handoff도 표현할 수 있어야 한다.
2. Completed Experience provenance에 responsibility/choice genealogy가 추가되어야 한다.
3. delayed consequence가 존재할 수 있는 도메인에서는 closure scope를 실험설계에서 명시해야 한다.

---

## 9. Closure Scope

완결을 주장할 때는 실험 또는 도메인이 추적하는 관계범위를 명시해야 한다.

ClosureScope(E_k) = 이 경험이 완결되었다고 말할 때 실제로 추적한 관계과정의 범위.

이는 '모든 미래 영향이 끝났다'는 주장이 아니다.

오히려 다음을 명확히 한다.

- 무엇을 outcome으로 추적했는가.
- 어떤 relation-process가 닫혔다고 판단했는가.
- 어떤 지속관계는 다음 epoch로 넘겼는가.
- 어떤 장기효과는 아직 미확정으로 남는가.

따라서 단기 실험이 장기 인과 전체를 닫았다고 과장하는 것을 방지한다.

---

## 10. G3 동결 전 검증 질문

- 관계상태 변화가 없어도 실제 realization/outcome/closure가 있으면 Completed Experience를 만들 수 있는가.
- 관계가 지속될 때 continuation link로 이전 episode를 닫고 다음 current relation으로 넘길 수 있는가.
- closure가 fixed time/distance/frame threshold에 의존하지 않는가.
- 실패 또는 위험 결과도 historical relation으로 편입 가능한가.
- delayed consequence를 무시한 채 조기 closure하지 않도록 ClosureScope를 기록하는가.
- closure 이후에도 다음 현실 흐름과 genealogy가 이어지는가.

# English explanation

A Completed Experience does not mean that reality or the relationship has ended. It means that one realized relation-process episode has reached a justified boundary where it can be admitted into historical relational memory.

Closure does not require a state change, reward, success label, fixed duration, fixed distance, or disappearance of the relationship. A continuing relationship may close one episode and continue into the next current relation through an explicit continuation link.

The design therefore distinguishes relation-process closure from a terminal condition and requires the experiment to state its closure scope so that short-term observation is not misrepresented as closure of all future consequences.
