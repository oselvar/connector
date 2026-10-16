import { describe, expect, it } from 'vitest'
import { makeDefaultStageMap, makeHistoricWorkItem } from '../src/index.js'
import type { LinearWorkflowState } from '../src/index.js'

const states: LinearWorkflowState[] = [
  { id: 's-done', name: 'Done', type: 'completed', position: 0 },
  { id: 's-review', name: 'In Review', type: 'started', position: 2 },
  { id: 's-progress', name: 'In Progress', type: 'started', position: 1 },
  { id: 's-todo', name: 'Todo', type: 'unstarted', position: 0 },
  { id: 's-canceled', name: 'Canceled', type: 'canceled', position: 0 },
  { id: 's-backlog', name: 'Backlog', type: 'backlog', position: 0 },
  { id: 's-triage', name: 'Triage', type: 'triage', position: 0 },
]

describe('makeHistoricWorkItem', () => {
  it('makes a time sorted snapshot for each state span, named after the state', () => {
    const historicWorkItem = makeHistoricWorkItem(
      { id: 'issue-1', url: 'https://linear.app/oselvar/issue/ENG-1' },
      [
        { stateId: 's-progress', startedAt: '2026-01-03T00:00:00.000Z', endedAt: '2026-01-05T00:00:00.000Z' },
        { stateId: 's-todo', startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-03T00:00:00.000Z' },
        { stateId: 's-done', startedAt: '2026-01-05T00:00:00.000Z', endedAt: null },
      ],
      states
    )

    expect(historicWorkItem).toEqual({
      id: 'issue-1',
      name: 'https://linear.app/oselvar/issue/ENG-1',
      snapshots: [
        { timestamp: new Date('2026-01-01T00:00:00.000Z'), stage: 'Todo' },
        { timestamp: new Date('2026-01-03T00:00:00.000Z'), stage: 'In Progress' },
        { timestamp: new Date('2026-01-05T00:00:00.000Z'), stage: 'Done' },
      ],
    })
  })

  it('uses the state id for states that no longer exist', () => {
    const historicWorkItem = makeHistoricWorkItem(
      { id: 'issue-1', url: 'https://linear.app/oselvar/issue/ENG-1' },
      [{ stateId: 's-deleted', startedAt: '2026-01-01T00:00:00.000Z', endedAt: null }],
      states
    )

    expect(historicWorkItem.snapshots).toEqual([
      { timestamp: new Date('2026-01-01T00:00:00.000Z'), stage: 's-deleted' },
    ])
  })
})

describe('makeDefaultStageMap', () => {
  it('orders states by type then position, and leaves out canceled states', () => {
    expect([...makeDefaultStageMap(states).keys()]).toEqual([
      'Triage',
      'Backlog',
      'Todo',
      'In Progress',
      'In Review',
      'Done',
    ])
  })
})
