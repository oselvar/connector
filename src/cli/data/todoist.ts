import type { Command } from 'commander'
import { makeMapFromString, orderedMapValues } from '../../core'
import TodoistClient from '../../todoist/TodoistClient'
import { createTodoistWorkItemStream } from '../../todoist/TodoistWorkItemStream'
import { getDefaultStages } from '../../todoist/makeHistoricWorkItem'
import { outputCsv } from '../utils'

export function registerTodoistCommand(parent: Command): void {
  parent
    .command('todoist')
    .description('Fetch work item data from Todoist')
    .option('--token <token>', 'Todoist API token', process.env.TODOIST_TOKEN)
    .option('--project-id <projectId>', 'Todoist project ID')
    .option('--stages <stages>', 'comma-separated stages (SectionName or SectionName:stageName)', '')
    .option('--pages <pages>', 'how many pages of activity to load')
    .action(async (options) => {
      if (!options.token) {
        console.error('Error: Todoist API token required. Use --token or set TODOIST_TOKEN environment variable.')
        process.exit(1)
      }
      if (!options.projectId) {
        console.error('Error: Project ID required. Use --project-id to specify the Todoist project.')
        process.exit(1)
      }

      const client = new TodoistClient(options.projectId, options.token)

      let stageMap: Map<string, string>
      let stages: readonly string[]

      if (options.stages) {
        stageMap = makeMapFromString(options.stages)
        stages = orderedMapValues(stageMap)
      } else {
        // Auto-discover stages from sections
        const sections = await client.fetchSections()
        stages = getDefaultStages(sections)
        // Create a pass-through map where each stage maps to itself
        stageMap = new Map(stages.map((s) => [s, s]))
      }

      const maxPages = options.pages ? Number.parseInt(options.pages, 10) : undefined
      const source = createTodoistWorkItemStream(client, stageMap, { maxPages })

      await outputCsv(source, stages)
    })
}
