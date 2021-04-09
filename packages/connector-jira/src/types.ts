export type JiraIssue = Readonly<{
  id: string
  self: string
  key: string
  changelog: {
    histories: readonly History[]
  }
  fields: Fields
}>

type Fields = Readonly<{
  status: Status
  created: string
}>

export type Status = Readonly<{
  id: string
  name: string
}>

type History = Readonly<{
  created: string
  items: readonly HistoryItem[]
}>

type HistoryItem = Readonly<{
  field: string
  from: string | null
  to: string
  toString: string
}>

export type JiraIssuesPage = Readonly<{
  startAt: number
  maxResults: number
  total: number
  issues: readonly JiraIssue[]
}>
