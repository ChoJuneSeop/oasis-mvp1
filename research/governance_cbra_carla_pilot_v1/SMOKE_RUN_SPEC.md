# CARLA Pilot Smoke Run v1

Status: NON_EVIDENCE_RUNTIME_CHECK

Purpose: verify that the real CARLA host, OASIS decision path, single actuation, independent relation/validation workers, audit ledger, and runtime identity can survive a short execution before the scientific Pilot.

Frozen smoke defaults:
- 200 ticks
- 2 NPCs
- OF-01 seed
- CARLA 0.9.16
- Town10HD_Opt
- synchronous_mode=true
- fixed_delta_seconds=0.05
- no_rendering_mode=true

This smoke run is explicitly:
- not Pilot evidence;
- not Confirmatory evidence;
- not a replacement for the 54-unit frozen Pilot matrix;
- not allowed to tune scientific thresholds or select favorable seeds.

It may reveal execution defects, platform-memory limits, or integration errors. If it fails, the failure is diagnostic only.
