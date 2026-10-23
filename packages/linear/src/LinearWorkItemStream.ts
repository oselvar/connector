import { type WorkItem, orderedMapValues, toWorkItem } from '@oselvar/core'

import type { LinearClient } from './LinearClient'
import { makeHistoricWorkItem } from './makeHistoricWorkItem'
import { type PullRequest, finishOnMerge, lastMergedAt, toPullRequest } from './pullRequests'
import type { LinearIssue, LinearStateSpan, LinearWorkflowState, WorkflowStateType } from './types'

/**
 * A work item together with the workflow state its issue is in now.
 */
export type LinearWorkItem = {
  workItem: WorkItem<string>
  /** ENG-123 */
  identifier: string
  title: string
  /** When the issue was created, which for a sub-issue is usually when it was added to its parent */
  createdAt: Date
  /** The stage the work item is in now: the finish stage once its PRs merged */
  currentState: string
  /** The state the issue is in in Linear, which may lag behind GitHub */
  linearState: string
  /** The kind of state the issue is in in Linear, which means the same in every team */
  linearStateType: WorkflowStateType
  /** Who the issue is assigned to, if anyone */
  assignee: string | null
  /** The Linear id of the parent issue, if it is a sub-issue */
  parentId: string | null
  /** Linked GitHub pull requests */
  pullRequests: PullRequest[]
}

/**
 * Creates a ReadableStream that outputs WorkItem objects from a Linear team.
 * Canceled, duplicate and abandoned issues are left out.
 */
export function createLinearWorkItemStream(
  linearClient: LinearClient,
  states: readonly LinearWorkflowState[],
  stageMap: Map<string, string>,
  maxPages?: number,
  pageSize = 50
): ReadableStream<WorkItem<string>> {
  return createLinearIssueStream(linearClient, states, stageMap, maxPages, pageSize).pipeThrough(
    new TransformStream<LinearWorkItem, WorkItem<string>>({
      transform({ workItem }, controller) {
        controller.enqueue(workItem)
      },
    })
  )
}

/**
 * Creates a ReadableStream that outputs work items with their issue's current state.
 * Canceled, duplicate and abandoned issues are left out, since they will never finish.
 *
 * Merging is shipping: an issue is finished when the last of its PRs merged, even if
 * nobody moved it to a completed state in Linear.
 */
export function createLinearIssueStream(
  linearClient: LinearClient,
  states: readonly LinearWorkflowState[],
  stageMap: Map<string, string>,
  maxPages?: number,
  pageSize = 50
): ReadableStream<LinearWorkItem> {
  let after: string | null = null
  let pageCount = 0
  let done = false
  const itemQueue: LinearWorkItem[] = []
  const stages = orderedMapValues(stageMap)
  const completed = states.find((state) => state.type === 'completed' && stageMap.has(state.name))
  const finishStage = completed ? stageMap.get(completed.name) : undefined

  return new ReadableStream<LinearWorkItem>({
    async pull(controller) {
      // Keep fetching pages until there is something to enqueue or we're done
      while (itemQueue.length === 0 && !done) {
        const page = await linearClient.fetchIssuesPage(after, pageSize)
        pageCount++

        for (const issue of page.nodes) {
          if (!isLive(issue)) continue
          const stateSpans = await fetchAllStateSpans(linearClient, issue)
          const historic = toWorkItem(makeHistoricWorkItem(issue, stateSpans, states), stageMap)
          if (historic) {
            const pullRequests = (issue.attachments?.nodes ?? []).flatMap((a) => toPullRequest(a) ?? [])
            const workItem = finishStage
              ? finishOnMerge(historic, stages, finishStage, lastMergedAt(pullRequests))
              : historic
            const linearState = stageMap.get(issue.state.name) ?? issue.state.name
            const mergedButOpen = finishStage !== undefined && workItem !== historic && issue.state.type !== 'completed'
            itemQueue.push({
              workItem,
              identifier: issue.identifier,
              title: issue.title,
              createdAt: new Date(issue.createdAt),
              currentState: mergedButOpen ? (finishStage as string) : linearState,
              linearState,
              linearStateType: issue.state.type,
              assignee: issue.assignee?.displayName ?? null,
              parentId: issue.parent?.id ?? null,
              pullRequests,
            })
          }
        }

        after = page.pageInfo.endCursor
        if (!page.pageInfo.hasNextPage || (maxPages !== undefined && pageCount >= maxPages)) {
          done = true
        }
      }

      if (itemQueue.length > 0) {
        controller.enqueue(itemQueue.shift() as LinearWorkItem)
      } else {
        controller.close()
      }
    },
  })
}

/**
 * Whether an issue is still part of the flow: not canceled or marked as a duplicate, and not
 * archived before it finished. Finished issues stay, since Linear archives them automatically.
 */
function isLive(issue: LinearIssue): boolean {
  if (issue.state.type === 'canceled' || issue.state.type === 'duplicate') return false
  return issue.archivedAt === null || issue.state.type === 'completed'
}

async function fetchAllStateSpans(linearClient: LinearClient, issue: LinearIssue): Promise<LinearStateSpan[]> {
  const spans = [...issue.stateHistory.nodes]
  let pageInfo = issue.stateHistory.pageInfo
  while (pageInfo.hasNextPage) {
    const next = await linearClient.fetchStateHistoryPage(issue.id, pageInfo.endCursor)
    spans.push(...next.nodes)
    pageInfo = next.pageInfo
  }
  return spans
}

/** Reads a stream to the end */
export async function readAll<T>(stream: ReadableStream<T>): Promise<T[]> {
  const items: T[] = []
  const reader = stream.getReader()
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    items.push(next.value)
  }
  return items
}
