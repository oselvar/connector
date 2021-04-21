import { graphql } from '@octokit/graphql'
import { HistoricWorkItem, toWorkItem, WorkItemSnapshot } from '@oselvar/connector-core'
import { Readable } from 'stream'

type WorkItemType = 'issues' | 'pullRequests'

export type QueryParams = Readonly<{
  owner: string
  name: string
  beforeCursor?: string
  afterCursor?: string
  first?: number
  last?: number
}>

/**
 * Outputs {@link HistoricWorkItem} objects.
 */
export default class GitHubWorkItemStream extends Readable {
  private readonly query: string
  private pageCount = 0
  private rateLimit: GitHubRateLimit

  constructor(
    private readonly workItemType: WorkItemType,
    private readonly auth: string,
    private readonly maxPages: number | undefined,
    private readonly stageMap: Map<string, string>,
    private queryParams: QueryParams
  ) {
    super({ objectMode: true })
    this.query = makeQuery(workItemType)
  }

  _read() {
    this.fetchMore().catch((err) => this.emit('error', err))
  }

  private async fetchMore() {
    if (this.rateLimit) {
      console.error(new Date(), this.rateLimit)
    }
    const gitHubWorkItemsPage = await fetchGitHubWorkItemsPage(this.query, this.auth, this.queryParams)
    this.rateLimit = gitHubWorkItemsPage.rateLimit
    const workItems = gitHubWorkItemsPage.repository[this.workItemType]
    for (const issue of workItems.nodes) {
      const historicWorkItem = makeHistoricWorkItem(issue)
      const workItem = toWorkItem(historicWorkItem, this.stageMap)
      this.push(workItem)
    }
    this.pageCount++
    if (this.maxPages !== undefined && this.pageCount >= this.maxPages) {
      this.push(null)
    } else if (this.queryParams.first && workItems.pageInfo.endCursor) {
      this.queryParams = { ...this.queryParams, ...{ afterCursor: workItems.pageInfo.endCursor } }
    } else if (this.queryParams.last && workItems.pageInfo.startCursor) {
      this.queryParams = { ...this.queryParams, ...{ beforeCursor: workItems.pageInfo.startCursor } }
    } else {
      this.push(null)
    }
  }
}

function makeQuery(workItemType: WorkItemType) {
  return `query ($owner: String!, $name: String!, $beforeCursor: String, $afterCursor: String, $first: Int, $last: Int) {
  repository(owner: $owner, name: $name) {
    ${workItemType}(first: $first, last: $last, before: $beforeCursor, after: $afterCursor) {
      nodes {
        id
        url
        createdAt
        closedAt
        timelineItems(itemTypes: [ADDED_TO_PROJECT_EVENT, MOVED_COLUMNS_IN_PROJECT_EVENT, LABELED_EVENT, ISSUE_COMMENT], first: 100) {
          nodes {
            __typename
            ... on AddedToProjectEvent {
              projectColumnName
              createdAt
            }
            ... on MovedColumnsInProjectEvent {
              projectColumnName
              createdAt
            }
            ... on LabeledEvent {
              createdAt
            }
            ... on IssueComment {
              createdAt
            }
          }
        }
      }
      pageInfo {
        startCursor
        endCursor
      }
    }
  }
  
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
}
`
}

type AddedToProjectEvent = Readonly<{
  __typename: 'AddedToProjectEvent'
  projectColumnName: string
  createdAt: string
}>

type MovedColumnsInProjectEvent = Readonly<{
  __typename: 'MovedColumnsInProjectEvent'
  projectColumnName: string
  createdAt: string
}>

type LabeledEvent = Readonly<{
  __typename: 'LabeledEvent'
  createdAt: string
}>

type IssueComment = Readonly<{
  __typename: 'IssueComment'
  createdAt: string
}>

type GitHubWorkItems = {
  nodes: readonly GitHubWorkItem[]
  pageInfo: {
    endCursor?: string
    startCursor?: string
  }
}

type GitHubWorkItemsPage = Readonly<{
  repository: {
    issues: GitHubWorkItems
    pullRequests: GitHubWorkItems
  }
  rateLimit: GitHubRateLimit
}>

type GitHubWorkItem = Readonly<{
  id: string
  url: string
  createdAt: string
  closedAt: string
  timelineItems: {
    nodes: readonly (AddedToProjectEvent | MovedColumnsInProjectEvent | LabeledEvent | IssueComment)[]
  }
}>

type GitHubRateLimit = {
  limit: number
  cost: number
  remaining: number
  resetAt: string
}

function makeHistoricWorkItem(gitHubWorkItem: GitHubWorkItem): HistoricWorkItem<string> {
  const snapshots: WorkItemSnapshot<string>[] = []
  snapshots.push({
    timestamp: new Date(gitHubWorkItem.createdAt),
    stage: 'open',
  })
  // For "labeled" and "commented" events, we only want to record the first one, and ignore the following ones.
  // This is because we use them to measure the cycle time from a work item was opened until it was *first*
  // commented on or labeled (and ignore later comments and labels)/
  let pushLabeled = true
  let pushCommented = true
  for (const event of gitHubWorkItem.timelineItems.nodes) {
    switch (event.__typename) {
      case 'AddedToProjectEvent':
      case 'MovedColumnsInProjectEvent':
        snapshots.push({
          timestamp: new Date(event.createdAt),
          stage: event.projectColumnName,
        })
        break
      case 'LabeledEvent':
        if (pushLabeled) {
          snapshots.push({
            timestamp: new Date(event.createdAt),
            stage: 'labeled',
          })
          pushLabeled = false
        }
        break
      case 'IssueComment':
        if (pushCommented) {
          snapshots.push({
            timestamp: new Date(event.createdAt),
            stage: 'commented',
          })
          pushCommented = false
        }
        break
      default:
        throw new Error(`Unexpected event type: ${JSON.stringify(event)}`)
    }
  }
  if (gitHubWorkItem.closedAt) {
    snapshots.push({
      timestamp: new Date(gitHubWorkItem.closedAt),
      stage: 'closed',
    })
  }
  return {
    id: gitHubWorkItem.id,
    name: gitHubWorkItem.url,
    snapshots,
  }
}

async function fetchGitHubWorkItemsPage(
  query: string,
  auth: string,
  queryParams: QueryParams
): Promise<GitHubWorkItemsPage> {
  return graphql<GitHubWorkItemsPage>(query, {
    ...queryParams,
    headers: {
      authorization: `token ${auth}`,
    },
    mediaType: {
      // https://docs.github.com/en/free-pro-team@latest/graphql/overview/schema-previews#project-event-details-preview
      previews: ['starfox'],
    },
  })
}
