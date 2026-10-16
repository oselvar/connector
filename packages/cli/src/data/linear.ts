import { makeMapFromString, orderedMapValues } from '@oselvar/core'
import { LinearClient, createLinearWorkItemStream, makeDefaultStageMap } from '@oselvar/linear'
import type { Command } from 'commander'
import { outputCsv } from '../utils.js'

export function registerLinearCommand(parent: Command): void {
  parent
    .command('linear')
    .description('Fetch work item data from Linear')
    .option('--token <token>', 'Linear API key (default: $LINEAR_API_KEY)', process.env.LINEAR_API_KEY)
    .option('--team <team>', 'Linear team key, e.g. ENG')
    .option('--stages <stages>', 'comma-separated workflow states (default: all non-canceled states)', '')
    .option('--pages <pages>', 'how many pages of issues to load')
    .action(async (options) => {
      if (!options.token) throw new Error('Missing --token or $LINEAR_API_KEY')
      if (!options.team) throw new Error('Missing --team')

      const client = new LinearClient(options.team, options.token)
      const states = await client.fetchWorkflowStates()

      const stageMap = options.stages ? makeMapFromString(options.stages) : makeDefaultStageMap(states)
      const stages = orderedMapValues(stageMap)

      const source = createLinearWorkItemStream(client, states, stageMap, options.pages ? +options.pages : undefined)

      await outputCsv(source, stages)
    })
}
