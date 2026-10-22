import type {
  LinearIssuesPage,
  LinearStateSpanConnection,
  LinearTeam,
  LinearViewer,
  LinearWorkflowState,
} from './types'

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql'

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
        title
        url
        createdAt
        archivedAt
        assignee { displayName }
        state { id name type }
        parent { id }
        attachments(first: 20) { nodes { url sourceType metadata updatedAt } }
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

const TEAM_MEMBERS_QUERY = `
  query TeamMembers($teamKey: String!) {
    teams(first: 1, filter: { key: { eq: $teamKey } }) {
      nodes { members(first: 100) { nodes { active } } }
    }
  }
`

const VIEWER_QUERY = `
  query Viewer {
    viewer { id name email organization { id name } }
  }
`

const TEAMS_QUERY = `
  query Teams {
    teams(first: 250) { nodes { id key name } }
  }
`

/**
 * Sends a GraphQL request to Linear. Personal API keys (lin_api_...) are sent as-is,
 * OAuth access tokens as Bearer tokens.
 */
export async function linearGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
  fetchFn: typeof fetch = fetch
): Promise<T> {
  const res = await fetchFn(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token.startsWith('lin_api_') ? token : `Bearer ${token}`,
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

export async function fetchViewer(token: string, fetchFn: typeof fetch = fetch): Promise<LinearViewer> {
  const data = await linearGraphQL<{ viewer: LinearViewer }>(token, VIEWER_QUERY, {}, fetchFn)
  return data.viewer
}

export async function fetchTeams(token: string, fetchFn: typeof fetch = fetch): Promise<LinearTeam[]> {
  const data = await linearGraphQL<{ teams: { nodes: LinearTeam[] } }>(token, TEAMS_QUERY, {}, fetchFn)
  return data.teams.nodes
}

export class LinearClient {
  constructor(
    private readonly teamKey: string,
    private readonly token: string,
    private readonly fetchFn: typeof fetch = fetch
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

  /** How many active people are on the team */
  async fetchMemberCount(): Promise<number> {
    const data = await this.query<{ teams: { nodes: { members: { nodes: { active: boolean }[] } }[] } }>(
      TEAM_MEMBERS_QUERY,
      { teamKey: this.teamKey }
    )
    return data.teams.nodes[0]?.members.nodes.filter((member) => member.active).length ?? 0
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

  private query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    return linearGraphQL<T>(this.token, query, variables, this.fetchFn)
  }
}
