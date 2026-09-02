# OASIS MVP1

2D autonomous RPG observation MVP converted into a comparative validation laboratory for OASIS.

## Validation design

The app now runs four worlds from the same initial conditions and the same deterministic environmental events.

- OASIS-Full: relationship history + outcome feedback + current-flow context + structural expansion.
- NoRelation: relationship formation/reactivation removed.
- NoFeedback: outcomes do not modify later decision conditions.
- FixedScore: fixed personality/place preference scores; evolving OASIS structure is removed.

## What to observe

The MVP is not intended to prove that OASIS always achieves a higher score. It tests whether removing OASIS structures changes how the simulated world develops.

Displayed validation metrics include:

- active relationship edges
- spiral-change count
- discovered places
- unique party/destination routes
- estimated possibility-space size
- NPC attitude variance

A +100 tick control is provided for rapid comparative observation. A selected world can be inspected on the 2D map while all four worlds continue advancing together.

## Experimental control

Random behavior was replaced with deterministic hash-based noise keyed by tick, actor, and event. This keeps environmental disturbances comparable across groups and reduces differences caused only by unequal random-number call sequences.

## OASIS concepts represented

- flow
- relationship process
- participation state
- multiple possibilities with one realized action
- spiral feedback
- structural expansion

## Run

Serve the repository as a static website and open `index.html`. GitHub Pages is suitable.

No external LLM, paid API, or dedicated game server is required.
