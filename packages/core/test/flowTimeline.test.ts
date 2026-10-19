import { describe, expect, it } from 'vitest'
import { dailyWorkInProgress, finishedBetween, inProgressAt, inStageAt, makeFlowTimeline } from '../src/index.js'

const stages = ['Todo', 'In Progress', 'In Review', 'Done']
const day = (d: number) => new Date(Date.UTC(2026, 0, d))
const items = [
  { id: '1', Todo: day(1), 'In Progress': day(2), 'In Review': day(4), Done: day(5) },
  // Skipped In Review
  { id: '2', 'In Progress': day(3), Done: day(6) },
  { id: '3', 'In Progress': day(4) },
]
const timeline = makeFlowTimeline(items, stages, 'In Progress', 'Done')

describe('flow timeline', () => {
  it('knows what was in progress, and where, at any time', () => {
    const midday = day(4).getTime() + 12 * 3600000

    expect(inProgressAt(timeline, midday).map((w) => [w.item.id, w.stage, w.ageDays])).toEqual([
      ['1', 'In Review', 2.5],
      ['2', 'In Progress', 1.5],
      ['3', 'In Progress', 0.5],
    ])
    expect(inStageAt(timeline, 'In Progress', midday)).toBe(2)
  })

  it('knows what finished between two times', () => {
    expect(
      finishedBetween(timeline, day(5).getTime(), day(7).getTime()).map((f) => [f.item.id, f.cycleTimeDays])
    ).toEqual([
      ['1', 3],
      ['2', 3],
    ])
  })

  it('counts work in progress at the end of each day', () => {
    expect(dailyWorkInProgress(timeline, day(2).getTime(), 5).map((d) => d.count)).toEqual([1, 2, 3, 2, 1])
  })
})
