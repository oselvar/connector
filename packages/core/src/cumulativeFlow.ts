import { MILLISECONDS_PER_DAY, type StagedItem, crossedAt } from './cycleTime'

export type CumulativeFlow = {
  /** Midnight UTC of the first day */
  start: Date
  /** One line per stage from fromStage to toStage, in workflow order */
  lines: { stage: string; counts: number[] }[]
}

/**
 * Cumulative flow from fromStage to toStage, one count per day: how many items had crossed
 * each stage (reached it or a later one) by the end of that day. The lines never go down,
 * and a line never rises above the line of an earlier stage.
 *
 * Days run from the first day an item crossed fromStage up to and including `end`.
 */
export function calculateCumulativeFlow(
  items: readonly StagedItem[],
  stages: readonly string[],
  fromStage: string,
  toStage: string,
  end: Date
): CumulativeFlow | undefined {
  const fromIndex = stages.indexOf(fromStage)
  const toIndex = stages.indexOf(toStage)
  const lineStages = stages.slice(fromIndex, toIndex + 1)

  const crossings = lineStages.map((_, i) =>
    items.map((item) => crossedAt(item, stages, fromIndex + i)).filter((date): date is Date => date !== undefined)
  )
  if (crossings[0].length === 0) return undefined

  const first = Math.min(...crossings[0].map((date) => date.getTime()))
  const start = Math.floor(first / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY
  const dayCount = Math.max(1, Math.floor((end.getTime() - start) / MILLISECONDS_PER_DAY) + 1)

  return {
    start: new Date(start),
    lines: lineStages.map((stage, i) => {
      const counts = new Array<number>(dayCount).fill(0)
      for (const date of crossings[i]) {
        const day = Math.floor((date.getTime() - start) / MILLISECONDS_PER_DAY)
        if (day < dayCount) counts[Math.max(day, 0)]++
      }
      for (let day = 1; day < dayCount; day++) counts[day] += counts[day - 1]
      return { stage, counts }
    }),
  }
}
