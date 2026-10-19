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

export type LinearIssue = {
  id: string
  identifier: string
  url: string
  createdAt: string
  state: { id: string; name: string; type: WorkflowStateType }
  archivedAt: string | null
  stateHistory: LinearStateSpanConnection
}

export type LinearIssuesPage = {
  nodes: LinearIssue[]
  pageInfo: PageInfo
}
