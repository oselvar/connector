import { makeMapFromString } from '@oselvar/core'
import { describe, expect, it } from 'vitest'
import { createGitHubWorkItemStream } from '../src/index.js'

const auth = process.env.GITHUB_TOKEN

// Skip tests if no token available
const describeWithAuth = auth ? describe : describe.skip

describeWithAuth('GitHubWorkItemStream', () => {
  // auth is guaranteed to be defined when these tests run
  const token = auth as string
  const stageMap = makeMapFromString('open,labeled,commented,closed')

  // Helper to collect stream output
  async function collect<T>(stream: ReadableStream<T>): Promise<T[]> {
    const items: T[] = []
    for await (const item of stream) {
      items.push(item)
    }
    return items
  }

  it('streams pull requests from oselvar/connector', async () => {
    const stream = createGitHubWorkItemStream(
      'pullRequests',
      token,
      1, // maxPages
      stageMap,
      { owner: 'oselvar', name: 'connector', last: 5 }
    )

    const items = await collect(stream)

    expect(items).toMatchSnapshot()
  }, 30000)

  it('streams issues from oselvar/connector', async () => {
    const stream = createGitHubWorkItemStream('issues', token, 1, stageMap, {
      owner: 'oselvar',
      name: 'connector',
      last: 5,
    })

    const items = await collect(stream)

    expect(items).toMatchSnapshot()
  }, 30000)
})
