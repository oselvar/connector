export type WorkflowStateType = 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' | 'duplicate'

export type LinearViewer = {
  id: string
  name: string
  email: string
  organization: { id: string; name: string }
}

export type LinearTeam = {
  id: string
  key: string
  name: string
}

export type LinearWorkflowState = {
  id: string
  name: string
  type: WorkflowStateType
  position: number
}

export type PageInfo = {
  hasNextPage: boolean
  endCursor: string | null
}

/**
 * A continuous period of time during which an issue remained in a workflow state.
 */
export type LinearStateSpan = {
  stateId: string
  startedAt: string
  endedAt: string | null
}

export type LinearStateSpanConnection = {
  nodes: LinearStateSpan[]
  pageInfo: PageInfo
}

/** A link on an issue, such as a GitHub pull request */
export type LinearAttachment = {
  url: string
  sourceType: string | null
  /** What the integration that made the attachment knows, such as a PR's status */
  metadata: Record<string, unknown> | null
  updatedAt: string
}

export type LinearIssue = {
  id: string
  identifier: string
  title: string
  url: string
  createdAt: string
  state: { id: string; name: string; type: WorkflowStateType }
  archivedAt: string | null
  assignee: { displayName: string } | null
  parent: { id: string } | null
  attachments: { nodes: LinearAttachment[] }
  stateHistory: LinearStateSpanConnection
}

export type LinearIssuesPage = {
  nodes: LinearIssue[]
  pageInfo: PageInfo
}
