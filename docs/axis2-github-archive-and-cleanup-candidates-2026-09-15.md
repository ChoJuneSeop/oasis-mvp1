# 2축 GitHub 보관 및 로컬 정리 후보

- 작성일: 2026-09-15
- 원격 저장소: `https://github.com/ChoJuneSeop/oasis-mvp1.git`
- 원칙: 실행 증거의 원본을 자동 삭제하지 않는다. GitHub 반영 확인 후에만 재생성 가능 파일을 정리한다.

## GitHub에 보관할 소스·설계

다음은 2축의 재현성과 논문 근거에 필요한 소스이므로 커밋 대상이다.

- `research/governance_reality_gap_v1/`
- `experiments/governance_axis2/`
- `docs/axis2-experimental-design-v1-2026-09-15.md`가 저장소에 존재할 경우 해당 설계 문서
- 본 문서

## GitHub에 보관할 요약 증거

대형 반복 실행 원본 전체 대신 다음의 최상위 JSON 요약과 hash를 보관한다.

- `runs/governance_axis2/track_a_stage02_003/axis2_track_a_stage02.json`
- `runs/governance_axis2/pre_stage3_control_audit_002/control_audit.json`
- `runs/governance_axis2/track_a_stage03_001/stage03.json`
- `runs/governance_axis2/pre_stage4_audit_001/gate.json`
- `runs/governance_axis2/track_a_stage04_001/stage04.json`
- `runs/governance_axis2/pre_stage5_audit_003/gate.json`

## 로컬 정리 후보: 즉시 재생성 가능

다음은 GitHub에 올리지 않고 삭제 가능한 캐시다. 현재 합계는 약 1.3 MB다.

- 모든 `__pycache__/`
- 모든 `*.pyc`

## 로컬 정리 후보: GitHub 반영 확인 후 재생성 가능

다음은 요약 JSON의 hash가 GitHub에 보존된 뒤에만 정리 후보가 된다.

- `runs/governance_axis2/track_a_stage03_001/runs/` 약 4.5 MB
- `runs/governance_axis2/track_a_stage04_001/runs/` 약 7.6 MB
- 이전 Stage 2 진단 반복본 `track_a_stage02_001`, `track_a_stage02_002`

이들은 Stage 3/4의 seed별 원본이므로, 논문 심사나 재현 요청에 대비해 외장 보관소 또는 GitHub Release/LFS로 이동하기 전에는 삭제하지 않는다.

## 보존·정리 보류 대상

- `.runtime/carla-py312/`: Stage 5 runner가 사용하는 CARLA Python API. Stage 5 재시도·완료 전 삭제 금지.
- `C:\OASIS_AXIS2_STAGE5_OUTPUT\...\OF-01-A2`: 6,300 tick의 불완전 empirical run. 약 20.4 GB이며 `valid_complete=false`다. 실패 원인·상태·hash를 별도 보존하기 전 삭제 금지.
- 다른 `C:\OASIS_*_OUTPUT` 폴더: 현재 저장소 밖의 별도 실험 증거다. 이 문서의 정리 범위에서 제외한다.

## 권장 실행 순서

1. 소스·설계·최상위 요약 JSON만 커밋한다.
2. 원격 `origin`에 push된 commit을 확인한다.
3. `.gitignore`에 Python cache, Stage 3/4의 seed별 raw run, 로컬 runtime을 추가한다.
4. cache를 삭제한다.
5. 대형 원본은 Release/LFS 또는 별도 보관소로 이관한 뒤에만 삭제한다.
