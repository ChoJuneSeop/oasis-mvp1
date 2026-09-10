# OASIS Reality Incorporation v1

상태: 구현 기준 초안

## 목적
현실화된 경험을 단순 로그로 남기는 데서 끝내지 않고, 현실화 직후 그 완결 경험이 이후 현실의 production state에 포함되도록 한다.

## 원칙
1. 모든 `outcome()` 현실화는 NPC 존재 여부와 무관하게 정확히 하나의 `Realized Experience / 현실화된 완결 경험`을 만든다.
2. 완결 경험은 `realizedExperienceHistory`에 보존된다.
3. 동시에 `realityContinuity.completedExperienceIds`에 편입되어 이후 현실이 이미 그 과거를 포함한 상태임을 명시한다.
4. 기존 `relationHistory`는 NPC 관계사건 이력으로 유지한다. 일반 현실화 경험을 억지로 `relationHistory`에 넣지 않는다.
5. 동일 현실화에서 발생한 `relationHistory` 항목에는 `sourceExperienceId`만 연결한다. 기존 관계판단 의미는 바꾸지 않는다.
6. 새 편입층은 당장 선택 점수나 관계 재활성 규칙에 사용하지 않는다. 먼저 현실연속성만 구현한다.
7. 이후 판단에서 어떤 과거 경험이 관계적으로 유의미해지는지는 별도 검증 문제다.

## 흐름
`Decision -> Single Realization -> Realized Experience -> Incorporation into Reality Continuity -> Next Reality`

한국어:
`판단 -> 단일 현실화 -> 완결된 현실화 경험 -> 현실 연속성에 편입 -> 그 과거를 포함한 다음 현실`

## 구현 필드
- `P.realizationSeq`
- `P.realizedExperienceHistory`
- `P.realityContinuity.version`
- `P.realityContinuity.completedExperienceIds`
- `P.realityContinuity.lastExperienceId`

`relationHistory`는 기존 의미를 유지하며, 새로 생성된 항목에만 `sourceExperienceId`를 덧붙인다.
