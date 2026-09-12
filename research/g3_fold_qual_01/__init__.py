"""G3-FOLD-QUAL-01 preregistration fixtures.

This package contains only pre-empirical history fixtures and evaluator-only lineage
contracts for falsification-first Fold qualification.  It does not register or run an
empirical experiment by itself.
"""

from .history_packages import (
    EvaluationOnlyLineage,
    FoldQualificationHistoryPackage,
    HISTORY_PACKAGES,
    history_package,
    history_package_digest,
)

__all__ = (
    "EvaluationOnlyLineage",
    "FoldQualificationHistoryPackage",
    "HISTORY_PACKAGES",
    "history_package",
    "history_package_digest",
)
