import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { Command } from 'commander'
import { makeCsvTransform, makeMapFromString, orderedMapValues } from '../../core'

import packageJson from '../../../package.json'
import JiraClient from '../JiraClient'
import { createJiraWorkItemStream } from '../JiraWorkItemStream'

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
const stages = orderedMapValues(stageMap)

// Create W3C streams
const source = createJiraWorkItemStream(
  new JiraClient(program.opts().key, new URL(program.opts().url), program.opts().email, program.opts().token),
  stageMap
)
const csvTransform = makeCsvTransform(stages)

// Pipe through transform
const csvStream = source.pipeThrough(csvTransform)

// Convert to Node.js stream for stdout
// biome-ignore lint/suspicious/noExplicitAny: Type mismatch between DOM and Node.js ReadableStream
const nodeReadable = Readable.fromWeb(csvStream as any)

pipeline(nodeReadable, process.stdout).catch((err) => {
  console.error(err)
  process.exit(1)
})
