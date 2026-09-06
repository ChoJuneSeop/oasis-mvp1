# Founding Flow v4 — Frozen Reproducibility Check

## 목적

Founding Flow v4의 기존 유효 실행을 최신 branch head에서 다시 실행하지 않고, **동일한 frozen commit**을 그대로 재실행하여 C1~C3 교정 결과의 재현성을 확인한다.

최신 branch에는 이후 실험들이 존재하므로 최신 head에서 v4를 다시 실행하면 실험범위가 섞일 수 있다. 따라서 기존 유효 run의 동일 job을 rerun했다.

## Frozen execution identity

- Workflow: `Founding Flow v4`
- Run: `34000997097`
- Frozen head: `1fca32a1db9b0ddffc759b2b9126911cdc122b29`
- Original attempt: 1
- Original job: `101399723880`
- Reproduction attempt: 2
- Reproduction job: `101402254320`

## Attempt 2 audit result

모두 PASS:

- Syntax check
- Unified-system contamination boundary audit
- Founding Flow v4 four-axis and selective-relation audit
- contaminated historical harness non-import check
- Founding Flow v4 execution
- raw trace upload

## Artifact identity

Original artifact:

- Artifact ID: `9979474178`
- ZIP SHA-256: `be72bc410f96062f439888ae2c5ac25b50fd49f7244c4f7a4994b92a1696145a`

Reproduction artifact:

- Artifact ID: `9979739099`
- ZIP SHA-256: `d0f6529b84cfbd6e5eab680cc6727a21f1680b4c3d736aaa66a4cd96c7f95f8c`

ZIP digest는 archive 생성 메타데이터 차이 때문에 다르다. 따라서 ZIP digest 자체를 결과 동일성 근거로 사용하지 않는다.

두 ZIP 내부 파일을 직접 비교했다.

### `founding-flow-v4.json`

- Original size: `22,095,911 bytes`
- Reproduction size: `22,095,911 bytes`
- Original SHA-256: `6b88bb4891f43c67842b3464cf77773a6a41c2a60d32f4f7a8eef7b768cc08b4`
- Reproduction SHA-256: `6b88bb4891f43c67842b3464cf77773a6a41c2a60d32f4f7a8eef7b768cc08b4`
- Result: **byte-for-byte identical**

### `founding-flow-v4.log`

- Original size: `29,171 bytes`
- Reproduction size: `29,171 bytes`
- Original SHA-256: `34a315e35bb24c178572096e8ba19194c9195666a4d7810e95871d6819874e31`
- Reproduction SHA-256: `34a315e35bb24c178572096e8ba19194c9195666a4d7810e95871d6819874e31`
- Result: **byte-for-byte identical**

## 판정

**Founding Flow v4 frozen reproduction: PASS.**

이 재현실행은 기존 v4 해석을 확장하지 않는다.

보존되는 판정:

- C1 generic-founder reactivation collapse: fix reproduced
- C2 far-spatial complete graph: fix reproduced
- C3 common-actor affordance support: fix reproduced
- C5 snapshot co-occurrence relevance contamination: still open
- C4 full observed outcome-process restoration: intentionally still open

따라서 v4는 계속:

**Execution-valid / C1-C3 fix-valid / reproducible / still not paper claim evidence.**

다음 실험은 기존 사후감사에 따라 world, seeds, rounds, archetypes를 유지하고 **C5만 분리 수정**해야 한다. C4는 같은 버전에 섞지 않는다.
