import { HistoricWorkItem, WorkItemSnapshot } from '@oselvar/connector-core'

import { JiraIssue, Status } from './types'

export default function makeHistoricWorkItem(jiraIssue: JiraIssue): HistoricWorkItem<string> {
  const snapshots: WorkItemSnapshot<string>[] = []

  const status = jiraIssue.fields.status
  const stage = getStatusName(status)
  snapshots.push({ timestamp: new Date(jiraIssue.fields.created), stage })

  for (const history of jiraIssue.changelog.histories) {
    for (const historyItem of history.items) {
      if (historyItem.field === 'status') {
        const status: Status = {
          id: historyItem.to,
          name: historyItem.toString,
        }
        const stage = getStatusName(status)
        snapshots.push({ timestamp: new Date(history.created), stage })
      }
    }
  }

  const url = new URL(jiraIssue.self)
  return {
    id: jiraIssue.id,
    name: new URL(`/browse/${jiraIssue.key}`, url).toString(),
    snapshots: snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
  }
}

function getStatusName(status: Status): string {
  return `${status.id}-${status.name}`
}
