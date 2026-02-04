import { makeMapFromString, orderedMapValues } from '@oselvar/core'
import { type QueryParams, createGitHubWorkItemStream } from '@oselvar/github'
import type { Command } from 'commander'
import { outputCsv } from '../utils.js'

export function registerGithubCommand(parent: Command): void {
  parent
    .command('github')
    .description('Fetch work item data from GitHub')
    .option('--auth <auth>', 'GitHub authentication token (default: $GITHUB_TOKEN)', process.env.GITHUB_TOKEN)
    .option('--repo <repo>', 'GitHub repo (owner/name)', process.env.GITHUB_REPOSITORY)
    .option('--type <type>', 'either "issues" or "pullRequests"', 'pullRequests')
    .option('--stages <stages>', 'comma-separated stages', 'open,labeled,commented,closed')
    .option('--direction <direction>', 'either "forward" or "backward"', 'forward')
    .option('--pages <pages>', 'how many pages of work items to load')
    .option('--pagesize <pagesize>', 'number of issues/pull requests per page', '100')
    .action(async (options) => {
      const [owner, name] = options.repo.split('/')
      const stageMap = makeMapFromString(options.stages)
      const stages = orderedMapValues(stageMap)
      const pageSize = +options.pagesize

      const queryParams: QueryParams = {
        owner,
        name,
        ...(options.direction === 'forward' ? { first: pageSize } : { last: pageSize }),
      }

      const source = createGitHubWorkItemStream(
        options.type,
        options.auth,
        options.pages ? +options.pages : undefined,
        stageMap,
        queryParams
      )

      await outputCsv(source, stages)
    })
}
