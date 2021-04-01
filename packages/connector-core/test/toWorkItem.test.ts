import assert from 'assert'

import { HistoricWorkItem, makeMapFromString, toWorkItem, WorkItem } from '../src'

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

  it('uses the first timestamp when a work item has been multiple times in the same stage', () => {
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
      Development: new Date('2002'),
    })
  })

  it('overwrites backwards move except for arrival stage', () => {
    const stages = <const>['a', 'b', 'c', 'd']
    type Stage = typeof stages[number]

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

    const workItem: WorkItem<Stage> = toWorkItem(historicWorkItem, makeMapFromString('a,b,c,d'))!

    const expected: WorkItem<Stage> = {
      id: 'id',
      name: 'name',
      a: new Date('2001'),
      b: new Date('2002'),
      c: new Date('2003'),
    }
    assert.deepStrictEqual(workItem, expected)
  })

  it('maps stages to new stages which is useful for poorly named stages and historic workflow changes', () => {
    const originalStages = <const>['a', 'b', 'c', 'd']
    type OriginalStage = typeof originalStages[number]

    const mappedStages = <const>['todo', 'doing', 'done']
    type MappedStage = typeof mappedStages[number]

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

    const workItem: WorkItem<MappedStage> = toWorkItem(
      historicWorkItem,
      makeMapFromString('a:todo,b:doing,c:doing,d:done')
    )!

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
