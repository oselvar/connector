import type { LinearIssuesPage, LinearStateSpanConnection, LinearWorkflowState } from './types'

const STATE_SPAN_FIELDS = `
  nodes { stateId startedAt endedAt }
  pageInfo { hasNextPage endCursor }
`

const WORKFLOW_STATES_QUERY = `
  query WorkflowStates($teamKey: String!) {
    workflowStates(first: 250, filter: { team: { key: { eq: $teamKey } } }) {
      nodes { id name type position }
    }
  }
`

const ISSUES_QUERY = `
  query Issues($teamKey: String!, $first: Int!, $after: String) {
    issues(first: $first, after: $after, includeArchived: true, filter: { team: { key: { eq: $teamKey } } }) {
      nodes {
        id
        identifier
        url
        createdAt
        stateHistory(first: 50) { ${STATE_SPAN_FIELDS} }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const STATE_HISTORY_QUERY = `
  query StateHistory($issueId: String!, $after: String) {
    issue(id: $issueId) {
      stateHistory(first: 50, after: $after) { ${STATE_SPAN_FIELDS} }
    }
  }
`

export class LinearClient {
  constructor(
    private readonly teamKey: string,
    private readonly token: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly url = 'https://api.linear.app/graphql'
  ) {}

  async fetchWorkflowStates(): Promise<LinearWorkflowState[]> {
    const data = await this.query<{ workflowStates: { nodes: LinearWorkflowState[] } }>(WORKFLOW_STATES_QUERY, {
      teamKey: this.teamKey,
    })
    if (data.workflowStates.nodes.length === 0) {
      throw new Error(`No workflow states found for Linear team ${this.teamKey}`)
    }
    return data.workflowStates.nodes
  }

  async fetchIssuesPage(after: string | null, pageSize: number): Promise<LinearIssuesPage> {
    const data = await this.query<{ issues: LinearIssuesPage }>(ISSUES_QUERY, {
      teamKey: this.teamKey,
      first: pageSize,
      after,
    })
    return data.issues
  }

  async fetchStateHistoryPage(issueId: string, after: string | null): Promise<LinearStateSpanConnection> {
    const data = await this.query<{ issue: { stateHistory: LinearStateSpanConnection } }>(STATE_HISTORY_QUERY, {
      issueId,
      after,
    })
    return data.issue.stateHistory
  }

  private async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await this.fetchFn(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Personal API keys are sent as-is, OAuth access tokens as Bearer tokens
        Authorization: this.token.startsWith('lin_api_') ? this.token : `Bearer ${this.token}`,
      },
      body: JSON.stringify({ query, variables }),
    })
    const body = (await res.json().catch(() => null)) as { data?: T; errors?: { message: string }[] } | null
    if (!res.ok || body?.errors || !body?.data) {
      const messages = body?.errors?.map((e) => e.message).join('; ') ?? ''
      throw new Error(`Error from Linear API - status ${res.status} ${messages}`.trim())
    }
    return body.data
  }
}
