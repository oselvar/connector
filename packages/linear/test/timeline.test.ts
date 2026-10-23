import { describe, expect, it } from 'vitest'
import {
  type ItemSummary,
  type LinearWorkItem,
  agingLimit,
  issueHierarchy,
  leafProgress,
  rankItems,
  rankReason,
  summarizeItem,
} from '../src/index.js'

const stages = ['Backlog', 'In Progress', 'Done']
const start = 1
const finish = 2
const now = new Date('2026-01-10T00:00:00Z')
const day = (n: number) => new Date(Date.UTC(2026, 0, n))

function issue(id: string, workItem: Record<string, Date>, overrides: Partial<LinearWorkItem> = {}): LinearWorkItem {
  return {
    workItem: { id, name: `https://linear.app/o/issue/${id}`, ...workItem } as LinearWorkItem['workItem'],
    identifier: id,
    title: id,
    createdAt: day(1),
    currentState: 'Backlog',
    linearState: 'Backlog',
    linearStateType: 'backlog',
    assignee: null,
    parentId: null,
    pullRequests: [],
    ...overrides,
  }
}

describe('leafProgress', () => {
  it('is waiting, active or finished', () => {
    expect(leafProgress(issue('a', { Backlog: day(1) }), stages, start, finish).status).toBe('waiting')
    expect(leafProgress(issue('b', { 'In Progress': day(2) }), stages, start, finish).status).toBe('active')
    expect(leafProgress(issue('c', { Done: day(3) }), stages, start, finish)).toEqual({
      status: 'finished',
      added: day(1),
      started: day(3),
      finished: day(3),
    })
  })
})

describe('agingLimit', () => {
  it('is how long 85% of finished leaves took', () => {
    const leaves = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
      issue(`l${n}`, { 'In Progress': day(1), Done: new Date(day(1).getTime() + n * 86_400_000) })
    )
    expect(agingLimit(leaves, stages, start, finish)).toBe(9)
  })
})

describe('summarizeItem', () => {
  const parent = issue('parent', {}, { linearState: 'In Progress', linearStateType: 'started' })
  const summarize = (children: LinearWorkItem[]) => {
    const hierarchy = issueHierarchy([parent, ...children])
    const node = hierarchy.topLevel[0]
    return summarizeItem(node, hierarchy, stages, start, finish, now, 2)
  }
  const child = (id: string, workItem: Record<string, Date>, overrides: Partial<LinearWorkItem> = {}) =>
    issue(id, workItem, { parentId: 'parent', ...overrides })

  it('is stuck when active work is older than the aging limit', () => {
    const summary = summarize([
      child('done', { 'In Progress': day(2), Done: day(3) }),
      child('old', { 'In Progress': day(5) }),
      child('new', { 'In Progress': day(9) }),
      child('later', { Backlog: day(1) }, { createdAt: day(8) }),
    ])
    expect(summary).toMatchObject({
      group: 'stuck',
      total: 4,
      finished: 1,
      active: 2,
      aging: 1,
      waiting: 1,
      addedThisWeek: 1,
      start: day(2),
    })
  })

  it('is stalled when some work is done and nothing is active', () => {
    expect(summarize([child('done', { Done: day(3) }), child('next', { Backlog: day(1) })]).group).toBe('stalled')
  })

  it('is finished when all its leaves are', () => {
    const summary = summarize([child('done', { 'In Progress': day(2), Done: day(3) })])
    expect(summary).toMatchObject({ group: 'finished', end: day(3) })
  })

  it("doesn't start before it was created", () => {
    const summary = summarize([child('moved-in', { 'In Progress': new Date('2025-09-02') }, { createdAt: day(1) })])
    expect(summary.start).toEqual(day(1))
  })
})

describe('rankItems', () => {
  const item = (id: string, group: ItemSummary['group'], finished: number, total: number, aging = 0) =>
    ({ node: { id }, group, finished, total, aging }) as unknown as ItemSummary

  it('puts stuck before stalled, and the item closest to done first', () => {
    const ranked = rankItems([
      item('stalled', 'stalled', 3, 4),
      item('stuck-early', 'stuck', 0, 15, 6),
      item('idle', 'idle', 0, 3),
      item('stuck-nearly-done', 'stuck', 8, 9, 1),
    ])
    expect(ranked.map((i) => i.node.id)).toEqual(['stuck-nearly-done', 'stuck-early', 'stalled', 'idle'])
  })
})

describe('rankReason', () => {
  it('says when the last sub-issue is the stuck one', () => {
    const summary = { group: 'stuck', total: 9, finished: 8, active: 1, aging: 1, waiting: 0, addedThisWeek: 9 }
    expect(rankReason(summary as ItemSummary)).toBe('The last sub-issue is stuck. Finishing it ships the item.')
  })
})

describe('a top-level item completed in Linear', () => {
  const parent = issue('parent', {}, { currentState: 'Done', linearState: 'Done', linearStateType: 'completed' })
  const child = (id: string, workItem: Record<string, Date>) => issue(id, workItem, { parentId: 'parent' })

  it('is finished when the work that got as far as it is, and counts the rest as left behind', () => {
    const hierarchy = issueHierarchy([
      parent,
      child('done', { 'In Progress': day(2), Done: day(3) }),
      child('abandoned', { 'In Progress': day(2) }),
      child('parked', { Backlog: day(1) }),
    ])
    const summary = summarizeItem(hierarchy.topLevel[0], hierarchy, stages, start, finish, now, 2)
    expect(summary).toMatchObject({ group: 'finished', total: 1, finished: 1, leftBehind: 1, end: day(3) })
    expect(rankReason(summary)).toBe('1 sub-issue finished. 1 sub-issue was left open when it was closed.')
  })
})
