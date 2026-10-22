import { csvParse } from 'd3-dsv'

export type ParsedWorkItem = {
  id: string
  name?: string
  [stage: string]: Date | string | undefined
}

/** Columns that identify a work item rather than hold a stage's date, matched ignoring case */
const IDENTITY_COLUMNS = ['id', 'link', 'name']

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

/**
 * Parses flow CSV to work items. Both Oselvar's own layout (id, name, stages) and the one
 * Actionable Agile and Nave use (ID, Link, Name, stages, extra columns) work.
 *
 * A column holds a stage if all of its values are dates (or empty). Its values become Dates.
 * Other columns, such as a type or parent, are kept as strings.
 */
export function parseCsv(csvString: string): ParsedWorkItem[] {
  const rows = csvParse(csvString)
  const stages = new Set(stageColumns(rows.columns, rows))

  return rows.map((row) => {
    const item: ParsedWorkItem = { id: '' }
    for (const [key, value] of Object.entries(row)) {
      const identity = key.toLowerCase()
      if (identity === 'id') {
        item.id = value ?? ''
      } else if (identity === 'name') {
        item.name = value
      } else if (identity === 'link') {
        // Oselvar's own layout uses the name for the link
        if (item.name === undefined && value) item.name = value
      } else if (stages.has(key)) {
        if (value) item[key] = new Date(value)
      } else if (value) {
        item[key] = value
      }
    }
    return item
  })
}

/**
 * The stage columns of a CSV string, in header order: the columns whose values are all dates.
 */
export function parseCsvStages(csvString: string): string[] {
  const rows = csvParse(csvString)
  return stageColumns(rows.columns, rows)
}

/**
 * Stage columns come one after another, after the identity columns. They end at the first
 * column with something other than dates, and trailing columns with no dates at all are
 * taken to be empty extra columns rather than stages.
 */
function stageColumns(columns: readonly string[], rows: readonly Record<string, string | undefined>[]): string[] {
  const isDate = (value: string | undefined) =>
    value !== undefined && ISO_DATE.test(value) && !Number.isNaN(new Date(value).getTime())

  const stages: string[] = []
  for (const column of columns.filter((c) => !IDENTITY_COLUMNS.includes(c.toLowerCase()))) {
    if (!rows.every((row) => !row[column] || isDate(row[column]))) break
    stages.push(column)
  }
  while (stages.length > 0 && !rows.some((row) => isDate(row[stages[stages.length - 1]]))) {
    stages.pop()
  }
  return stages
}
