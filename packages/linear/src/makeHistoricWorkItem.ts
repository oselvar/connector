import type { HistoricWorkItem, WorkItemSnapshot } from '@oselvar/core'

import type { LinearIssue, LinearStateSpan, LinearWorkflowState, WorkflowStateType } from './types'

/**
 * Builds a HistoricWorkItem from an issue's state spans. Each span marks when the issue
 * entered a workflow state. The stage is the state's name (unique within a team).
 */
export function makeHistoricWorkItem(
  issue: Pick<LinearIssue, 'id' | 'url'>,
  stateSpans: readonly LinearStateSpan[],
  states: readonly LinearWorkflowState[]
): HistoricWorkItem<string> {
  const stateNameById = new Map(states.map((state) => [state.id, state.name]))

  const snapshots: WorkItemSnapshot<string>[] = stateSpans.map((span) => ({
    timestamp: new Date(span.startedAt),
    // Fall back to the id for states that have since been deleted
    stage: stateNameById.get(span.stateId) ?? span.stateId,
  }))

  return {
    id: issue.id,
    name: issue.url,
    snapshots: snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
  }
}

const STATE_TYPE_ORDER: readonly WorkflowStateType[] = ['triage', 'backlog', 'unstarted', 'started', 'completed']

/**
 * Makes a stage map from a team's workflow states, ordered the way work flows through them.
 * Canceled states are left out, since they don't represent forward flow.
 */
export function makeDefaultStageMap(states: readonly LinearWorkflowState[]): Map<string, string> {
  const ordered = states
    .filter((state) => STATE_TYPE_ORDER.includes(state.type))
    .sort((a, b) => STATE_TYPE_ORDER.indexOf(a.type) - STATE_TYPE_ORDER.indexOf(b.type) || a.position - b.position)
  return new Map(ordered.map((state) => [state.name, state.name]))
}
