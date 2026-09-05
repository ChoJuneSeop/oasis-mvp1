# OASIS Relational Closure Audit v0.6

## Scope

This step tests only the boundary:

`persistent relational flow f_t -> minimal completed relational event boundary -> ordered history`

It does **not** yet claim a complete canonical `e_i` payload containing every possible `C_i`, `P_i`, realized choice, result, or structural rewrite. Those fields belong to later integration with the judgment/realization layer.

## Kill-search conclusion

Existing process-mining and event-lifecycle standards already distinguish activity/process lifecycle states such as start, open, complete, and closed. Temporal/event graph work also represents relation/edge appearance and disappearance over time.

Therefore OASIS does not claim novelty for lifecycle completion or edge cessation itself.

The narrower OASIS requirement is to avoid using externally authored task-success labels, reward, fixed duration, or a predefined historical answer as the event boundary.

## v0.6 minimal structural closure rule

A directional relational flow is minimally closed only when all of the following are observed in its own lifecycle:

1. the relation actually `emerged`;
2. its ordered relational path is preserved while it remains active;
3. the relation is later explicitly observed as `ceased`;
4. the flow has not already been recorded as a completed event.

Elapsed time is descriptive only. Missing observation is not closure. State transition alone is not closure.

## Why this is deliberately minimal

The project-level OASIS concept treats an experience event as richer than one relation edge. A larger event can contain multiple relations, participants, possibility combinations, realization, results, and structural rewriting.

v0.6 does **not** infer that larger boundary from co-occurrence or shared participants because doing so would silently insert an unvalidated grouping rule.

Therefore the v0.6 output should be read as a **minimal completed relational event boundary**, not as proof that the full OASIS event/closed-curve definition has been computationally solved.

## Preserved properties

The completed boundary preserves:

- directional roles;
- relation type and identity;
- generation number;
- start and observed end times;
- duration as metadata only;
- the full ordered relational path;
- explicit cessation as the closure cause.

It does not add success/failure, reward, preference, importance, or task-value labels.

## Falsification tests

Local equivalent execution result:

`oasis-relational-closure-v0.6: 10/10 tests passed`

Tests cover:

1. emergence alone is not completion;
2. semantic state transitions remain open;
3. time alone never completes an event;
4. missing observation is not closure;
5. explicit relation cessation creates one completed boundary;
6. directional roles are preserved;
7. reappearance after cessation creates a distinct generation/event;
8. duplicate ingestion cannot duplicate history;
9. concurrent relations close independently and history preserves completion order;
10. malformed non-emerged lifecycle is rejected.

## Critical limitation

`emerged -> ... -> ceased` is sufficient only for the **minimal lifecycle of one observed relation**.

It is not yet sufficient to define a larger multi-relation OASIS experience such as:

`approach -> contact -> choice -> response -> separation -> consequence`

when those elements live in different relation channels.

The next algorithmic target is therefore not another threshold. It is a principled rule for **multi-relation event composition**: when several concurrently evolving relational flows belong to one completed experience without using task labels, future information, or mere temporal co-occurrence.

## Rejection conditions for the next step

Reject any multi-relation event composition rule that:

- groups relations only because they occur near each other in time;
- groups all relations sharing one participant;
- uses fixed recent-N windows or timeouts;
- requires a task-success/end label;
- uses reward or future outcomes to decide the event boundary;
- destroys directional/order information;
- assumes every active relation must belong to the same event.
