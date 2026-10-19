import { describe, expect, it } from 'vitest'
import { calculateCumulativeFlow } from '../src/index.js'

const stages = ['Backlog', 'Todo', 'In Progress', 'Done']

describe('calculateCumulativeFlow', () => {
  it('counts per day how many items had crossed each stage', () => {
    const items = [
      {
        id: '1',
        Todo: new Date('2026-01-01T10:00Z'),
        'In Progress': new Date('2026-01-02T10:00Z'),
        Done: new Date('2026-01-03T10:00Z'),
      },
      // Skipped In Progress: counts as crossing it when it reached Done
      { id: '2', Todo: new Date('2026-01-02T10:00Z'), Done: new Date('2026-01-04T10:00Z') },
      // Not started: never crossed Todo
      { id: '3', Backlog: new Date('2026-01-01T10:00Z') },
    ]

    expect(calculateCumulativeFlow(items, stages, 'Todo', 'Done', new Date('2026-01-04T23:00Z'))).toEqual({
      start: new Date('2026-01-01T00:00Z'),
      lines: [
        { stage: 'Todo', counts: [1, 2, 2, 2] },
        { stage: 'In Progress', counts: [0, 1, 1, 2] },
        { stage: 'Done', counts: [0, 0, 1, 2] },
      ],
    })
  })

  it('is undefined when nothing has crossed the from stage', () => {
    const items = [{ id: '1', Backlog: new Date('2026-01-01') }]

    expect(calculateCumulativeFlow(items, stages, 'Todo', 'Done', new Date('2026-01-04'))).toBeUndefined()
  })
})
