from __future__ import annotations

"""Epoch-stable history publication plus current-flow relational Fold.

The control path must not observe a history mutation halfway through one Decision Epoch.
A completed-history writer may publish a new immutable dictionary reference in the
background; the next epoch captures that reference as its complete historical view.

Fold is a semantics-safe pre-index over that captured history.  It does not score,
rank, decay, threshold, or top-k memory.  Only historical relations that can satisfy
the frozen CARLA relation operator's exact role/type continuity predicate enter deep
current relation/reconstruction work.  Omitted relations remain unresolved and are
checked independently by Observation/Validation.

This is execution-path isolation and structural compute reduction only.  It is not a
hard real-time, safety, or universal OASIS proof.
"""

from copy import deepcopy
from math import isfinite
import time

from research.g3_organic_flow_v1.core import OrganicIntegratedChoiceCore
from research.g3_realtime_split_v1.fold import RelationalFoldOperator
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.current_relational_core import CurrentRelationalCoreV12


class EpochSnapshotOrganicCore(OrganicIntegratedChoiceCore):
    """Organic core with one frozen history/Fold view per Decision Epoch.

    Writer side:
      validate a complete append-only batch against the latest published history and
      replace the published dictionary reference only after full validation.

    Decision side:
      capture the currently published dictionary reference when the epoch opens, form
      one current relational Fold from that exact reference, and use only the active
      Fold surface for deep participation/reconstruction/choice work in the epoch.

    Validation side:
      omitted relations remain available in the immutable epoch snapshot so the
      independent validation process can test whether any omission would actually have
      contributed under the original relation operator.

    No timeout, pending-count threshold, memory score, recency weight, or forced
    Closure is introduced.
    """

    def __init__(self, **kwargs):
        self._epoch_history_snapshot = None
        self._epoch_identity = None
        self._epoch_frame = None
        self._epoch_fold_snapshot = None
        self._publication_received_at = None
        self._publication_source_epoch = None
        self.publication_visibility = {}
        self.fold_operator = RelationalFoldOperator()
        super().__init__(**kwargs)

    def add_history_batch(self, envelopes):
        # Reuse the v1.2 batch validator. It builds a staged dictionary first, so an
        # invalid batch cannot partially mutate the published history.
        staged = CurrentRelationalCoreV12.validate_history_batch(self, envelopes)
        # One reference replacement publishes the fully validated state.  The current
        # Decision Epoch, if any, keeps its previously captured dictionary reference.
        self._history = staged

    def publish_validated_history_batch(self, envelopes):
        """Publish a batch already validated by the relation process.

        The relation process is the only producer of these envelopes.  The action
        process deliberately does not redo archive, Closure, or admission work when
        it observes a completed publication.  The replacement remains atomic and an
        open epoch retains its old reference and old Fold surface.
        """
        staged = dict(self._history)
        for envelope in envelopes:
            key = self._source_key(envelope.record.source)
            prior = staged.get(key)
            if prior is not None and prior != envelope:
                raise CoreV11InvariantError("conflicting relation-process publication")
            staged[key] = envelope
        self._history = staged

    def open_current_epoch(self, frame):
        # Capture before evaluation. Background publication after this line belongs to a
        # later current reality and therefore cannot enter this epoch retroactively.
        identity = frame.observation.epoch
        if self._epoch_identity is not None:
            if identity < self._epoch_identity or frame.tau < self._epoch_frame.tau:
                raise CoreV11InvariantError("Decision Epoch or current tau moved backwards")
            if identity == self._epoch_identity and frame != self._epoch_frame:
                raise CoreV11InvariantError("same Decision Epoch has conflicting current frame")
        if identity != self._epoch_identity:
            self._epoch_history_snapshot = self._history
            self._epoch_fold_snapshot = None
            self._epoch_identity = identity
            self._epoch_frame = deepcopy(frame)
            if self._publication_received_at is not None:
                self.publication_visibility = {
                    "visible_epoch": identity,
                    "source_epoch": self._publication_source_epoch,
                    "visibility_lag_epochs": max(0, identity - self._publication_source_epoch),
                    "receipt_to_visibility_seconds": time.perf_counter() - self._publication_received_at,
                }
                self._publication_received_at = None
        return super().open_current_epoch(frame)

    def _history_view(self):
        if self._epoch_history_snapshot is not None:
            return self._epoch_history_snapshot
        return self._history

    def _all_epoch_history_records(self):
        if self._frame is None:
            raise CoreV11InvariantError("explicit current frame required before Fold")
        history = self._history_view()
        result = []
        for key in sorted(history):
            envelope = history[key]
            if (
                float(envelope.known_at_tau) <= float(self._frame.tau)
                and float(envelope.record.source.completed_at_tau) <= float(self._frame.tau)
            ):
                result.append(envelope.record)
        return tuple(result)

    def _ensure_fold_snapshot(self):
        if self._frame is None:
            raise CoreV11InvariantError("explicit current frame required before Fold")
        if self._epoch_fold_snapshot is None:
            current_relations = tuple(self.relation_builder.build(self._frame.observation))
            self._epoch_fold_snapshot = self.fold_operator.fold(
                current_tau=float(self._frame.tau),
                current_relations=current_relations,
                history_records=self._all_epoch_history_records(),
            )
        return self._epoch_fold_snapshot

    def fold_snapshot(self):
        """Immutable diagnostic copy of the current Fold surface."""
        return deepcopy(self._ensure_fold_snapshot())

    def history_records(self):
        """Return only the current Fold-active historical relations for deep work."""
        snapshot = self._ensure_fold_snapshot()
        active = set(snapshot.active_keys)
        return tuple(
            record
            for record in self._all_epoch_history_records()
            if self._source_key(record.source) in active
        )

    def history_envelopes(self):
        """Current epoch's complete history snapshot, not merely Fold-active history."""
        history = self._history_view()
        return deepcopy(tuple(history[key] for key in sorted(history)))

    def active_history_envelopes(self):
        """Current Fold-active envelope view for diagnostics only."""
        active = set(self._ensure_fold_snapshot().active_keys)
        history = self._history_view()
        return deepcopy(tuple(history[key] for key in sorted(history) if key in active))

    def published_history_envelopes(self):
        """Writer/diagnostic view of the latest completely published history."""
        history = self._history
        return deepcopy(tuple(history[key] for key in sorted(history)))

    @staticmethod
    def _ref_payload(record):
        source = record.source
        return {
            "experience_id": str(source.experience_id),
            "relation_element_id": str(source.relation_element_id),
            "completed_at_tau": float(source.completed_at_tau),
        }

    def fold_validation_audit(self, observation):
        """Deep omission check for Observation/Validation only.

        This method intentionally may scale with omitted history.  It is never called
        from Reality/Action or Relation/Experience and cannot authorize, rewrite, or
        delay the already-realized decision.
        """
        frame = self._require_frame(observation)
        snapshot = self._ensure_fold_snapshot()
        current_relations = tuple(self.relation_builder.build(observation))
        candidates = tuple(self.candidate_provider.candidates(observation, current_relations))
        candidate_ids = tuple(candidate.possibility_id for candidate in candidates)
        records = self._all_epoch_history_records()
        by_key = {self._source_key(record.source): record for record in records}
        misses = self.fold_operator.validate_omissions(
            snapshot=snapshot,
            current_relations=current_relations,
            candidate_ids=candidate_ids,
            history_by_key=by_key,
            relation_operator=self.relation_operator,
        )
        active_records = tuple(by_key[key] for key in snapshot.active_keys)
        omitted_records = tuple(by_key[key] for key in snapshot.omitted_keys)
        miss_records = tuple(by_key[key] for key in misses)
        return {
            "observed_at_tau": float(frame.tau),
            "selection_basis": snapshot.selection_basis,
            "omitted_semantics": snapshot.omitted_semantics,
            "history_size": snapshot.history_size,
            "active_count": snapshot.active_count,
            "omitted_count": snapshot.omitted_count,
            "active_relation_refs": [self._ref_payload(x) for x in active_records],
            "omitted_relation_refs": [self._ref_payload(x) for x in omitted_records],
            "false_negative_relation_refs": [self._ref_payload(x) for x in miss_records],
            "semantic_preservation_check": "pass" if not misses else "fail",
            "interpretation": (
                "Omitted relations are unresolved, not zero. Validation re-ran the frozen "
                "relation operator over omissions without feeding results back into the realized epoch."
            ),
        }

    def responsibility_record(self):
        record = super().responsibility_record()
        fold = self._ensure_fold_snapshot()
        record["fold_action"] = {
            "selection_basis": fold.selection_basis,
            "omitted_semantics": fold.omitted_semantics,
            "history_size": fold.history_size,
            "active_count": fold.active_count,
            "omitted_count": fold.omitted_count,
            "current_signatures": [list(x) for x in fold.current_signatures],
            "interpretation": (
                "Fold limits deep current relation work to symbolic contacts; omission is not an irrelevance judgment."
            ),
        }
        return deepcopy(record)

    def _distribution(self, candidates, contributions, measurements):
        """Use the same epoch-stable history view for occurrence provenance lookup."""
        history = self._history_view()
        tokens = {
            candidate.possibility_id: {("current", ref) for ref in candidate.current_evidence}
            for candidate in candidates
        }

        def origins(source):
            key = self._source_key(source)
            if key not in history:
                raise CoreV11InvariantError(
                    "epoch history provenance changed or disappeared during evaluation"
                )
            envelope = history[key]
            return {("past", occurrence_id) for occurrence_id in envelope.occurrence_refs}

        for bound in contributions:
            tokens[bound.contribution.possibility_id].update(origins(bound.source))
        for measurement in measurements:
            for link in measurement.source_links:
                tokens[measurement.possibility_id].update(origins(link.source))

        mass = {key: float(len(value)) for key, value in tokens.items()}
        total = sum(mass.values())
        if total <= 0 or not isfinite(total):
            raise CoreV11InvariantError(
                "no constructed possibilities; no realization or terminal claim"
            )
        return {key: value / total for key, value in mass.items()}
