import { makeMapFromString } from '@oselvar/core'
import { describe, expect, it } from 'vitest'
import { LinearClient, createLinearIssueStream, createLinearWorkItemStream } from '../src/index.js'
import type { LinearIssue, LinearWorkflowState } from '../src/index.js'

const states: LinearWorkflowState[] = [
  { id: 's-todo', name: 'Todo', type: 'unstarted', position: 0 },
  { id: 's-progress', name: 'In Progress', type: 'started', position: 0 },
  { id: 's-done', name: 'Done', type: 'completed', position: 0 },
]

function issue(n: number, spans: LinearIssue['stateHistory']): LinearIssue {
  return {
    id: `issue-${n}`,
    identifier: `ENG-${n}`,
    title: `Issue ${n}`,
    url: `https://linear.app/oselvar/issue/ENG-${n}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    state: { id: 's-done', name: 'Done', type: 'completed' },
    archivedAt: null,
    assignee: null,
    parent: null,
    attachments: { nodes: [] },
    stateHistory: spans,
  }
}

const lastPage = { hasNextPage: false, endCursor: null }

/**
 * A fake Linear GraphQL endpoint with two pages of issues. The first issue's
 * state history spans two pages, the third issue has no state history.
 */
function makeFakeFetch(requests: { query: string; variables: Record<string, unknown> }[]): typeof fetch {
  return async (_url, init) => {
    const body = JSON.parse(init?.body as string)
    requests.push(body)
    const respond = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 })

    if (body.query.includes('query StateHistory')) {
      return respond({
        issue: {
          stateHistory: {
            nodes: [{ stateId: 's-done', startedAt: '2026-01-04T00:00:00.000Z', endedAt: null }],
            pageInfo: lastPage,
          },
        },
      })
    }
    if (body.variables.after === null) {
      return respond({
        issues: {
          nodes: [
            issue(1, {
              nodes: [
                { stateId: 's-todo', startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-02T00:00:00.000Z' },
                { stateId: 's-progress', startedAt: '2026-01-02T00:00:00.000Z', endedAt: '2026-01-04T00:00:00.000Z' },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'spans-1' },
            }),
            issue(2, {
              nodes: [{ stateId: 's-todo', startedAt: '2026-01-03T00:00:00.000Z', endedAt: null }],
              pageInfo: lastPage,
            }),
          ],
          pageInfo: { hasNextPage: true, endCursor: 'issues-1' },
        },
      })
    }
    return respond({
      issues: {
        nodes: [issue(3, { nodes: [], pageInfo: lastPage })],
        pageInfo: lastPage,
      },
    })
  }
}

async function collect<T>(stream: ReadableStream<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of stream) {
    items.push(item)
  }
  return items
}

describe('LinearWorkItemStream', () => {
  it('streams work items from all pages, including paginated state history', async () => {
    const requests: { query: string; variables: Record<string, unknown> }[] = []
    const client = new LinearClient('ENG', 'lin_api_test', makeFakeFetch(requests))
    const stageMap = makeMapFromString('Todo,In Progress,Done')

    const items = await collect(createLinearWorkItemStream(client, states, stageMap))

    expect(items).toEqual([
      {
        id: 'issue-1',
        name: 'https://linear.app/oselvar/issue/ENG-1',
        Todo: new Date('2026-01-01T00:00:00.000Z'),
        'In Progress': new Date('2026-01-02T00:00:00.000Z'),
        Done: new Date('2026-01-04T00:00:00.000Z'),
      },
      {
        id: 'issue-2',
        name: 'https://linear.app/oselvar/issue/ENG-2',
        Todo: new Date('2026-01-03T00:00:00.000Z'),
      },
    ])
    expect(requests.map((r) => r.variables)).toEqual([
      { teamKey: 'ENG', first: 50, after: null },
      { issueId: 'issue-1', after: 'spans-1' },
      { teamKey: 'ENG', first: 50, after: 'issues-1' },
    ])
  })

  it('stops after maxPages', async () => {
    const client = new LinearClient('ENG', 'lin_api_test', makeFakeFetch([]))

    const items = await collect(createLinearWorkItemStream(client, states, makeMapFromString('Todo'), 1))

    expect(items.map((item) => item.id)).toEqual(['issue-1', 'issue-2'])
  })

  it('leaves out canceled, duplicate and abandoned issues, and reports the current state', async () => {
    const canceled = {
      ...issue(4, {
        nodes: [{ stateId: 's-todo', startedAt: '2026-01-01T00:00:00.000Z', endedAt: null }],
        pageInfo: lastPage,
      }),
      state: { id: 's-canceled', name: 'Canceled', type: 'canceled' as const },
    }
    const open = {
      ...issue(5, {
        nodes: [{ stateId: 's-progress', startedAt: '2026-01-02T00:00:00.000Z', endedAt: null }],
        pageInfo: lastPage,
      }),
      state: { id: 's-progress', name: 'In Progress', type: 'started' as const },
    }
    const duplicate = {
      ...canceled,
      id: 'issue-6',
      state: { id: 's-dup', name: 'Duplicate', type: 'duplicate' as const },
    }
    const abandoned = { ...open, id: 'issue-7', archivedAt: '2026-01-03T00:00:00.000Z' }
    const archivedDone = {
      ...issue(8, {
        nodes: [{ stateId: 's-done', startedAt: '2026-01-02T00:00:00.000Z', endedAt: null }],
        pageInfo: lastPage,
      }),
      archivedAt: '2026-01-05T00:00:00.000Z',
    }
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: { issues: { nodes: [canceled, duplicate, abandoned, open, archivedDone], pageInfo: lastPage } },
        })
      )
    const client = new LinearClient('ENG', 'lin_api_test', fakeFetch)

    const items = await collect(createLinearIssueStream(client, states, makeMapFromString('Todo,In Progress,Done')))

    expect(items).toEqual([
      {
        workItem: {
          id: 'issue-5',
          name: 'https://linear.app/oselvar/issue/ENG-5',
          'In Progress': new Date('2026-01-02T00:00:00.000Z'),
        },
        identifier: 'ENG-5',
        title: 'Issue 5',
        currentState: 'In Progress',
        linearState: 'In Progress',
        linearStateType: 'started',
        assignee: null,
        parentId: null,
        pullRequests: [],
      },
      {
        workItem: {
          id: 'issue-8',
          name: 'https://linear.app/oselvar/issue/ENG-8',
          Done: new Date('2026-01-02T00:00:00.000Z'),
        },
        identifier: 'ENG-8',
        title: 'Issue 8',
        currentState: 'Done',
        linearState: 'Done',
        linearStateType: 'completed',
        assignee: null,
        parentId: null,
        pullRequests: [],
      },
    ])
  })

  it('finishes an issue when its last PR merged, and keeps its parent', async () => {
    const merged = {
      ...issue(9, {
        nodes: [{ stateId: 's-progress', startedAt: '2026-01-02T00:00:00.000Z', endedAt: null }],
        pageInfo: lastPage,
      }),
      state: { id: 's-progress', name: 'In Progress', type: 'started' as const },
      parent: { id: 'issue-1' },
      attachments: {
        nodes: [
          {
            url: 'https://github.com/oselvar/app/pull/12',
            sourceType: 'github',
            metadata: { status: 'merged', mergedAt: '2026-01-03T00:00:00.000Z' },
            updatedAt: '2026-01-04T00:00:00.000Z',
          },
          { url: 'https://example.com/spec', sourceType: 'api', metadata: {}, updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
      },
    }
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ data: { issues: { nodes: [merged], pageInfo: lastPage } } }))
    const client = new LinearClient('ENG', 'lin_api_test', fakeFetch)

    const [item] = await collect(createLinearIssueStream(client, states, makeMapFromString('Todo,In Progress,Done')))

    expect(item.workItem.Done).toEqual(new Date('2026-01-03T00:00:00.000Z'))
    expect(item.currentState).toBe('Done')
    expect(item.linearState).toBe('In Progress')
    expect(item.parentId).toBe('issue-1')
    expect(item.pullRequests).toEqual([
      {
        url: 'https://github.com/oselvar/app/pull/12',
        label: 'oselvar/app#12',
        status: 'merged',
        mergedAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    ])
  })

  it('throws on GraphQL errors', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ errors: [{ message: 'Authentication required' }] }), { status: 400 })
    const client = new LinearClient('ENG', 'bad', fakeFetch)

    await expect(client.fetchWorkflowStates()).rejects.toThrow(
      'Error from Linear API - status 400 Authentication required'
    )
  })
})
