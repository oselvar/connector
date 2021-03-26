import { makeCsvStream, makeMapFromString, orderedMapValues } from '@oselvar/connector-core'
import { Command } from 'commander'
import { pipeline } from 'stream'

import packageJson from '../../package.json'
import GitHubWorkItemStream, { QueryParams } from '../GitHubWorkItemStream'

const program = new Command()
program.version(packageJson.version)
program.option('--auth <auth>', 'Auth token')
program.option('--repo <repo>', 'GitHub repo (owner/name)')
program.option('--type <type>', 'Either "issues" or "pullRequests"', 'issues')
program.option('--stages <stages>', 'Comma-separated stages (optional)', 'open,closed')
program.option('--direction <direction>', 'Either "forward" or "backward"', 'forward')
program.option('--pages <pages>', 'How many pages of work items to load')
program.option('--pagesize <pagesize>', 'Number of issues/pull requests per page', '100')
program.parse(process.argv)

const [owner, name] = program.opts().repo.split('/')
const stageMap = makeMapFromString(program.opts().stages)
const pagesize = +program.opts().pagesize
const queryParams: QueryParams = {
  owner,
  name,
  ...(program.opts().direction == 'forward' ? { first: pagesize } : { last: pagesize }),
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
