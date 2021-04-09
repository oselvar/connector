import { makeCsvStream, makeMapFromString, orderedMapValues } from '@oselvar/connector-core'
import { Command } from 'commander'
import { pipeline } from 'stream'

import packageJson from '../../package.json'
import JiraClient from '../JiraClient'
import JiraWorkItemStream from '../JiraWorkItemStream'

const program = new Command()
program.version(packageJson.version)
program.option('--email <email>', 'JIRA email address')
program.option('--token <auth>', 'JIRA auth token')
program.option('--url <url>', 'URL to the JIRA instance')
program.option('--key <repo>', 'JIRA Project key')
program.option('--stages <stages>', 'Comma-separated stages', '')
program.option('--pages <pages>', 'How many pages of 100 work items to load')
program.parse(process.argv)

const stageMap = makeMapFromString(program.opts().stages)

pipeline(
  new JiraWorkItemStream(
    new JiraClient(program.opts().key, new URL(program.opts().url), program.opts().email, program.opts().token),
    stageMap
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
