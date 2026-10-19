import assert from 'node:assert'
import { describe, it } from 'vitest'

import { type HistoricWorkItem, type WorkItem, makeMapFromString, toWorkItem } from '../src/index.js'

describe('toWorkItem', () => {
  it('returns null when the work item has no timestamps, like a JIRA issue in the backlog', () => {
    const historicWorkItem: HistoricWorkItem<string> = {
      id: 'id',
      name: 'name',
      snapshots: [
        { timestamp: new Date('2001'), stage: 'Backlog' },
        { timestamp: new Date('2002'), stage: 'Analysis' },
      ],
    }

    const workItem = toWorkItem(historicWorkItem, makeMapFromString('Next,Development'))
    assert.deepStrictEqual(workItem, null)
  })

  it('returns work item as-is when mapping is empty', () => {
    const historicWorkItem: HistoricWorkItem<string> = {
      id: 'id',
      name: 'name',
      snapshots: [
        { timestamp: new Date('2001'), stage: 'Backlog' },
        { timestamp: new Date('2002'), stage: 'Analysis' },
      ],
    }

    const workItem = toWorkItem(historicWorkItem, new Map())
    assert.deepStrictEqual(workItem, {
      id: 'id',
      name: 'name',
      Backlog: new Date('2001'),
      Analysis: new Date('2002'),
    })
  })

  it('erases a later stage when the work item moves back, keeping the first entry of the earlier stage', () => {
    const historicWorkItem: HistoricWorkItem<string> = {
      id: 'id',
      name: 'name',
      snapshots: [
        { timestamp: new Date('2001'), stage: 'Next' },
        { timestamp: new Date('2002'), stage: 'Development' },
        { timestamp: new Date('2003'), stage: 'Next' },
      ],
    }

    const workItem = toWorkItem(historicWorkItem, makeMapFromString('Next,Development'))
    assert.deepStrictEqual(workItem, {
      id: 'id',
      name: 'name',
      Next: new Date('2001'),
    })
  })

  it('uses the timestamp of the move forward that stuck', () => {
    const historicWorkItem: HistoricWorkItem<string> = {
      id: 'id',
      name: 'name',
      snapshots: [
        { timestamp: new Date('2001-01-01'), stage: 'Todo' },
        { timestamp: new Date('2001-01-02'), stage: 'In Progress' },
        { timestamp: new Date('2001-01-03'), stage: 'Todo' },
        { timestamp: new Date('2001-01-04'), stage: 'In Progress' },
        { timestamp: new Date('2001-01-05'), stage: 'Done' },
      ],
    }

    const workItem = toWorkItem(historicWorkItem, makeMapFromString('Todo,In Progress,Done'))
    assert.deepStrictEqual(workItem, {
      id: 'id',
      name: 'name',
      Todo: new Date('2001-01-01'),
      'In Progress': new Date('2001-01-04'),
      Done: new Date('2001-01-05'),
    })
  })

  it('leaves skipped stages empty, and fills them if a back move lands there', () => {
    const historicWorkItem: HistoricWorkItem<string> = {
      id: 'id',
      name: 'name',
      snapshots: [
        { timestamp: new Date('2001-01-01'), stage: 'Backlog' },
        { timestamp: new Date('2001-01-02'), stage: 'In Progress' },
        { timestamp: new Date('2001-01-03'), stage: 'Todo' },
      ],
    }

    const workItem = toWorkItem(historicWorkItem, makeMapFromString('Backlog,Todo,In Progress'))
    assert.deepStrictEqual(workItem, {
      id: 'id',
      name: 'name',
      Backlog: new Date('2001-01-01'),
      Todo: new Date('2001-01-03'),
    })
  })

  it('erases every stage after the one it moves back to', () => {
    const stages = <const>['a', 'b', 'c', 'd']
    type Stage = (typeof stages)[number]

    const historicWorkItem: HistoricWorkItem<Stage> = {
      id: 'id',
      name: 'name',
      snapshots: [
        { timestamp: new Date('2001'), stage: 'a' },
        { timestamp: new Date('2002'), stage: 'b' },
        { timestamp: new Date('2003'), stage: 'c' },
        { timestamp: new Date('2004'), stage: 'b' },
        { timestamp: new Date('2005'), stage: 'a' },
      ],
    }

    const workItem = toWorkItem(historicWorkItem, makeMapFromString('a,b,c,d'))
    assert.ok(workItem, 'Expected workItem to not be null')

    const expected: WorkItem<Stage> = {
      id: 'id',
      name: 'name',
      a: new Date('2001'),
    }
    assert.deepStrictEqual(workItem, expected)
  })

  it('maps stages to new stages which is useful for poorly named stages and historic workflow changes', () => {
    const originalStages = <const>['a', 'b', 'c', 'd']
    type OriginalStage = (typeof originalStages)[number]

    const mappedStages = <const>['todo', 'doing', 'done']
    type MappedStage = (typeof mappedStages)[number]

    const historicWorkItem: HistoricWorkItem<OriginalStage> = {
      id: 'id',
      name: 'name',
      snapshots: [
        { timestamp: new Date('2001'), stage: 'a' },
        { timestamp: new Date('2002'), stage: 'b' },
        { timestamp: new Date('2003'), stage: 'c' },
        { timestamp: new Date('2004'), stage: 'd' },
      ],
    }

    const workItem = toWorkItem(historicWorkItem, makeMapFromString('a:todo,b:doing,c:doing,d:done'))
    assert.ok(workItem, 'Expected workItem to not be null')

    const expected: WorkItem<MappedStage> = {
      id: 'id',
      name: 'name',
      todo: new Date('2001'),
      doing: new Date('2002'),
      done: new Date('2004'),
    }
    assert.deepStrictEqual(workItem, expected)
  })
})
