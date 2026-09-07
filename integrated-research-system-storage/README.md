# OASIS Integrated Research System Storage

Status: Canonical integrated-research storage layer
Branch: `storage/oasis-integrated-research-system-v1.0`
Created: 2026-09-08

## Purpose

This storage preserves the current OASIS integrated-research principles, validation structure, mathematical baseline, source provenance, and the reference executable kernel in one place for future research work.

It is distinct from the external recurrence-prevention/audit storage.

- External governance storage: checks whether a new research task should begin and prevents recurrence of known mistakes.
- Integrated research system storage: supplies the current canonical research principles and semantic baselines after the external gate is passed, and contains the executable reference implementation derived from those semantics.

## Operating separation

`external recurrence-prevention gate`
→ research allowed
→ `integrated research system storage`
→ current research principles / mathematical baseline loaded
→ reference executable kernel or new experiment used as appropriate
→ experiment reality remains independent of preferred outcomes

This storage may define research rules, scope, mathematical semantics, evidence classes, validation procedures, and reference operator contracts.

It must not inject:
- preferred experimental results;
- rewards or answer keys;
- predetermined action menus as OASIS-native possibility composition;
- future information;
- a required behavioral divergence;
- a required proof of OASIS superiority.

## Canonical contents

- `CURRENT_INTEGRATED_RESEARCH_PRINCIPLES_v1.0.md`
- `MATHEMATICAL_OPERATOR_MODEL_v1.0_CLOSED_BASELINE.md`
- `SOURCE_REGISTRY_v1.0.md`
- `executable/EXECUTABLE_SPEC_v1.0.md`
- `executable/src/oasis-math-kernel-v1.mjs`
- `executable/tests/oasis-math-kernel-v1.test.mjs`
- `executable/IMPLEMENTATION_STATUS_v0.1.md`

## Executable boundary

English — **Reference executable kernel**: the runnable implementation of the current mathematical operator contracts for code-level inspection and testing. It is not automatically a domain-complete production implementation.

한글 설명 — **참조 실행 커널**: 현재 수학적 연산자 계약을 코드 수준에서 실행·감사할 수 있게 만든 구현이다. 이것만으로 게임·로봇·차량·현실환경의 완성형 production이나 이론의 실증 완료를 의미하지 않는다.

The kernel intentionally fails closed where the mathematical model does not yet specify a universal law. For example, a probability distribution does not silently become argmax choice, and unresolved multiple admissible possibilities do not receive an arbitrary winner.

## Governing idea

Past research and current principles determine how research is conducted, not what reality must produce.
