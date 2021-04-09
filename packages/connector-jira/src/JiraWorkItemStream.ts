import { HistoricWorkItem, toWorkItem } from '@oselvar/connector-core'
import { writeFile } from 'fs/promises'
import { Readable } from 'stream'

import JiraClient from './JiraClient'
import makeHistoricWorkItem from './makeHistoricWorkItem'
import { JiraIssue } from './types'

/**
 * Outputs {@link WorkItem} objects.
 */
export default class JiraWorkItemStream extends Readable {
  private issueCount = 0
  private startAt = 0
  private requestActive = false

  constructor(private readonly jiraClient: JiraClient, private readonly stageMap: Map<string, string>) {
    super({ objectMode: true })
  }

  _read() {
    if (this.requestActive) {
      return
    }
    this.requestActive = true
    this.fetchHistoricWorkItems()
      .then(() => (this.requestActive = false))
      .catch((err) => this.emit('error', err))
  }

  private async fetchHistoricWorkItems() {
    const jiraIssuesPage = await this.jiraClient.fethJiraIssuesPage(this.startAt)
    for (const jiraIssue of jiraIssuesPage.issues) {
      const historicWorkItem = makeHistoricWorkItem(jiraIssue)
      if (process.env.JIRA_DEBUG) {
        await this.save(jiraIssue, historicWorkItem)
      }
      const workItem = toWorkItem(historicWorkItem, this.stageMap)
      if (workItem) {
        this.push(workItem)
      }
      this.issueCount++
    }
    this.startAt = this.issueCount
    if (this.issueCount >= jiraIssuesPage.total) {
      this.push(null)
    }
  }

  private async save(jiraIssue: JiraIssue, historicWorkItem: HistoricWorkItem<string>) {
    await writeFile(`${__dirname}/../test/${jiraIssue.key}.json`, JSON.stringify(jiraIssue, null, 2), 'utf-8')
    await writeFile(
      `${__dirname}/../test/${jiraIssue.key}-historic-work-item.json`,
      JSON.stringify(historicWorkItem, null, 2),
      'utf-8'
    )
  }
}
