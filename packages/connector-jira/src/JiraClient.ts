import fetch, { Headers } from 'node-fetch'

import { JiraIssuesPage } from './types'

export default class JiraClient {
  constructor(
    private readonly projectKey: string,
    private readonly baseUrl: URL,
    private readonly email: string,
    private readonly token: string
  ) {}

  async fethJiraIssuesPage(startAt: number): Promise<JiraIssuesPage> {
    const url = new URL(`/rest/api/2/search`, this.baseUrl)
    url.searchParams.set('jql', `project=${this.projectKey}`)
    url.searchParams.set('expand', `changelog`)
    url.searchParams.set('startAt', startAt.toString())
    const res = await this.request(url.toString())
    return (await res.json()) as JiraIssuesPage
  }

  private async request(url: string) {
    const headers = new Headers()
    headers.append('Authorization', `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`)

    const res = await fetch(url, { headers })
    if (!res.ok) {
      throw new Error(`Error from GET ${url} - status ${res.status}`)
    }
    return res
  }
}
