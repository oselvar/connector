import { type WorkItem, toWorkItem } from '@oselvar/core'

import type { LinearClient } from './LinearClient'
import { makeHistoricWorkItem } from './makeHistoricWorkItem'
import type { LinearIssue, LinearStateSpan, LinearWorkflowState } from './types'

/**
 * Creates a ReadableStream that outputs WorkItem objects from a Linear team.
 */
export function createLinearWorkItemStream(
  linearClient: LinearClient,
  states: readonly LinearWorkflowState[],
  stageMap: Map<string, string>,
  maxPages?: number,
  pageSize = 50
): ReadableStream<WorkItem<string>> {
  let after: string | null = null
  let pageCount = 0
  let done = false
  const itemQueue: WorkItem<string>[] = []

  return new ReadableStream<WorkItem<string>>({
    async pull(controller) {
      // Keep fetching pages until there is something to enqueue or we're done
      while (itemQueue.length === 0 && !done) {
        const page = await linearClient.fetchIssuesPage(after, pageSize)
        pageCount++

        for (const issue of page.nodes) {
          const stateSpans = await fetchAllStateSpans(linearClient, issue)
          const workItem = toWorkItem(makeHistoricWorkItem(issue, stateSpans, states), stageMap)
          if (workItem) {
            itemQueue.push(workItem)
          }
        }

        after = page.pageInfo.endCursor
        if (!page.pageInfo.hasNextPage || (maxPages !== undefined && pageCount >= maxPages)) {
          done = true
        }
      }

      if (itemQueue.length > 0) {
        controller.enqueue(itemQueue.shift() as WorkItem<string>)
      } else {
        controller.close()
      }
    },
  })
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
