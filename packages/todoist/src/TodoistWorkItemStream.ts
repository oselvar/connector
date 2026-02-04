import { type WorkItem, toWorkItem } from '@oselvar/core'

import type { TodoistClient } from './TodoistClient.js'
import { buildSectionMap, makeHistoricWorkItem } from './makeHistoricWorkItem.js'
import type { TodoistActivityEvent, TodoistSection, TodoistTask } from './types'

export type TodoistStreamOptions = {
  maxPages?: number
}

/**
 * Creates a ReadableStream that outputs WorkItem objects from Todoist.
 */
export function createTodoistWorkItemStream(
  client: TodoistClient,
  stageMap: Map<string, string>,
  options: TodoistStreamOptions = {}
): ReadableStream<WorkItem<string>> {
  let initialized = false
  let done = false
  const itemQueue: WorkItem<string>[] = []

  let sections: readonly TodoistSection[] = []
  let tasks: readonly TodoistTask[] = []
  let activities: readonly TodoistActivityEvent[] = []
  let sectionMap: Map<string, string> = new Map()
  let taskIndex = 0

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

      // Initialize on first pull - fetch all data
      if (!initialized) {
        sections = await client.fetchSections()
        tasks = await client.fetchTasks()
        activities = await fetchAllActivities(client, options.maxPages)
        sectionMap = buildSectionMap(sections)
        initialized = true
      }

      // Process tasks into queue
      while (taskIndex < tasks.length && itemQueue.length === 0) {
        const task = tasks[taskIndex]
        const historicWorkItem = makeHistoricWorkItem(task, activities, sectionMap)
        const workItem = toWorkItem(historicWorkItem, stageMap)
        if (workItem) {
          itemQueue.push(workItem)
        }
        taskIndex++
      }

      // Check if we're done
      if (taskIndex >= tasks.length) {
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

async function fetchAllActivities(client: TodoistClient, maxPages?: number): Promise<readonly TodoistActivityEvent[]> {
  const allActivities: TodoistActivityEvent[] = []
  let offset = 0
  const limit = 100
  let pageCount = 0

  while (true) {
    const page = await client.fetchActivityPage(offset, limit)
    allActivities.push(...page.events)
    pageCount++

    // Check if we should stop
    if (maxPages !== undefined && pageCount >= maxPages) {
      break
    }
    if (!page.has_more || page.events.length < limit) {
      break
    }

    offset += limit
  }

  return allActivities
}

export { createTodoistWorkItemStream as TodoistWorkItemStream }
