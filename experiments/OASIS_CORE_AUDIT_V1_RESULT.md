# OASIS Core Implementation Validity Audit v1

대상: 현재 `prehistoric-society-v3-*` OASIS 구현

운영 정의를 실험 전에 고정한 6개 검사로 검증했다.

결과: **0/6 통과, 6/6 불일치** (`implementation-mismatch`).

1. 새 후보 생성: 실패 — 현재 `oasisDecide`는 전달된 행동 목록 내부에서만 선택한다.
2. 다른 ID의 구조적으로 같은 관계 재활성화: 실패 — 구체 ID가 일치하지 않으면 활성화되지 않았다.
3. 현재 관련성이 있어도 고정 나이 제한을 넘은 관계 재활성화: 실패 — 1800틱 창에 의해 제외됐다.
4. 관계 집합 크기에 따른 조합 구조 변화: 실패 — `recombine`은 1개와 3개 관계에서 동일한 이진값이었다.
5. 선택축/책임축의 동적 상호작용: 실패 — 사전식 tuple에서 책임축이 뒤의 관계항을 완전히 지배할 수 있었다.
6. 반복 관계과정의 순서 보존: 실패 — 동일 signature는 최신 episode로 덮어쓰고 전체 history도 최근 160개로 절단한다.

이 결과는 OASIS 이론의 반증이 아니라 **현재 구현의 타당성 실패**다. 따라서 이 구현으로 수행된 장기 역사/개성 실험은 OASIS 이론의 성능 또는 우월성 근거로 사용하지 않는다.

실행 파일: `experiments/oasis-core-audit-v1.mjs`
워크플로: `.github/workflows/oasis-core-audit-v1.yml`
