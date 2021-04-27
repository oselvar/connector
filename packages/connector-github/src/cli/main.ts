import { makeCsvStream, makeMapFromString, orderedMapValues } from '@oselvar/connector-core'
import { Command } from 'commander'
import { pipeline } from 'stream'

import packageJson from '../../package.json'
import GitHubWorkItemStream, { QueryParams } from '../GitHubWorkItemStream'

const program = new Command()
program.version(packageJson.version)
program.option(
  '--auth <auth>',
  'GitHub authentication token. Can also be pisked up from $GITHUB_TOKEN',
  process.env.GITHUB_TOKEN
)
program.option('--repo <repo>', 'GitHub repo (owner/name)', process.env.GITHUB_REPOSITORY)
program.option('--type <type>', 'either "issues" or "pullRequests"', 'pullRequests')
program.option('--stages <stages>', 'comma-separated stages (optional)', 'open,labeled,commented,closed,labels')
program.option('--direction <direction>', 'either "forward" or "backward"', 'forward')
program.option('--pages <pages>', 'how many pages of work items to load')
program.option('--pagesize <pagesize>', 'number of issues/pull requests per page', '100')
program.parse(process.argv)

const [owner, name] = program.opts().repo.split('/')
const stageMap = makeMapFromString(program.opts().stages)
const pageSize = +program.opts().pagesize
const queryParams: QueryParams = {
  owner,
  name,
  ...(program.opts().direction == 'forward' ? { first: pageSize } : { last: pageSize }),
}

pipeline(
  new GitHubWorkItemStream(
    program.opts().type,
    program.opts().auth,
    program.opts().pages ? +program.opts().pages : undefined,
    stageMap,
    queryParams
  ),
  makeCsvStream(orderedMapValues(stageMap)),
  process.stdout,
  (err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
  }
)
