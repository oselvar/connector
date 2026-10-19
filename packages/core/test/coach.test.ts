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

const run = (items: StagedItem[]) =>
  coach({
    items,
    stages,
    queueStage: 'Backlog',
    fromStage: 'In Progress',
    toStage: 'Done',
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

  it('points out when states the workflow marks as not started are counted as active', () => {
    const findings = coach({
      items: [{ id: 'planned', Todo: daysAgo(3) }],
      stages: ['Backlog', 'Todo', 'In Progress', 'Done'],
      queueStage: 'Backlog',
      fromStage: 'Todo',
      toStage: 'Done',
      notStartedStages: ['Backlog', 'Todo'],
      now,
      identify: (item) => item.id,
    })

    expect(findings[0]).toMatchObject({
      id: 'not-started-but-active',
      title: "Todo is counted as active, but work hasn't started there",
      seen: '1 issue of the 1 active is in Todo, which your workflow marks as not started.',
      action:
        'Move the left handle to Todo. Issues there will count as waiting, and work will start when it moves past it.',
    })
  })

  it('suggests closing old issues when the queue gets long', () => {
    const ideas = Array.from({ length: 25 }, (_, i) => ({ id: `idea-${i}`, Backlog: daysAgo(20 + 2 * i) }))
    const finding = run([...steady(), ...ideas]).find((f) => f.id === 'long-queue')

    expect(finding).toMatchObject({
      status: 'watch',
      trend: 'worse',
      title: '25 issues are waiting in Backlog',
      seen: 'Half of them have waited more than 44 days, and 19 for over 30 days. A month ago, 20 issues were waiting.',
    })
  })

  it('says which stage work is waiting in', () => {
    const inReview = Array.from({ length: 8 }, (_, i) => ({
      id: `review-${i}`,
      'In Progress': daysAgo(12 + i),
      'In Review': daysAgo(10),
    }))

    expect(run([...steady(), ...inReview]).map((f) => f.title)).toContain('Work is waiting in In Review')
  })

  it('warns when there is much more in progress than people to work on it', () => {
    const owners = ['aslak', 'aslak', 'aslak', 'eivind', 'eivind', undefined, undefined]
    const wip = owners.map((owner, i) => ({ id: `wip-${i}`, name: owner, 'In Progress': daysAgo(1) }))
    const findings = coach({
      items: [...steady(), ...wip],
      stages,
      queueStage: 'Backlog',
      fromStage: 'In Progress',
      toStage: 'Done',
      now,
      identify: (item) => item.id,
      teamSize: 2,
      assigneeOf: (item) => (item.id.startsWith('wip-') ? item.name : undefined),
    })

    expect(findings[0]).toMatchObject({
      id: 'work-in-progress-per-person',
      status: 'act',
      title: 'About 3.5 active issues per person',
      seen: '7 issues are active for 2 people on the team: about 3.5 each. By person: aslak 3, eivind 2, nobody 2.',
    })
  })

  it('notices when nothing has finished for a week', () => {
    const items = steady().map((item, i) => (i >= 56 ? { ...item, Done: undefined } : item))
    const findings = run(items)

    expect(findings[0]).toMatchObject({ id: 'nothing-finished', status: 'act' })
  })
})
