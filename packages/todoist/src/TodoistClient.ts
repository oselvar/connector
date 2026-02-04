import type { TodoistActivityPage, TodoistSection, TodoistTask } from './types'

export class TodoistClient {
  private readonly baseUrl = 'https://api.todoist.com'

  constructor(
    private readonly projectId: string,
    private readonly token: string
  ) {}

  async fetchSections(): Promise<readonly TodoistSection[]> {
    const url = new URL('/rest/v2/sections', this.baseUrl)
    url.searchParams.set('project_id', this.projectId)
    const res = await this.request(url.toString())
    return (await res.json()) as TodoistSection[]
  }

  async fetchTasks(): Promise<readonly TodoistTask[]> {
    const url = new URL('/rest/v2/tasks', this.baseUrl)
    url.searchParams.set('project_id', this.projectId)
    const res = await this.request(url.toString())
    return (await res.json()) as TodoistTask[]
  }

  async fetchActivityPage(offset = 0, limit = 100): Promise<TodoistActivityPage> {
    const url = new URL('/sync/v9/activity/get', this.baseUrl)
    url.searchParams.set('object_type', 'item')
    url.searchParams.set('parent_project_id', this.projectId)
    url.searchParams.set('offset', offset.toString())
    url.searchParams.set('limit', limit.toString())
    const res = await this.request(url.toString())
    return (await res.json()) as TodoistActivityPage
  }

  private async request(url: string) {
    const headers = new Headers({
      Authorization: `Bearer ${this.token}`,
    })

    const res = await fetch(url, { headers })
    if (res.status === 401) {
      throw new Error('Invalid Todoist API token. Check your TODOIST_TOKEN.')
    }
    if (res.status === 404) {
      throw new Error(`Todoist project not found: ${this.projectId}`)
    }
    if (res.status === 429) {
      throw new Error('Todoist API rate limit exceeded. Please wait and try again.')
    }
    if (!res.ok) {
      throw new Error(`Error from GET ${url} - status ${res.status}`)
    }
    return res
  }
}
