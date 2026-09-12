from __future__ import annotations

"""Epoch-stable history publication for the G3 real-time split candidate.

The control path must not observe a history mutation halfway through one Decision Epoch.
A completed-history writer may publish a new immutable dictionary reference in the
background; the next epoch captures that reference as its complete historical view.

This is execution-path isolation only.  It is not a hard real-time or safety proof.
"""

from copy import deepcopy
from math import isfinite

from research.g3_organic_flow_v1.core import OrganicIntegratedChoiceCore
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.current_relational_core import CurrentRelationalCoreV12


class EpochSnapshotOrganicCore(OrganicIntegratedChoiceCore):
    """Organic core with one frozen history view per Decision Epoch.

    Writer side:
      validate a complete append-only batch against the latest published history and
      replace the published dictionary reference only after full validation.

    Decision side:
      capture the currently published dictionary reference when the epoch opens and use
      that exact view for all participation/reconstruction/choice work in the epoch.

    No timeout, pending-count threshold, recency weight, or forced Closure is introduced.
    """

    def __init__(self, **kwargs):
        self._epoch_history_snapshot = None
        super().__init__(**kwargs)

    def add_history_batch(self, envelopes):
        # Reuse the v1.2 batch validator. It builds a staged dictionary first, so an
        # invalid batch cannot partially mutate the published history.
        staged = CurrentRelationalCoreV12.validate_history_batch(self, envelopes)
        # One reference replacement publishes the fully validated state.  The current
        # Decision Epoch, if any, keeps its previously captured dictionary reference.
        self._history = staged

    def open_current_epoch(self, frame):
        # Capture before evaluation. Background publication after this line belongs to a
        # later current reality and therefore cannot enter this epoch retroactively.
        self._epoch_history_snapshot = self._history
        return super().open_current_epoch(frame)

    def _history_view(self):
        if self._epoch_history_snapshot is not None:
            return self._epoch_history_snapshot
        return self._history

    def history_envelopes(self):
        history = self._history_view()
        return deepcopy(tuple(history[key] for key in sorted(history)))

    def published_history_envelopes(self):
        """Writer/diagnostic view of the latest completely published history."""
        history = self._history
        return deepcopy(tuple(history[key] for key in sorted(history)))

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
