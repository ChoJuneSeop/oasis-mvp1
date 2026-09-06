# OASIS Founding Flow Checkpoint — 2026-09-06 — v11

## 브랜치

`architecture/oasis-unified-validation-system-v1`

`main` 미병합.

---

## 현재 고정 원칙

- 시조의 기본 구조는 고정한다.
- 각 시조가 원래 허용하는 내부 상태 변화만 허용한다.
- 실험자가 후대 기능이나 OASIS형 능력을 비교군에 추가하지 않는다.
- 동일 외부 현실, 독립 대응, 고유 원리 보존, 내부 변화 허용.
- OASIS는 현재 흐름 속에서 관찰한다.
- 정답·승자·보상·성공경로를 사전 주입하지 않는다.
- 관계를 만들어주는 것은 금지하고, 만들어진 관계를 관찰하는 것은 허용한다.
- 우리는 객관적 설계자이자 객관적 관찰자이며, 역사를 대신 쓰지 않는다.

Canonical:

> **시조는 우리가 정의하지만, 그들의 역사는 우리가 쓰지 않는다.**

---

# 1. v9 상태

Founding Flow v9는 C6 교정 범위에서 유효하게 완료됨.

핵심 수정:

- `current-state`
- `outcome-mutation`
- `derived-observation`
- `choice-relation`

을 역할 수준에서 분리.

실제 `remove`가 기존 current-state `upsert`와 충돌해 소실되는 문제 제거.

### v9 원본 실행

- Workflow run: `34001718068`
- Original job: `101401646958`
- Frozen head: `7eb20deceb4dd0b9bd468bf7327077486fce51d9`
- Original artifact: `9979674335`

### v9 재실행

- Re-run job: `101406640294`
- Re-run artifact: `9980214826`

내부 산출물 byte-for-byte 동일:

- `founding-flow-v9.json` SHA-256: `10469ad23d980007da51adf2119c0baa54bc36ee96e835d57b9c31eed135af6f`
- `founding-flow-v9.log` SHA-256: `6471694bbcb7647bf138754ae8349588137cedbeed07b913a07ba18aabc355c6`

v9 판정:

**Execution-valid / C6 fix-valid / reproducible / not paper superiority evidence.**

관련 저장문서:

- `experiments/founding-flow-v9/POST_RUN_AUDIT.md`
- `docs/FOUNDING_FLOW_V9_REPRODUCIBILITY_2026-09-06.md`

---

# 2. Pre-Main Overall Audit에서 발견한 CI false-green

전체 구현감사를 새로 만들었으나 최초 run `34003839055`가 GitHub UI상 success로 보였음.

실제 원인:

```bash
node tools/oasis-pre-main-overall-audit.mjs | tee ...
```

에서 `pipefail`이 없어 Node 실패가 `tee` 성공코드에 가려짐.

즉 이것은 **false green — 거짓 성공**.

실제 실패는:

> Same-time relation array permutation changed structural identity; serialization order became a hidden semantic condition.

이었다.

### false-green 교정

workflow에:

```bash
set -o pipefail
```

을 추가.

교정 후 run:

- `34003887498`
- job `101407499544`

은 동일 오류를 정확히 **failure**로 기록함.

이후 모든 관련 workflow는 fail-closed를 유지해야 한다.

---

# 3. C7 확인 — Founding Flow v10

C7 이름:

**Simultaneous Relation Serialization-Order Leakage**

한국어:

동일 시점·동일 관계집합인데 relation 배열의 직렬화/삽입 순서만 달라져 OASIS 구조정체성이 달라지는 구현 누출.

v10은 read-only necessity audit로 수행.

### v10 실행

- Workflow run: `34003981662`
- Job: `101407752786`
- Head: `9efb271ddea82abf5d0395b188c8b09c88462a9e`
- Artifact: `9980348561`

### v10 결과

**C7_CONFIRMED**

Twin A / Twin B:

- semantic relation set: 동일
- proposal: 동일 (`idle`)
- relationSignature 배열: 다름
- structureKey: 다름

즉 배열순서가 숨은 structural condition으로 들어가고 있었음.

동시에 positive controls는 PASS:

- 서로 다른 frame의 시간순서 `A→B` vs `B→A`는 정상적으로 구분됨.
- 관계 방향 `A→B` vs `B→A`도 정상적으로 구분됨.

따라서 수정범위는:

> **동시·무순서 관계집합의 표현만 canonicalize하고, 실제 temporal history는 보존한다.**

---

# 4. v11 — C7 수정

Founding Flow v11 구현:

- `src/validation/founding-flow-v11-ancestors.mjs`
- `tools/founding-flow-v11.mjs`
- `.github/workflows/founding-flow-v11.yml`

핵심 원칙:

- same-frame concurrent relation set canonicalization
- completed experience 내부의 unordered context/outcome relation set canonicalization
- choice-relation process order 보존
- experience sequence 보존
- relation direction 보존
- OASIS core / integrated core / reference core 미수정
- comparator 미수정

---

# 5. v11 첫 실행에서 발견된 role regression

v11 첫 실행은 C7 자체는 통과했으나, `reconstituteAffinityField()`를 validation layer에서 재구현하는 과정에서 v9의 current relation role tagging이 우회됨.

증상:

- 현재 explicit relation이 `state:`가 아니라 `legacy-upsert:`로 표현됨.

즉 C7은 고쳤지만 C6의 역할표현을 일부 회귀시킴.

따라서 첫 v11 실행은 최종 유효본으로 사용하지 않는다.

---

# 6. v11 role regression 재수정

수정:

current relation canonicalization 전에 v9 의미를 다시 적용:

- explicit current relation → `current-state`
- geometry-derived relation → `derived-observation`

별도 regression guard 추가:

`tools/founding-flow-v11-role-regression.mjs`

강제 조건:

- explicit relation signature가 `state:`를 유지해야 함.
- derived relation signature가 `observe:`를 유지해야 함.
- current relation이 `legacy-*`로 떨어지면 실패.

---

# 7. 최신 v11 유효 실행

최신 실행:

- Workflow run: `34004227886`
- Job: `101408407616`
- Head: `df0ef837ed2e92a70d322a8470f0283d46d4260c`

전 단계 성공:

1. Syntax check — PASS
2. Base implementation pin — PASS
3. Unified-system contamination boundary audit — PASS
4. V11 current relation role regression guard — PASS
5. Founding Flow v11 four-axis and C7 audit — PASS
6. Full 5-seed Founding Flow v11 execution — PASS
7. Artifact upload — PASS

따라서 현재 v11은:

**C7 fix-valid + v9 role semantics preserved + C1/C3/C5/C6 regression guards passed + full 5-seed execution passed.**

단, 아직 본 논문 실험 증거가 아니다.

---

# 8. 아직 완료되지 않은 마지막 문턱

아직 **Pre-Main Overall Implementation Audit 전체 재통과**가 남아 있다.

이전 overall audit는 v9 기준으로 C7에서 실패했다.

다음 단계에서는 overall audit가 v11 OASIS validation implementation을 사용하도록 갱신하고 다음 경계를 한 번에 다시 확인해야 한다.

- reality ↔ possibility 분리
- current state ↔ future outcome 분리
- completed experience ↔ raw co-presence 분리
- founder-only hub 방지
- far-spatial overconnection 방지
- common-actor-only support 방지
- mutation polarity 보존
- current-state ↔ outcome-mutation role 분리
- same-frame serialization permutation invariance
- temporal history order 보존
- relation direction 보존
- outcome provenance 보존
- comparator independence
- no automatic baseline injection
- no reward/score/winner/action-menu injection
- forbidden regression scan
- CI fail-closed

**이 overall audit가 PASS하기 전에는 고정 시조 본실험으로 복귀하지 않는다.**

---

# 9. 현재 논문 증거 경계

현재까지의 v9-v11 결과는 모두:

- 구현 충실도 검증
- 오염 제거
- 표현 경계 검증
- 재현성 확인

에 해당한다.

아직 다음을 주장하지 않는다.

- OASIS 우월성
- OASIS 고유성
- OASIS의 문화적 우위
- 세대 발전 우위
- 문명 형성 우위

본 시조 실험의 핵심 질문은 여전히:

> **같은 현실을 오래 살아갈 때 서로 다른 출발구조는 각각 어떤 역사를 만들어가는가?**

그리고 고정 시조 범위에서는:

> **각 시조의 원형을 바꾸지 않았을 때, 그 시조가 본래 가진 현실대응 원리만으로 무엇이 축적되고 무엇이 외부 현실에 남는가?**

이다.

---

# 10. 다음 실행 순서

1. Pre-Main Overall Implementation Audit를 v11 기준으로 갱신.
2. fail-closed CI 실행.
3. 하나라도 FAIL이면 본실험 중단 후 해당 항목만 별도 킬서치/수정.
4. 전체 PASS 시 fixed-original founder main experiment용 별도 킬서치.
5. OASIS Pre-Experiment Four-Axis Audit.
6. preregistration freeze.
7. 그 뒤에만 본 시조 실험 실행.

---

## 현재 상태 한 줄

**v11까지의 개별 구현오염은 현재 최신 감사범위에서 교정됐지만, 전체 통합 구현감사 재통과 전이므로 본 시조 실험은 아직 시작하지 않는다.**
