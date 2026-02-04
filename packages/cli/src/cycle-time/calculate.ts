import { type ParsedWorkItem, parseCsv } from '@oselvar/core'

export type CycleTimeItem = {
  id: string
  completionDate: Date
  cycleTimeDays: number
}

export type CycleTimeOptions = {
  fromStage: string
  toStage: string
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Calculates cycle times from CSV data.
 *
 * Filters to items where:
 * - Both from and to stages have valid timestamps
 * - The to timestamp is after the from timestamp
 * - The item hasn't "regressed" (no stage after toStage has a later timestamp than toStage)
 */
export function calculateCycleTimes(csvString: string, options: CycleTimeOptions): CycleTimeItem[] {
  const { fromStage, toStage } = options
  const items = parseCsv(csvString)

  // Get all stage columns from the first item (excluding id and name)
  const stageColumns = getStageColumns(items)

  // Find the index of toStage in the stage order
  const toStageIndex = stageColumns.indexOf(toStage)

  return items
    .map((item) => {
      const fromDate = item[fromStage]
      const toDate = item[toStage]

      // Both stages must have valid dates
      if (!(fromDate instanceof Date) || !(toDate instanceof Date)) {
        return null
      }

      // to must be after from
      if (toDate.getTime() <= fromDate.getTime()) {
        return null
      }

      // Check for regression: any stage after toStage with a later timestamp
      if (hasRegressed(item, stageColumns, toStageIndex, toDate)) {
        return null
      }

      const cycleTimeDays = (toDate.getTime() - fromDate.getTime()) / MILLISECONDS_PER_DAY

      return {
        id: item.id,
        completionDate: toDate,
        cycleTimeDays,
      }
    })
    .filter((item): item is CycleTimeItem => item !== null)
}

/**
 * Extracts stage column names from parsed items (all columns except id and name).
 * Preserves the order from the CSV.
 */
function getStageColumns(items: ParsedWorkItem[]): string[] {
  if (items.length === 0) return []

  const firstItem = items[0]
  return Object.keys(firstItem).filter((key) => key !== 'id' && key !== 'name')
}

/**
 * Checks if an item has regressed: any earlier stage (before toStage in the workflow)
 * has a timestamp later than the toStage timestamp.
 *
 * This detects items that moved forward to toStage but then went back to an earlier stage,
 * indicating they are not truly complete.
 */
function hasRegressed(item: ParsedWorkItem, stageColumns: string[], toStageIndex: number, toDate: Date): boolean {
  if (toStageIndex === -1) {
    return false
  }

  // Check all stages before toStage (earlier in the workflow)
  // If any of them have a timestamp after toStage, the item regressed
  for (let i = 0; i < toStageIndex; i++) {
    const earlierStage = stageColumns[i]
    const earlierDate = item[earlierStage]

    if (earlierDate instanceof Date && earlierDate.getTime() > toDate.getTime()) {
      return true
    }
  }

  return false
}
