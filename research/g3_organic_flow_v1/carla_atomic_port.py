from __future__ import annotations

"""CARLA host adapter for the Organic AtomicOrganicFlowPort contract.

This wrapper does not modify the frozen CARLA adapter. It composes the existing
present-state gateway and full-world purity fingerprint with CurrentFrame capture,
revision-checked actuation and host-process idempotency.

The host lock provides atomicity only inside this Python execution path. CARLA itself
is not a distributed compare-and-swap store, so empirical use additionally requires
one registered writer/client for ego control under synchronous execution. The runtime
identity guard enforces the synchronous protocol settings but cannot prove that an
unregistered external client does not exist.
"""

from copy import deepcopy
from threading import RLock
from typing import Any

from research.carla_v22_harness_v11.canonical_harness import PresentObservation, Realization
from research.carla_v22_harness_v11.carla_runtime_adapter_v1 import (
    CARLAPresentFlowPort,
    CARLARuntimeInvariantError,
    ControlledOracleObservationGateway,
)
from research.integration_checkpoint.frame import current_frame_from_host
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.contracts import CurrentFrame, require_text
from research.oasis_core_v12.runtime import ApplicationReceipt


class OrganicCARLAAtomicPort:
    """Concrete current-frame/actuation boundary for the organic G3 flow."""

    def __init__(
        self,
        *,
        world: Any,
        ego_actor: Any,
        gateway: ControlledOracleObservationGateway | None = None,
        runtime_guard: Any | None = None,
    ) -> None:
        self.world = world
        self.ego_actor = ego_actor
        self.gateway = gateway or ControlledOracleObservationGateway(world, ego_actor)
        self.flow = CARLAPresentFlowPort(world, ego_actor, self.gateway)
        self.runtime_guard = runtime_guard
        self._lock = RLock()
        self._receipts: dict[str, ApplicationReceipt] = {}

    @staticmethod
    def _snapshot_identity(snapshot: Any) -> tuple[int, float]:
        return (
            int(snapshot.frame),
            float(snapshot.timestamp.elapsed_seconds),
        )

    def _assert_runtime(self) -> None:
        if self.runtime_guard is not None:
            self.runtime_guard.assert_current()

    def capture(self) -> CurrentFrame:
        """Capture observation, tau, evidence and revision from one stable CARLA frame.

        The method fails closed instead of retrying across a moving frame. Retrying
        would silently replace the current reality being reasoned about.
        """

        with self._lock:
            self._assert_runtime()
            before_snapshot = self.world.get_snapshot()
            before_frame = self._snapshot_identity(before_snapshot)

            observation = PresentObservation.from_mapping(
                self.flow.present_observation()
            )
            first_revision = self.flow.flow_fingerprint()

            after_snapshot = self.world.get_snapshot()
            after_frame = self._snapshot_identity(after_snapshot)
            second_revision = self.flow.flow_fingerprint()

            if before_frame != after_frame:
                raise CARLARuntimeInvariantError(
                    "CARLA frame advanced during current-frame capture"
                )
            if int(observation.epoch) != before_frame[0]:
                raise CARLARuntimeInvariantError(
                    "gateway observation epoch is not bound to the captured CARLA frame"
                )
            if first_revision != second_revision:
                raise CARLARuntimeInvariantError(
                    "CARLA world changed during current-frame fingerprint capture"
                )

            return current_frame_from_host(
                observation,
                tau=before_frame[1],
                revision=first_revision,
            )

    def apply_if_current(
        self,
        realization: Realization,
        *,
        expected_revision: str,
        idempotency_key: str,
    ) -> ApplicationReceipt:
        """Check current revision and deduplicate before applying one real actuation.

        A stale revision returns an explicit non-application receipt. A repeated key
        returns the original receipt and never dispatches a second control. Unknown
        exceptions are intentionally allowed to propagate so ExecutionJournal keeps
        the attempt uncertain and prevents blind replay.
        """

        require_text(expected_revision, "expected_revision")
        require_text(idempotency_key, "idempotency_key")

        with self._lock:
            self._assert_runtime()
            prior = self._receipts.get(idempotency_key)
            if prior is not None:
                return deepcopy(prior)

            current = self.capture()
            if current.revision != expected_revision:
                receipt = ApplicationReceipt(
                    False,
                    float(current.tau),
                    reason="current CARLA revision no longer matches the selected decision premises",
                )
                self._receipts[idempotency_key] = receipt
                return deepcopy(receipt)

            # Recheck immediately before the one host-side dispatch. The RLock blocks
            # competing dispatches through this adapter, but not an unknown external
            # CARLA client; that remains an explicit empirical execution assumption.
            if self.flow.flow_fingerprint() != expected_revision:
                receipt = ApplicationReceipt(
                    False,
                    float(self.flow.current_tau()),
                    reason="CARLA revision changed immediately before actuation",
                )
                self._receipts[idempotency_key] = receipt
                return deepcopy(receipt)

            reference = self.flow.apply_single_actuation(realization.actuation)
            observed_tau = float(self.flow.current_tau())
            receipt = ApplicationReceipt(
                True,
                observed_tau,
                realization_ref=str(reference),
            )
            self._receipts[idempotency_key] = receipt
            return deepcopy(receipt)

    def receipt_for(self, idempotency_key: str) -> ApplicationReceipt | None:
        with self._lock:
            item = self._receipts.get(idempotency_key)
            return deepcopy(item) if item is not None else None


class OrganicCARLAContractError(CoreV11InvariantError):
    """Reserved for organic CARLA contract-level failures."""
