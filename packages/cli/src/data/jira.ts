import { makeMapFromString, orderedMapValues } from '@oselvar/core'
import { JiraClient, createJiraWorkItemStream } from '@oselvar/jira'
import type { Command } from 'commander'
import { outputCsv } from '../utils.js'

export function registerJiraCommand(parent: Command): void {
  parent
    .command('jira')
    .description('Fetch work item data from Jira')
    .option('--email <email>', 'Jira email address')
    .option('--token <token>', 'Jira API token')
    .option('--url <url>', 'URL to the Jira instance')
    .option('--key <key>', 'Jira project key')
    .option('--stages <stages>', 'comma-separated stages', '')
    .option('--pages <pages>', 'how many pages of work items to load')
    .action(async (options) => {
      const stageMap = makeMapFromString(options.stages)
      const stages = orderedMapValues(stageMap)

      const client = new JiraClient(options.key, new URL(options.url), options.email, options.token)

      const source = createJiraWorkItemStream(client, stageMap)

      await outputCsv(source, stages)
    })
}
