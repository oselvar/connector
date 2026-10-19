import { type WorkItem, toWorkItem } from '@oselvar/core'

import type { LinearClient } from './LinearClient'
import { makeHistoricWorkItem } from './makeHistoricWorkItem'
import type { LinearIssue, LinearStateSpan, LinearWorkflowState } from './types'

/**
 * A work item together with the workflow state its issue is in now.
 */
export type LinearWorkItem = {
  workItem: WorkItem<string>
  currentState: string
  /** Who the issue is assigned to, if anyone */
  assignee: string | null
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

  return new ReadableStream<LinearWorkItem>({
    async pull(controller) {
      // Keep fetching pages until there is something to enqueue or we're done
      while (itemQueue.length === 0 && !done) {
        const page = await linearClient.fetchIssuesPage(after, pageSize)
        pageCount++

        for (const issue of page.nodes) {
          if (!isLive(issue)) continue
          const stateSpans = await fetchAllStateSpans(linearClient, issue)
          const workItem = toWorkItem(makeHistoricWorkItem(issue, stateSpans, states), stageMap)
          if (workItem) {
            itemQueue.push({
              workItem,
              currentState: stageMap.get(issue.state.name) ?? issue.state.name,
              assignee: issue.assignee?.displayName ?? null,
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
