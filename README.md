# OASIS MVP1

2D autonomous RPG observation MVP converted into a comparative validation laboratory for OASIS.

## Party model

The hero party now moves together by default instead of letting every member choose an independent destination.

Each member contributes to one party decision through personality, current risk, health, experience, role, and — where enabled — relationship history. Only one party destination is realized at a time.

Temporary separation is treated as a contextual possibility rather than the normal movement model. For example, the scout can temporarily leave formation to inspect an undiscovered location when conditions are suitable, then return to the party. Separation and reunion are recorded as part of the relationship/experience process.

The intended loop is:

current world flow -> member participation -> multiple party possibilities -> one realized party action -> shared result/experience -> relationship and participation changes -> next party decision

## Validation design

The app runs four worlds from the same initial conditions and the same deterministic environmental events.

- OASIS-Full: relationship history + outcome feedback + current-flow context + participation state + structural expansion.
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
- temporary split count
- reunion count
- estimated possibility-space size

A +100 tick control is provided for rapid comparative observation. A selected world can be inspected on the 2D map while all four worlds continue advancing together.

## Experimental control

Random behavior uses deterministic hash-based noise keyed by tick, actor, and event. This keeps environmental disturbances comparable across groups and reduces differences caused only by unequal random-number call sequences.

## OASIS concepts represented

- flow
- relationship process
- participation state
- multiple possibilities with one realized action
- shared party action and shared experience
- contextual split and reunion
- spiral feedback
- structural expansion

## Run

Serve the repository as a static website and open `index.html`. GitHub Pages is suitable.

No external LLM, paid API, or dedicated game server is required.
