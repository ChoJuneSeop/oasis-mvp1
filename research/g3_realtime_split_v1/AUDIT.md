# 3계층 런타임 감사와 검증 범위

기준 커밋: 74ec39bd4bee340dc363f5beec1b91324b3b357a.
OF-01 A6는 보존한다. 이 변경은 새 실행 후보이며 기존 실험의 재실행이나
CARLA 성능 증거가 아니다.

## 구현 전 감사 / Audit

- OrganicHarness._record_probes는 H개 관계마다 전체 history를 다시 평가한다.
  다중 출처 Reconstruction(재구성)의 joint probe(공동 제거 검증)도 추가된다.
  H²는 코드 구조상의 병목 후보이며 실제 CARLA 지연의 단독 원인으로 확정하지 않는다.
- 기존 deferred worker(지연 처리 작업자)는 thread(스레드)라 Python CPU 연산을
  프로세스로 격리하지 못하며, 제출 객체가 깊게 고정되어 있지 않았다.
- 이전 미완성 수정은 동결 live_runner.py에 연결되어 있었다. 이 파일은 원래 내용으로
  복원하고, split 패키지에 별도 실행기를 두었다. 동결 manifest는 수정하지 않는다.
- Windows checkout의 CRLF 변환으로 동결 해시가 달라졌다. LF 복원 시
  __init__.py의 SHA256이 manifest와 정확히 일치함을 확인했다.

## 킬서치 / 필요성과 반증 검토

실험 전 필요성 검토는 새로운 CARLA 실행 대신 필요한 계약 회귀에 한정한다.
Python 공식 multiprocessing 문서
https://docs.python.org/3/library/multiprocessing.html
에서 spawn 직렬화, Queue feeder의 지연 직렬화, 다중 생산자 순서,
프로세스 종료 시 큐 손상·종료 대기 위험을 확인했다.

이 근거만으로 성능 개선을 주장할 수 없다. 프로세스 격리도 직렬화 비용,
전체 history 평가, 메모리 누적을 제거하지 않는다. 따라서 검증 목적은
(1) action 경로의 ablation 부재, (2) 동일 스냅샷의 G3.2 기록 동등성,
(3) 지연·실패가 action을 기다리게 하지 않는지, (4) publication 인과 순서,
(5) 동결 계약 보존으로 제한한다. 사용자 실험이나 A6는 실행하지 않는다.

## 흐름과 인과성 / Flow and causality

Reality/Action(현재 행동)은 기존 책임·선택·권한·원자적 적용 계약을 상속한다.
관측, 현재 tau, revision, 해당 epoch의 history와 평가 연산자를 bytes로 고정한다.
성장하는 책임 전이 ledger와 CARLA 객체는 검증 스냅샷에 넣지 않는다.

Observation/Validation(관측 검증) 프로세스가 스냅샷 해시·결정 연결과 분포
재현을 확인하고 기존 G3.2 individual/group ablation 기록기를 실행한다.
그 결과가 연결된 결정 기록과 post 관측을 하나의 FIFO 생산자로
Relation/Experience(관계 경험) 프로세스에 전달한다. 이 때문에 검증 지연은
관계 계층의 입력을 늦출 수 있다. 그 지연은 backlog로 남고 action은 기다리지 않는다.

관계 계층이 기존 Relation Episode, Closure(관계 종결), Completed Experience
(완결 경험), archive(과정 보관) 계약을 실행한다. 기록 완료 후 검증된 history
전체 상태를 publication(게시)한다. 현재 열린 epoch는 기존 참조를 유지하고,
같은 epoch를 다시 열어도 새 게시를 보지 않는다. 다음 epoch에서만 수용한다.
과거 Closure 시각과 decision-time provenance(결정 당시 출처 이력)는 고치지 않는다.
publication 수신·가시화 시각은 별도 운영 계측이며 과거 결정에 소급하지 않는다.

## 계측과 실패 / Metrics and failure

action: decision latency(판단 시작부터 적용 호출), actuation latency(적용 호출 시간),
스냅샷 직렬화 시간·크기, 전체 action 경로 시간.
validation/relation: 처리 건수, backlog(미처리 수), 최대 backlog,
queue delay(큐 대기 시간), processing latency(처리 시간), 각 최대값과 프로세스 ID.
publication: 전달 지연 초, 원천 epoch, 수신 후 가시화 시간 및 epoch 차이.
프로세스별 JSONL 기록과 action audit에 계측을 남긴다.

검증 또는 관계 프로세스 실패와 비정상 종료, 제출 직렬화 실패, drain 실패는
degraded(불완전) 상태로 보존한다. 이후 행동은 계속 가능하지만 실험 완전성은 fail이다.
drain(미처리 작업 완료 대기)은 action 경계에서 금지되고 관측 종료 경계에서만 허용한다.
종료 대기 한도는 인프라 실패 판정이며 의미적 관계 종결 시간으로 사용하지 않는다.
열린 관계는 right-censored(관측 종료 시 미완결)로 남긴다.

고정 pending 제한·강제 종결·의미적 timeout은 없다. 큐 확인의 64건 한도는
한 번의 통신 확인 작업량 제한이며 남은 이벤트를 버리지 않는다.
처리 유입이 지속적으로 용량을 초과하면 메모리가 계속 늘 수 있다.
실제 현재 흐름에서 지연·메모리·완전성을 관측해야 하며 hard real-time 보장은 아니다.

동일 스냅샷에서의 검증 기록 동등성과 실제 실행 궤적 동등성은 별개다.
비동기 게시로 과거 경험이 현재에 참여할 수 있게 되는 epoch가 달라지면,
오아시스가 구성하는 현재 관계·책임·선택도 달라질 수 있다. 그 차이는
특정 좌표의 결과 점수보다 게시가 도착한 시점의 연속 흐름으로 분석해야 한다.

## 사용과 검증 / Usage and verification

새 실행기는 research.g3_realtime_split_v1.live_runner 모듈이며 기존 host
실행기와 A6 승인 파일을 변경하지 않는다. 새 namespace와 별도 출력 폴더를 사용하고,
OF-01 attempt 6 및 OF-01-A6 하위 출력 경로를 시작 전에 거부한다.
기존 초기 환경 조건을 재사용하되 candidate source SHA256을 따로 기록한다.
이 개발 작업에서는 실행기를 실제 CARLA에 연결하지 않았다.

회귀 테스트의 가짜 flow는 임시 폴더에서만 2틱을 처리하여 성공/실패 상태를 검증한다.
출력의 empirical 표시는 실행기 상태 계약을 검사하는 fixture이며 실제 증거가 아니다.
전체 테스트에는 기존 frozen tests와 새 split tests가 포함된다.
