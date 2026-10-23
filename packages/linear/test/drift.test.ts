import { describe, expect, it } from 'vitest'
import { type LinearWorkItem, type PullRequest, findDrift } from '../src/index.js'

const merged: PullRequest = {
  url: 'u',
  label: 'o/r#1',
  status: 'merged',
  mergedAt: new Date('2026-01-02'),
  ships: true,
}
const open: PullRequest = { url: 'u', label: 'o/r#2', status: 'open', mergedAt: null, ships: true }

function issue(id: string, overrides: Partial<LinearWorkItem> = {}): LinearWorkItem {
  return {
    workItem: { id } as LinearWorkItem['workItem'],
    identifier: id,
    title: id,
    currentState: 'In Progress',
    linearState: 'In Progress',
    linearStateType: 'started',
    assignee: null,
    parentId: null,
    pullRequests: [],
    ...overrides,
  }
}

const done = { linearState: 'Done', linearStateType: 'completed' as const }
const kinds = (issues: LinearWorkItem[]) => findDrift(issues).map((d) => [d.kind, d.issue.identifier])

describe('findDrift', () => {
  it('finds leaves whose PRs merged while the issue is open, and the other way round', () => {
    expect(
      kinds([
        issue('merged', { pullRequests: [merged] }),
        issue('done', { ...done, pullRequests: [open] }),
        issue('fine', { ...done, pullRequests: [merged] }),
        issue('still-open', { pullRequests: [merged, open] }),
      ])
    ).toEqual([
      ['merged-but-open', 'merged'],
      ['done-but-pr-open', 'done'],
    ])
  })

  it('finds parents that disagree with the work under them', () => {
    const drift = findDrift([
      issue('parent-done', done),
      issue('a', { parentId: 'parent-done' }),
      issue('b', { ...done, parentId: 'parent-done' }),
      issue('parent-open'),
      issue('c', { parentId: 'parent-open', pullRequests: [merged] }),
      issue('d', { ...done, parentId: 'parent-open' }),
    ])
    expect(drift.filter((d) => d.leaves).map((d) => [d.kind, d.issue.identifier, d.leaves])).toEqual([
      ['parent-done-work-open', 'parent-done', { total: 2, finished: 1 }],
      ['work-done-parent-open', 'parent-open', { total: 2, finished: 2 }],
    ])
  })
})
