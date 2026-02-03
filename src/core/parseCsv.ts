import { csvParse } from 'd3-dsv'

export type ParsedWorkItem = {
  id: string
  name?: string
  [stage: string]: Date | string | undefined
}

/**
 * Parses CSV string to an array of work items with Date conversion for stage columns.
 * The 'id' and 'name' columns are kept as strings, all other columns are treated as
 * stage timestamps and converted to Date objects if they contain valid ISO date strings.
 */
export function parseCsv(csvString: string): ParsedWorkItem[] {
  const rows = csvParse(csvString)
  return rows.map((row) => {
    const item: ParsedWorkItem = { id: row.id ?? '' }

    for (const [key, value] of Object.entries(row)) {
      if (key === 'id') {
        item.id = value ?? ''
      } else if (key === 'name') {
        item.name = value
      } else if (value) {
        // Treat all other columns as potential stage timestamps
        const date = new Date(value)
        if (!Number.isNaN(date.getTime())) {
          item[key] = date
        }
      }
    }

    return item
  })
}
