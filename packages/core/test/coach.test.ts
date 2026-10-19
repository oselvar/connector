import { describe, expect, it } from 'vitest'
import { type StagedItem, coach, coachHeadline } from '../src/index.js'

const stages = ['Backlog', 'In Progress', 'In Review', 'Done']
const now = new Date(Date.UTC(2026, 5, 1))
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)

// Issues finishing steadily over the last 120 days, each taking 2 days
function steady(): StagedItem[] {
  return Array.from({ length: 60 }, (_, i) => ({
    id: `done-${i}`,
    name: `ENG-${i}`,
    Backlog: daysAgo(124 - i * 2),
    'In Progress': daysAgo(122 - i * 2),
    Done: daysAgo(120 - i * 2),
  }))
}

const run = (items: StagedItem[], fromStage = 'In Progress') =>
  coach({
    items,
    stages,
    fromStage,
    toStage: 'Done',
    commitmentStage: 'In Progress',
    now,
    identify: (item) => item.name ?? item.id,
  })

describe('coach', () => {
  it('says work is flowing well when it is', () => {
    const findings = run(steady())

    expect(findings.map((f) => [f.id, f.status, f.trend])).toEqual([
      ['work-in-progress', 'good', 'same'],
      ['old-items', 'good', 'same'],
      ['cycle-time', 'good', 'same'],
      ['throughput', 'good', 'same'],
    ])
    expect(coachHeadline(findings)).toBe('Work is flowing well.')
  })

  it('warns when work piles up and gets old', () => {
    const piling = Array.from({ length: 12 }, (_, i) => ({
      id: `wip-${i}`,
      name: `ENG-${100 + i}`,
      'In Progress': daysAgo(20 - i),
    }))
    const findings = run([...steady(), ...piling])

    expect(findings[0]).toMatchObject({ id: 'work-in-progress', status: 'act', trend: 'worse' })
    expect(findings[1]).toMatchObject({ id: 'old-items', status: 'act', trend: 'worse' })
    expect(findings[1].seen).toContain('The oldest, ENG-100, has been going for 20 days and is in In Progress.')
    expect(coachHeadline(findings)).toBe("Work is piling up. Finish what you've started before starting more.")
  })

  it('points out when the range starts before work has started', () => {
    const findings = run([...steady(), { id: 'idea', Backlog: daysAgo(3) }], 'Backlog')

    expect(findings[0]).toMatchObject({
      id: 'before-commitment',
      seen: '1 issue of the 1 counted as in progress is waiting before In Progress.',
    })
  })

  it('says which stage work is waiting in, but not for stages before work has started', () => {
    const inReview = Array.from({ length: 8 }, (_, i) => ({
      id: `review-${i}`,
      'In Progress': daysAgo(12 + i),
      'In Review': daysAgo(10),
    }))
    const ideas = Array.from({ length: 20 }, (_, i) => ({ id: `idea-${i}`, Backlog: daysAgo(i) }))

    expect(run([...steady(), ...inReview]).map((f) => f.title)).toContain('Work is waiting in In Review')
    expect(run([...steady(), ...ideas], 'Backlog').map((f) => f.title)).not.toContain('Work is waiting in Backlog')
  })

  it('notices when nothing has finished for a week', () => {
    const items = steady().map((item, i) => (i >= 56 ? { ...item, Done: undefined } : item))
    const findings = run(items)

    expect(findings[0]).toMatchObject({ id: 'nothing-finished', status: 'act' })
  })
})
