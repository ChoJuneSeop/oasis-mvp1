# GH-1 Prior-Work and Public-Code Audit

Status: `PRE-EXECUTION AUDIT COMPLETE`

Purpose: bound GH-1 claims before execution. This audit does not assert that no undiscovered prior work exists; it records the closest reviewed public implementations and the resulting claim restrictions.

## Reviewed close implementations

### Agentic Episodic Control (AEC)
Public implementation inspected: `Xidong-Yang/Agentic_Episodic_Control`.

Observed implementation pattern: current/abstracted observation -> LLM critical-state decision -> episodic-control buffer lookup for critical states -> retrieved action values -> action selection, with a world-model fallback.

Consequence for GH-1: **"retrieve episodic memory only in important/critical states" is not a GH-1 novelty claim.** AEC is a close structural prior for critical-state-gated retrieval.

### EMA / MemDecider
Public implementation inspected: `Hongyi4221/EMA`.

Observed implementation pattern: handcrafted/content features plus embedding are used by a learned decision model to accept/reject information for memory management, including reward-based learning of the decider.

Consequence for GH-1: selective memory filtering and learned gating are prior art domains. EMA is principally a write-time/retention management comparison, while GH-1 tests current-context re-participation of already completed experiences.

### How Memory Management Impacts LLM Agents
Public implementation inspected: `yuplin2333/agent_memory_manage`, which patches AgentDriver.

Observed implementation pattern: experience memory is retrieved during the AgentDriver pipeline; planning output is evaluated against ground truth and successful experience can be added while stored memories may be deleted/cleaned under management rules.

Consequence for GH-1: memory addition/deletion, noisy-memory conditions, experience-following and negative-transfer concerns are established experimental territory. GH-1 must not claim memory management itself as novel.

### MCMA
Public implementation inspected: `LiangThree/MCMA`.

Observed implementation pattern: trajectory collection -> structured/multi-level memory generation -> learned memory-copilot evolution -> hierarchical abstraction and cross-task reuse, while task execution is separated from memory-management learning.

Consequence for GH-1: structured experience reuse, abstraction and transfer are established neighboring approaches. GH-1 is not a claim to invent transferable agent memory.

## Frozen claim boundary after audit

GH-1 does **not** claim novelty for:

- selective memory retrieval,
- critical-state-triggered retrieval,
- episodic-memory reuse,
- learned memory filtering,
- memory addition/deletion,
- hierarchical memory abstraction,
- transfer of agent memory.

The GH-1 experimental target is the combined execution boundary:

`Current-flow-first -> Access gating -> Re-participation -> Decision-path isolation`

Specifically, the current reality flow is assessed first; a current-flow Gap controls permission to access the completed-experience archive; accessed candidates receive context-specific participation/nonparticipation decisions; and nonparticipants are structurally excluded from the actual Core decision path.

The audit found close components and partial overlaps, especially AEC, but the reviewed public code did not establish identity with the full frozen GH-1 execution sequence. This statement is limited to the reviewed repositories and is not an exhaustive nonexistence claim.
