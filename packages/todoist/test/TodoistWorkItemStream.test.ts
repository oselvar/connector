import { makeMapFromString } from '@oselvar/core'
import { describe, expect, it } from 'vitest'
import { TodoistClient } from '../src/TodoistClient.js'
import { createTodoistWorkItemStream } from '../src/TodoistWorkItemStream.js'
import { getDefaultStages } from '../src/makeHistoricWorkItem.js'

const token = process.env.TODOIST_TOKEN
const projectId = process.env.TODOIST_PROJECT_ID

// Skip tests if no credentials available
const describeWithAuth = token && projectId ? describe : describe.skip

describeWithAuth('TodoistWorkItemStream', () => {
  // token and projectId are guaranteed to be defined when these tests run
  const client = new TodoistClient(projectId as string, token as string)

  // Helper to collect stream output
  async function collect<T>(stream: ReadableStream<T>): Promise<T[]> {
    const items: T[] = []
    for await (const item of stream) {
      items.push(item)
    }
    return items
  }

  it('streams tasks from a Todoist project', async () => {
    // First fetch sections to create default stages
    const sections = await client.fetchSections()
    const stages = getDefaultStages(sections)
    const stageMap = new Map(stages.map((s) => [s, s]))

    const stream = createTodoistWorkItemStream(client, stageMap, { maxPages: 1 })

    const items = await collect(stream)

    // We can't know exactly what tasks exist, but we can verify the structure
    expect(Array.isArray(items)).toBe(true)
    for (const item of items) {
      expect(item).toHaveProperty('id')
      expect(typeof item.id).toBe('string')
    }
  }, 30000)

  it('streams tasks with custom stage mapping', async () => {
    const stageMap = makeMapFromString('Backlog,In Progress:doing,Done')

    const stream = createTodoistWorkItemStream(client, stageMap, { maxPages: 1 })

    const items = await collect(stream)

    expect(Array.isArray(items)).toBe(true)
  }, 30000)
})
