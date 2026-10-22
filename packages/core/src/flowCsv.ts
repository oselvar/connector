import { csvFormatRows } from 'd3-dsv'

/** A row of flow CSV: a work item's identity, when it entered each stage, and anything else known about it */
export type FlowCsvRow = {
  id: string
  link?: string
  name?: string
  stages: Partial<Record<string, Date | null | undefined>>
  /** Extra columns, such as a work item's type or parent, which tools use to filter */
  attributes?: Partial<Record<string, string>>
}

/**
 * Formats work items as CSV in the layout Actionable Agile and Nave import: ID, Link and
 * Name, then a column per stage with the date the item entered it, in workflow order,
 * then any extra columns.
 */
export function formatFlowCsv(
  rows: readonly FlowCsvRow[],
  stages: readonly string[],
  attributes: readonly string[] = []
): string {
  return csvFormatRows([
    ['ID', 'Link', 'Name', ...stages, ...attributes],
    ...rows.map((row) => [
      row.id,
      row.link ?? '',
      row.name ?? '',
      ...stages.map((stage) => row.stages[stage]?.toISOString() ?? ''),
      ...attributes.map((attribute) => row.attributes?.[attribute] ?? ''),
    ]),
  ])
}
