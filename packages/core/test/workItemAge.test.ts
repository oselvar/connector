import { describe, expect, it } from 'vitest'
import { calculateStageExitAges, calculateWorkItemAges } from '../src/index.js'

const stages = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done']
const now = new Date('2026-01-11')

describe('calculateWorkItemAges', () => {
  it('ages items in progress from when they crossed the from stage', () => {
    const items = [
      {
        workItem: { id: '1', name: 'ENG-1', Todo: new Date('2026-01-01'), 'In Progress': new Date('2026-01-03') },
        currentStage: 'In Progress',
      },
      // Skipped Todo, so it started when it landed in In Review
      { workItem: { id: '2', 'In Review': new Date('2026-01-09') }, currentStage: 'In Review' },
    ]

    expect(calculateWorkItemAges(items, stages, 'Todo', 'Done', now)).toEqual([
      { id: '1', name: 'ENG-1', stage: 'In Progress', ageDays: 10 },
      { id: '2', stage: 'In Review', ageDays: 2 },
    ])
  })

  it('leaves out items that are not started, finished, or have moved back before the from stage', () => {
    const items = [
      { workItem: { id: 'backlog', Backlog: new Date('2026-01-01') }, currentStage: 'Backlog' },
      { workItem: { id: 'done', Todo: new Date('2026-01-01'), Done: new Date('2026-01-05') }, currentStage: 'Done' },
      {
        workItem: { id: 'moved-back', Backlog: new Date('2026-01-01'), Todo: new Date('2026-01-02') },
        currentStage: 'Backlog',
      },
    ]

    expect(calculateWorkItemAges(items, stages, 'Todo', 'Done', now)).toEqual([])
  })
})

describe('calculateStageExitAges', () => {
  it('gives the age at which items left each stage', () => {
    const items = [
      {
        id: '1',
        Todo: new Date('2026-01-01'),
        'In Progress': new Date('2026-01-02'),
        'In Review': new Date('2026-01-05'),
        Done: new Date('2026-01-06'),
      },
      // Skipped In Review: left In Progress when it landed in Done
      { id: '2', 'In Progress': new Date('2026-01-01'), Done: new Date('2026-01-03') },
      // Still in progress: hasn't left In Progress
      { id: '3', 'In Progress': new Date('2026-01-01') },
    ]

    expect(calculateStageExitAges(items, stages, 'In Progress', 'Done')).toEqual(
      new Map([
        ['In Progress', [3, 2]],
        ['In Review', [4, 2]],
      ])
    )
  })
})
