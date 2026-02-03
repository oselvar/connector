import { writeFile } from 'node:fs/promises'
import { type HistoricWorkItem, type WorkItem, toWorkItem } from '../core'

import type JiraClient from './JiraClient'
import makeHistoricWorkItem from './makeHistoricWorkItem'
import type { JiraIssue } from './types'

/**
 * Creates a ReadableStream that outputs WorkItem objects from Jira.
 */
export function createJiraWorkItemStream(
  jiraClient: JiraClient,
  stageMap: Map<string, string>
): ReadableStream<WorkItem<string>> {
  let issueCount = 0
  let startAt = 0
  let done = false
  const itemQueue: WorkItem<string>[] = []
  let total = 0

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

      // Fetch next page
      const jiraIssuesPage = await jiraClient.fethJiraIssuesPage(startAt)
      total = jiraIssuesPage.total

      // Process items into queue
      for (const jiraIssue of jiraIssuesPage.issues) {
        const historicWorkItem = makeHistoricWorkItem(jiraIssue)
        if (process.env.JIRA_DEBUG) {
          await save(jiraIssue, historicWorkItem)
        }
        const workItem = toWorkItem(historicWorkItem, stageMap)
        if (workItem) {
          itemQueue.push(workItem)
        }
        issueCount++
      }

      // Update pagination state
      startAt = issueCount
      if (issueCount >= total) {
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

async function save(jiraIssue: JiraIssue, historicWorkItem: HistoricWorkItem<string>) {
  await writeFile(`${__dirname}/../test/${jiraIssue.key}.json`, JSON.stringify(jiraIssue, null, 2), 'utf-8')
  await writeFile(
    `${__dirname}/../test/${jiraIssue.key}-historic-work-item.json`,
    JSON.stringify(historicWorkItem, null, 2),
    'utf-8'
  )
}
