import { describe, expect, it } from 'vitest'
import { calculateCycleTimes, percentile, rollingPercentile } from '../src/index.js'

const stages = ['Todo', 'In Progress', 'Done']

describe('calculateCycleTimes', () => {
  it('calculates days between the from and to stages', () => {
    const items = [
      {
        id: '1',
        name: 'ENG-1',
        Todo: new Date('2026-01-01'),
        'In Progress': new Date('2026-01-02'),
        Done: new Date('2026-01-05'),
      },
    ]

    expect(calculateCycleTimes(items, stages, 'In Progress', 'Done')).toEqual([
      {
        id: '1',
        name: 'ENG-1',
        startDate: new Date('2026-01-02'),
        completionDate: new Date('2026-01-05'),
        cycleTimeDays: 3,
      },
    ])
  })

  it('counts items that skipped the from stage, from when they landed past it', () => {
    const items = [
      { id: '1', Backlog: new Date('2026-01-01'), 'In Progress': new Date('2026-01-03'), Done: new Date('2026-01-07') },
    ]

    expect(calculateCycleTimes(items, ['Backlog', ...stages], 'Todo', 'Done')).toMatchObject([
      { id: '1', startDate: new Date('2026-01-03'), cycleTimeDays: 4 },
    ])
  })

  it('counts items that skipped the to stage, from when they landed past it', () => {
    const items = [{ id: '1', Todo: new Date('2026-01-01'), Done: new Date('2026-01-03') }]

    expect(calculateCycleTimes(items, stages, 'Todo', 'In Progress')).toMatchObject([
      { id: '1', completionDate: new Date('2026-01-03'), cycleTimeDays: 2 },
    ])
  })

  it('leaves out items that only ever reached the to stage or later', () => {
    const items = [{ id: '1', Done: new Date('2026-01-03') }]

    expect(calculateCycleTimes(items, stages, 'Todo', 'Done')).toEqual([])
  })

  it('leaves out items missing a stage, completed before they started, or that regressed', () => {
    const items = [
      { id: 'not-done', 'In Progress': new Date('2026-01-02') },
      { id: 'backwards', 'In Progress': new Date('2026-01-05'), Done: new Date('2026-01-02') },
      {
        id: 'regressed',
        'In Progress': new Date('2026-01-06'),
        Todo: new Date('2026-01-07'),
        Done: new Date('2026-01-05'),
      },
    ]

    expect(calculateCycleTimes(items, stages, 'In Progress', 'Done')).toEqual([])
  })
})

describe('percentile', () => {
  it('uses the nearest rank', () => {
    const values = [5, 1, 4, 2, 3, 10, 9, 8, 7, 6]
    expect(percentile(values, 50)).toBe(5)
    expect(percentile(values, 85)).toBe(9)
    expect(percentile(values, 100)).toBe(10)
    expect(percentile(values, 0)).toBe(1)
  })

  it('is undefined for no values', () => {
    expect(percentile([], 50)).toBeUndefined()
  })
})

describe('rollingPercentile', () => {
  it('gives the percentile of the values in the window before each day', () => {
    const values = [
      { date: new Date('2026-01-01T12:00Z'), value: 1 },
      { date: new Date('2026-01-02T12:00Z'), value: 3 },
      { date: new Date('2026-01-03T12:00Z'), value: 5 },
    ]

    expect(rollingPercentile(values, 100, 2, 1)).toEqual([
      { date: new Date('2026-01-03T00:00Z'), value: 3 },
      { date: new Date('2026-01-04T00:00Z'), value: 5 },
    ])
  })

  it('leaves out days with too few values in their window', () => {
    const values = [
      { date: new Date('2026-01-01T12:00Z'), value: 1 },
      { date: new Date('2026-01-05T12:00Z'), value: 3 },
    ]

    expect(rollingPercentile(values, 85, 2, 2)).toEqual([])
  })
})
