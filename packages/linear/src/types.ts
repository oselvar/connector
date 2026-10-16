export type WorkflowStateType = 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'

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
  stateHistory: LinearStateSpanConnection
}

export type LinearIssuesPage = {
  nodes: LinearIssue[]
  pageInfo: PageInfo
}
