# GH-1L Pilot Action-Contract Amendment v1.0.2

## Trigger

The first v1.0.1 pilot (workflow run `35061975968`) executed correctly under the frozen fresh-process architecture, but exposed a measurement-interface defect before any confirmatory run: Core possibility IDs use `continue-flow` and `yield-space`, while scenario/evaluator/prehistory semantic labels also contained `continue` and `hold-course`.

The defect is visible without reference to which experimental arm performed better. In the v1.0.1 pilot, Core emitted `continue-flow` for normal continuation, while the evaluator's allowed set contained `continue`/`hold-course` instead. This made valid Core decisions appear invalid and made some expected labels impossible as literal Core possibility IDs.

## Disposition of v1.0.1 pilot

- Execution/fresh-process evidence remains valid operational evidence.
- Effectiveness and safety metrics are **INVALID FOR CONFIRMATORY INFERENCE** because of the action-namespace mismatch.
- The v1.0.1 pilot-derived count freeze is invalidated and must not unlock confirmatory.
- No confirmatory execution occurred.

## v1.0.2 correction

A single frozen adapter translates semantic GH-1L labels to canonical Core possibility IDs before either historical recommendation selection or evaluator comparison:

- `continue` -> `continue-flow`
- `hold-course` -> `continue-flow`
- `continue-flow` -> `continue-flow`
- `yield-space` -> `yield-space`

The Core's heading-alignment possibilities remain canonical and require no alias.

The adapter does not inspect arm identity, evaluator outcome, scenario class, future information, or observed pilot performance. It is a vocabulary/interface correction only.

## Re-execution rule

v1.0.2 receives new pilot seeds (`7201`, `7202`, `7203`) and a new confirmatory seed base (`920000`). The full pre-execution gate must pass again before the replacement pilot. A new count freeze must be derived solely from that replacement pilot. The previous count freeze is provenance only.
