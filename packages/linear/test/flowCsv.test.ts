import { describe, expect, it } from 'vitest'
import { type LinearWorkItem, formatLinearFlowCsv } from '../src/index.js'

function issue(id: string, workItem: Record<string, Date>, overrides: Partial<LinearWorkItem> = {}): LinearWorkItem {
  return {
    workItem: { id, name: `https://linear.app/o/issue/${id}`, ...workItem } as LinearWorkItem['workItem'],
    identifier: id,
    title: `Title ${id}`,
    createdAt: new Date('2000-01-01'),
    currentState: 'In Progress',
    linearState: 'In Progress',
    linearStateType: 'started',
    assignee: null,
    parentId: null,
    pullRequests: [],
    ...overrides,
  }
}

describe('formatLinearFlowCsv', () => {
  it('writes one row per issue, with parents rolled up from their sub-issues', () => {
    const csv = formatLinearFlowCsv(
      [
        issue('ENG-1', { Todo: new Date('2026-01-01T00:00:00Z') }),
        issue(
          'ENG-2',
          { 'In Progress': new Date('2026-01-02T00:00:00Z'), Done: new Date('2026-01-03T00:00:00Z') },
          {
            parentId: 'ENG-1',
            linearState: 'In Review',
            pullRequests: [
              { url: 'u', label: 'o/r#9', status: 'merged', mergedAt: new Date('2026-01-03T00:00:00Z'), ships: true },
            ],
          }
        ),
        issue('ENG-3', {}, { parentId: 'nowhere' }),
      ],
      ['Todo', 'In Progress', 'Done'],
      'In Progress'
    )
    expect(csv.split('\n')).toEqual([
      'ID,Link,Name,Todo,In Progress,Done,Level,Parent,Top-level,Sub-issues,State,PRs,Merged at',
      'ENG-1,https://linear.app/o/issue/ENG-1,Title ENG-1,2026-01-01T00:00:00.000Z,2026-01-02T00:00:00.000Z,2026-01-03T00:00:00.000Z,Top-level,,ENG-1,1,In Progress,,',
      'ENG-2,https://linear.app/o/issue/ENG-2,Title ENG-2,,2026-01-02T00:00:00.000Z,2026-01-03T00:00:00.000Z,Leaf,ENG-1,ENG-1,,In Review,o/r#9,2026-01-03T00:00:00.000Z',
      'ENG-3,https://linear.app/o/issue/ENG-3,Title ENG-3,,,,Standalone,,ENG-3,,In Progress,,',
    ])
  })
})
