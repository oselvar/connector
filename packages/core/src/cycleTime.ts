export type CycleTimeItem = {
  id: string
  name?: string
  startDate: Date
  completionDate: Date
  cycleTimeDays: number
}

export type StagedItem = {
  id: string
  name?: string
  [stage: string]: unknown
}

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Calculates the cycle time between two stages for each item.
 *
 * `stages` is the workflow order. An item crosses a stage when it first reaches that stage
 * or any later one, so items that skip a stage (Backlog -> In Progress, skipping Todo) still
 * count, from the moment they landed past it.
 *
 * Items are left out unless:
 * - They crossed both the from and to stages
 * - They crossed the to stage after the from stage
 * - They haven't "regressed" (no stage before toStage has a later timestamp than the crossing)
 */
export function calculateCycleTimes(
  items: readonly StagedItem[],
  stages: readonly string[],
  fromStage: string,
  toStage: string
): CycleTimeItem[] {
  const fromStageIndex = stages.indexOf(fromStage)
  const toStageIndex = stages.indexOf(toStage)

  const result: CycleTimeItem[] = []
  for (const item of items) {
    const fromDate = crossedAt(item, stages, fromStageIndex)
    const toDate = crossedAt(item, stages, toStageIndex)

    if (!fromDate || !toDate) continue
    if (toDate.getTime() <= fromDate.getTime()) continue
    if (hasRegressed(item, stages, toStageIndex, toDate)) continue

    result.push({
      id: item.id,
      ...(item.name === undefined ? {} : { name: item.name }),
      startDate: fromDate,
      completionDate: toDate,
      cycleTimeDays: (toDate.getTime() - fromDate.getTime()) / MILLISECONDS_PER_DAY,
    })
  }
  return result
}

/**
 * When the item first reached the stage at stageIndex or any later stage.
 */
export function crossedAt(item: StagedItem, stages: readonly string[], stageIndex: number): Date | undefined {
  if (stageIndex === -1) return undefined
  let earliest: Date | undefined
  for (const stage of stages.slice(stageIndex)) {
    const date = item[stage]
    if (date instanceof Date && (!earliest || date.getTime() < earliest.getTime())) {
      earliest = date
    }
  }
  return earliest
}

/**
 * An item has regressed if any stage before toStage has a timestamp later than toStage,
 * meaning it moved forward to toStage and then back again, so it isn't really done.
 */
function hasRegressed(item: StagedItem, stages: readonly string[], toStageIndex: number, toDate: Date): boolean {
  for (let i = 0; i < toStageIndex; i++) {
    const earlierDate = item[stages[i]]
    if (earlierDate instanceof Date && earlierDate.getTime() > toDate.getTime()) {
      return true
    }
  }
  return false
}

/**
 * The p-th percentile (0-100) of the values, using the nearest-rank method.
 * Returns undefined for an empty list.
 */
export function percentile(values: readonly number[], p: number): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.ceil((p / 100) * sorted.length)
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1]
}

/**
 * The p-th percentile of the values in a rolling window, one point per day from the first day
 * a full window is available. Days with fewer than minCount values in their window are left out.
 */
export function rollingPercentile(
  values: readonly { date: Date; value: number }[],
  p: number,
  windowDays: number,
  minCount: number
): { date: Date; value: number }[] {
  if (values.length === 0) return []
  const times = values.map((v) => v.date.getTime())
  const first = Math.floor(Math.min(...times) / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY
  const last = Math.max(...times)
  const window = windowDays * MILLISECONDS_PER_DAY

  const result: { date: Date; value: number }[] = []
  for (let end = first + window; end <= last + MILLISECONDS_PER_DAY; end += MILLISECONDS_PER_DAY) {
    const inWindow = values.filter((v) => v.date.getTime() < end && v.date.getTime() >= end - window)
    if (inWindow.length < minCount) continue
    result.push({
      date: new Date(end),
      value: percentile(
        inWindow.map((v) => v.value),
        p
      ) as number,
    })
  }
  return result
}
