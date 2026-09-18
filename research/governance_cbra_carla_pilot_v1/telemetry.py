from __future__ import annotations

from dataclasses import dataclass
import glob
import os
from pathlib import Path
import statistics
import time
from typing import Any


UNAVAILABLE = "UNAVAILABLE"


def percentile(values: list[float], q: float):
    if not values:
        return UNAVAILABLE
    ordered = sorted(float(x) for x in values)
    if len(ordered) == 1:
        return ordered[0]
    rank = (len(ordered) - 1) * float(q)
    low = int(rank)
    high = min(low + 1, len(ordered) - 1)
    fraction = rank - low
    return ordered[low] * (1.0 - fraction) + ordered[high] * fraction


def directory_size(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(p.stat().st_size for p in path.rglob("*") if p.is_file())


def _rapl_energy_joules():
    total_uj = 0
    found = False
    for path in glob.glob("/sys/class/powercap/intel-rapl*/energy_uj"):
        try:
            total_uj += int(Path(path).read_text().strip())
            found = True
        except Exception:
            pass
    return total_uj / 1_000_000.0 if found else UNAVAILABLE


class _NVML:
    def __init__(self):
        self.available = False
        self.handle = None
        self.module = None
        try:
            import pynvml  # type: ignore
            pynvml.nvmlInit()
            self.module = pynvml
            self.handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            self.available = True
        except Exception:
            self.available = False

    def utilization(self):
        if not self.available:
            return UNAVAILABLE
        try:
            return float(self.module.nvmlDeviceGetUtilizationRates(self.handle).gpu)
        except Exception:
            return UNAVAILABLE

    def energy_joules(self):
        if not self.available:
            return UNAVAILABLE
        try:
            # NVML reports total energy in millijoules on supported devices.
            return float(
                self.module.nvmlDeviceGetTotalEnergyConsumption(self.handle)
            ) / 1000.0
        except Exception:
            return UNAVAILABLE

    def close(self):
        if self.available:
            try:
                self.module.nvmlShutdown()
            except Exception:
                pass


@dataclass(frozen=True)
class ProbeSnapshot:
    wall: float
    process_cpu_seconds: float
    rss_bytes: int | str
    cpu_percent: float | str
    gpu_utilization_percent: float | str
    cpu_energy_joules: float | str
    gpu_energy_joules: float | str


class HardwareProbe:
    def __init__(self):
        self._process = None
        try:
            import psutil  # type: ignore
            self._process = psutil.Process(os.getpid())
            self._process.cpu_percent(interval=None)
        except Exception:
            self._process = None
        self._nvml = _NVML()

    def snapshot(self) -> ProbeSnapshot:
        cpu_seconds = time.process_time()
        rss: int | str = UNAVAILABLE
        cpu_percent: float | str = UNAVAILABLE
        if self._process is not None:
            try:
                rss = int(self._process.memory_info().rss)
            except Exception:
                pass
            try:
                cpu_percent = float(self._process.cpu_percent(interval=None))
            except Exception:
                pass
        return ProbeSnapshot(
            wall=time.perf_counter(),
            process_cpu_seconds=cpu_seconds,
            rss_bytes=rss,
            cpu_percent=cpu_percent,
            gpu_utilization_percent=self._nvml.utilization(),
            cpu_energy_joules=_rapl_energy_joules(),
            gpu_energy_joules=self._nvml.energy_joules(),
        )

    def close(self):
        self._nvml.close()


def _delta(begin, end):
    if isinstance(begin, (int, float)) and isinstance(end, (int, float)):
        value = float(end) - float(begin)
        return value if value >= 0.0 else UNAVAILABLE
    return UNAVAILABLE


def summarize(
    *,
    decision_latencies: list[float],
    begin: ProbeSnapshot,
    end: ProbeSnapshot,
    simulated_seconds: float,
    realized_decisions: int,
    closure_count: int,
    archive_reads: int,
    candidates_examined: int,
    cbra_wakeups: int,
    cbra_active_seconds: float,
    checkpoint_writes: int,
    storage_growth_bytes: int,
) -> dict[str, Any]:
    wall = max(0.0, end.wall - begin.wall)
    cpu_energy = _delta(begin.cpu_energy_joules, end.cpu_energy_joules)
    gpu_energy = _delta(begin.gpu_energy_joules, end.gpu_energy_joules)
    total_energy = (
        cpu_energy + gpu_energy
        if isinstance(cpu_energy, (int, float))
        and isinstance(gpu_energy, (int, float))
        else UNAVAILABLE
    )
    joules_per_decision = (
        total_energy / realized_decisions
        if isinstance(total_energy, (int, float)) and realized_decisions > 0
        else UNAVAILABLE
    )
    joules_per_closure = (
        total_energy / closure_count
        if isinstance(total_energy, (int, float)) and closure_count > 0
        else UNAVAILABLE
    )
    return {
        "decision_latency_seconds": {
            "p50": percentile(decision_latencies, 0.50),
            "p95": percentile(decision_latencies, 0.95),
            "p99": percentile(decision_latencies, 0.99),
            "samples": len(decision_latencies),
        },
        "end_to_end_wall_seconds": wall,
        "deadline_misses_50ms": sum(
            1 for x in decision_latencies if float(x) > 0.05
        ),
        "decisions_per_second": (
            realized_decisions / wall if wall > 0.0 else UNAVAILABLE
        ),
        "real_time_factor": (
            simulated_seconds / wall if wall > 0.0 else UNAVAILABLE
        ),
        "process_cpu_seconds": max(
            0.0, end.process_cpu_seconds - begin.process_cpu_seconds
        ),
        "cpu_utilization_percent_end_sample": end.cpu_percent,
        "gpu_utilization_percent_end_sample": end.gpu_utilization_percent,
        "rss_bytes_end": end.rss_bytes,
        "rss_bytes_peak": (
            max(begin.rss_bytes, end.rss_bytes)
            if isinstance(begin.rss_bytes, int) and isinstance(end.rss_bytes, int)
            else UNAVAILABLE
        ),
        "archive_reads": int(archive_reads),
        "candidates_examined": int(candidates_examined),
        "cbra_wakeups": int(cbra_wakeups),
        "cbra_active_seconds": float(cbra_active_seconds),
        "checkpoint_writes": int(checkpoint_writes),
        "provenance_storage_growth_bytes": int(storage_growth_bytes),
        "cpu_energy_joules": cpu_energy,
        "gpu_energy_joules": gpu_energy,
        "joules_per_decision": joules_per_decision,
        "joules_per_closure": joules_per_closure,
        "unavailable_counters_are_estimated": False,
    }
