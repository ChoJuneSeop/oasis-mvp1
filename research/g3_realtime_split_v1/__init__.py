"""G3 real-time path / deferred relation-processing split.

This package is intentionally separate from the frozen G3-ORGANIC-CARLA-01 source
snapshot.  It is a follow-on implementation candidate, not a reinterpretation of the
already-running preregistered flow.
"""

from .core import EpochSnapshotOrganicCore
from .worker import DeferredRelationWorker, DeferredWorkerHealth
from .runtime import RealtimeOrganicHarness

__all__ = [
    "DeferredRelationWorker",
    "DeferredWorkerHealth",
    "EpochSnapshotOrganicCore",
    "RealtimeOrganicHarness",
]
