# Governance OASIS CARLA Efficiency & Energy Validation Spec v1.0

Status: INCLUDED_IN_CARLA_VALIDATION / REAL_CARLA_MEASUREMENT_NOT_YET_RUN

## Purpose

Measure whether Governance OASIS with CBRA imposes unacceptable latency, compute, memory, or energy overhead relative to matched harness baselines.

This is a deployment-efficiency validation, not a correctness substitute.

## Operational architecture

The system is frozen as two paths:

1. **Hot path — decision path**
   - current observation
   - selective experience participation
   - U/I/V/T responsibility
   - single selection
   - exactly one realization

2. **Cold/side path — CBRA**
   - triggered only by post-Closure evidence events
   - append-only provenance revalidation
   - no requirement to execute every CARLA tick
   - no requirement to scan the full archive
   - no second foundation-model inference is implied by this mapping

CBRA must not block the next real-time control tick unless the frozen Pilot explicitly schedules a synchronous checkpoint.

## Comparison systems

Use identical hardware, CARLA build, map, traffic setup, seeds, episode counts, and measurement windows.

- H0: GENERAL_HARNESS
- H1: GOVERNANCE_NO_CBRA
- H2: GOVERNANCE_PLUS_CBRA

H1 isolates Governance overhead.
H2−H1 isolates CBRA overhead.

## Primary efficiency measurements

Record separately; no aggregate efficiency score is allowed.

- decision latency p50 / p95 / p99
- end-to-end control-loop latency
- CARLA deadline miss count and rate
- decisions per second
- real-time factor
- CPU utilization
- GPU utilization
- process RSS / peak RSS
- provenance-storage bytes
- archive reads per decision
- archive candidates examined per decision
- CBRA wake-up count
- CBRA active-time milliseconds
- revalidation time per Closure
- checkpoint writes per Closure
- memory growth per 1,000 decision epochs

## Energy measurements

Where hardware permits:

- CPU package energy using RAPL or equivalent host counter
- NVIDIA GPU energy/power using NVML-supported counters
- total measured joules during the frozen measurement window
- joules per decision
- joules per Closure
- incremental joules H1−H0 and H2−H1

If an energy counter is unavailable, the run must record UNAVAILABLE and must not replace it with an invented estimate.

## Measurement discipline

- warm-up interval must be excluded and frozen before Pilot
- measurement start/end timestamps must be host-monotonic
- sampling frequency must be identical across arms
- instrumentation itself must be identical across arms
- energy and latency logs must be written by a measurement sidecar, not exposed to OASIS Core
- evaluator/energy telemetry cannot enter decision-time features
- no post-result tuning of sampling period or event-trigger rules

## CBRA event-driven invariants

- no per-tick mandatory CBRA scan
- CBRA wakes only on an admissible post-Closure evidence event or explicit frozen monitoring checkpoint
- dormant relations cause no revalidation work
- closed monitors cannot reopen
- later Governance reads only as-of eligible checkpoints
- full-history scan is not required by the interface
- no scalar memory-importance cache may replace provenance semantics

## Interpretation

A result may support statements such as:
- CBRA added X ms p95 latency at Closure while adding Y% average CPU overhead
- decision hot-path latency was unchanged within the measured CARLA setup
- CBRA energy overhead was concentrated in post-Closure events rather than every tick

It may not support universal hardware-efficiency claims outside the tested platform.
