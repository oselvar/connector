import { graphql } from '@octokit/graphql'
import { type HistoricWorkItem, type WorkItem, type WorkItemSnapshot, toWorkItem } from '../core'

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
 * Creates a ReadableStream that outputs WorkItem objects from GitHub.
 */
export function createGitHubWorkItemStream(
  workItemType: WorkItemType,
  auth: string,
  maxPages: number | undefined,
  stageMap: Map<string, string>,
  queryParams: QueryParams
): ReadableStream<WorkItem<string>> {
  const query = makeQuery(workItemType)
  let pageCount = 0
  let currentParams = queryParams
  let done = false
  const itemQueue: WorkItem<string>[] = []
  let rateLimit: GitHubRateLimit | undefined

  return new ReadableStream<WorkItem<string>>({
    async pull(controller) {
      // Drain queue first
      if (itemQueue.length > 0) {
        controller.enqueue(itemQueue.shift() as WorkItem<string>)
        return
      }
      if (done) {
        controller.close()
        return
      }

      // Log rate limit info
      if (rateLimit) {
        console.error(new Date(), rateLimit)
      }

      // Fetch next page
      const gitHubWorkItemsPage = await fetchGitHubWorkItemsPage(query, auth, currentParams)
      rateLimit = gitHubWorkItemsPage.rateLimit
      const workItems = gitHubWorkItemsPage.repository[workItemType]

      // Process items into queue
      for (const issue of workItems.nodes) {
        const historicWorkItem = makeHistoricWorkItem(issue)
        const workItem = toWorkItem(historicWorkItem, stageMap)
        if (workItem) {
          itemQueue.push(workItem)
        }
      }

      // Update pagination state
      pageCount++
      if (maxPages !== undefined && pageCount >= maxPages) {
        done = true
      } else if (currentParams.first && workItems.pageInfo.endCursor) {
        currentParams = { ...currentParams, afterCursor: workItems.pageInfo.endCursor }
      } else if (currentParams.last && workItems.pageInfo.startCursor) {
        currentParams = { ...currentParams, beforeCursor: workItems.pageInfo.startCursor }
      } else {
        done = true
      }

      // Enqueue or close
      if (itemQueue.length > 0) {
        controller.enqueue(itemQueue.shift() as WorkItem<string>)
      } else if (done) {
        controller.close()
      }
    },
  })
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
  const sortedNodes = gitHubWorkItem.timelineItems.nodes
    .slice()
    .filter((node) => node)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const event of sortedNodes) {
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
