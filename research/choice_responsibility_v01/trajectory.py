"""선택부터 이후 재참여까지 출처로 연결 / source-linked longitudinal flow.

Reports contain the evolving record, not a four-class result or universal score.
"""
from copy import deepcopy
from dataclasses import asdict, replace
import json

from research.g3_2_sidecar.common import require_tau
from research.oasis_core_v11.current_relational_core import CoreV11InvariantError
from research.oasis_core_v12.history_admission import HistoryAdmissionBridgeV12
from research.oasis_core_v12.runtime import ExecutionJournal


class TrajectoryJournal(ExecutionJournal):
    def event(self, key, kind, payload):
        payload = deepcopy(payload)
        if kind == 'selected' and 'decision_responsibility' in payload:
            context = payload['decision_responsibility']['context']
            eval_ = context['inputs']['evaluation']
            sources = {x['source']['experience_id'] for x in eval_['contributions']}
            sources.update(link['source']['experience_id'] for rec in eval_['reconstructions'] for link in rec['source_links'])
            owner = json.loads(key)[:2]
            reentries = []
            for prior_key, raw in self.db.execute(
                    "SELECT key,payload FROM execution_events WHERE kind='completed_process' ORDER BY event_id"):
                prior = json.loads(raw)
                if json.loads(prior_key)[:2] == owner and prior['experience_id'] in sources:
                    if prior['known_at_tau'] > payload['decision_tau']:
                        raise CoreV11InvariantError('future completion entered reentry trace')
                    reentries.append({'experience_id': prior['experience_id'], 'prior_decision_key': prior_key})
            payload['reentered_from'] = reentries
        super().event(key, kind, payload)

    def report(self, *, run_id, subject_id, as_of_tau):
        require_tau('as_of_tau', as_of_tau)
        events = []
        for event_id, key, kind, raw in self.db.execute(
                'SELECT event_id,key,kind,payload FROM execution_events ORDER BY event_id'):
            if json.loads(key)[:2] != [run_id, subject_id]:
                continue
            payload = json.loads(raw)
            tau = next((payload[name] for name in ('known_at_tau', 'observed_at_tau', 'attempt_tau', 'decision_tau', 'tau')
                        if name in payload), None)
            if tau is None:
                # Old v1.2 error events had no observation time: never invent one.
                continue
            if tau <= as_of_tau:
                events.append({'event_id': event_id, 'decision_key': key, 'kind': kind, 'tau': tau, 'record': payload})
        return {'process_id': 'choice-responsibility-integration-v0.1',
                'as_of_tau': as_of_tau, 'events': events,
                'global_outcome_classification': None, 'causal_effect_established': False}


class ResponsibilityHistoryBridge:
    def __init__(self, core, extractor, archive, journal: TrajectoryJournal):
        self.bridge = HistoryAdmissionBridgeV12(core, extractor, archive)
        self.journal = journal

    def admit(self, decision_key, entry, *, known_at_tau, occurrences, relation_occurrence_refs):
        execution = self.journal.inspect(decision_key)
        if not execution or not execution['receipt'] or execution['receipt']['applied'] is not True:
            raise CoreV11InvariantError('completed action experience needs an acknowledged actual application')
        selection, receipt = execution['selection'], execution['receipt']
        if (entry.selected_possibility_id != selection['proposal']['selected_possibility_id']
                or entry.realization_ref != receipt['realization_ref']
                or entry.decision_tau != selection['decision_tau']
                or entry.realized_tau != receipt['observed_at_tau']):
            raise CoreV11InvariantError('completed experience mismatches actual decision/application provenance')
        responsibility = selection['decision_responsibility']
        report = responsibility['context']['verification']
        pending = tuple('unverified:' + x['request']['request_id'] + ':' + x['request']['question'] + ':' + x['reason']
                        for x in report['omega']) + tuple(report['additional_unverified_scope'])
        evidence = deepcopy(dict(entry.closure_evidence))
        evidence['unresolved'] = tuple(dict.fromkeys(tuple(evidence.get('unresolved', ())) + pending))
        evidence['decision_responsibility_ref'] = decision_key
        augmented = replace(entry, closure_evidence=evidence)
        envelopes = self.bridge.admit(augmented, known_at_tau=known_at_tau, occurrences=occurrences,
                                     relation_occurrence_refs=relation_occurrence_refs)
        payload = {'known_at_tau': known_at_tau, 'experience_id': entry.entry_id,
                   'realization_ref': receipt['realization_ref'], 'decision_responsibility': responsibility,
                   'unresolved_at_closure': list(evidence['unresolved']),
                   'closure_method': entry.closure_method,
                   'occurrence_refs': [x.occurrence_id for x in occurrences]}
        # Exact replay is idempotent; differing closure responsibility cannot rewrite history.
        old = [json.loads(row[0]) for row in self.journal.db.execute(
            "SELECT payload FROM execution_events WHERE key=? AND kind='completed_process'", (decision_key,))]
        same = [x for x in old if x['experience_id'] == entry.entry_id]
        if same:
            if any(x != payload for x in same):
                raise CoreV11InvariantError('completed responsibility provenance cannot be overwritten')
        else:
            self.journal.event(decision_key, 'completed_process', payload)
        return envelopes

    def append_observation(self, decision_key, process_id, occurrence, *, reason):
        prior = [json.loads(row[0]) for row in self.journal.db.execute(
            "SELECT payload FROM execution_events WHERE key=? AND kind='completed_process'", (decision_key,))]
        if not any(x['experience_id'] == process_id for x in prior):
            raise CoreV11InvariantError('observation must link to this decision’s completed process')
        self.bridge.archive.append_observation(process_id, occurrence, reason=reason)
        self.journal.event(decision_key, 'later_observation', {
            'known_at_tau': occurrence.received_at_tau, 'experience_id': process_id,
            'observation': asdict(occurrence), 'reason': reason, 'causal_effect_established': False})
