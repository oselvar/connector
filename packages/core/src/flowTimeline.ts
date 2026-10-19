import { MILLISECONDS_PER_DAY, type StagedItem, crossedAt } from './cycleTime'

/**
 * When each item crossed each stage from fromStage to toStage (reached it or a later one),
 * in milliseconds, ready for asking what the flow looked like at any moment.
 */
export type FlowTimeline = {
  /** The stages from fromStage to toStage, in workflow order */
  stages: readonly string[]
  items: readonly TimelineItem[]
}

export type TimelineItem = {
  item: StagedItem
  /** Crossing time per stage in `stages`, undefined if not crossed */
  crossed: readonly (number | undefined)[]
}

export function makeFlowTimeline(
  items: readonly StagedItem[],
  stages: readonly string[],
  fromStage: string,
  toStage: string
): FlowTimeline {
  const fromIndex = stages.indexOf(fromStage)
  const toIndex = stages.indexOf(toStage)
  return {
    stages: stages.slice(fromIndex, toIndex + 1),
    items: items.map((item) => ({
      item,
      crossed: stages.slice(fromIndex, toIndex + 1).map((_, i) => crossedAt(item, stages, fromIndex + i)?.getTime()),
    })),
  }
}

const before = (crossed: number | undefined, time: number) => crossed !== undefined && crossed < time

/** Items in progress at `time` (started, not finished), with their age */
export function inProgressAt(
  timeline: FlowTimeline,
  time: number
): { item: StagedItem; stage: string; ageDays: number }[] {
  const last = timeline.stages.length - 1
  return timeline.items
    .filter(({ crossed }) => before(crossed[0], time) && !before(crossed[last], time))
    .map(({ item, crossed }) => {
      let stage = 0
      while (stage + 1 < last && before(crossed[stage + 1], time)) stage++
      return {
        item,
        stage: timeline.stages[stage],
        ageDays: (time - (crossed[0] as number)) / MILLISECONDS_PER_DAY,
      }
    })
}

/** Items that finished in [from, to), with their cycle time */
export function finishedBetween(
  timeline: FlowTimeline,
  from: number,
  to: number
): { item: StagedItem; finished: number; cycleTimeDays: number }[] {
  const last = timeline.stages.length - 1
  return timeline.items
    .filter(({ crossed }) => {
      const finished = crossed[last]
      const started = crossed[0]
      return finished !== undefined && started !== undefined && finished >= from && finished < to && finished > started
    })
    .map(({ item, crossed }) => ({
      item,
      finished: crossed[last] as number,
      cycleTimeDays: ((crossed[last] as number) - (crossed[0] as number)) / MILLISECONDS_PER_DAY,
    }))
}

/** How many items were in `stage` at `time` */
export function inStageAt(timeline: FlowTimeline, stage: string, time: number): number {
  const s = timeline.stages.indexOf(stage)
  return timeline.items.filter(({ crossed }) => before(crossed[s], time) && !before(crossed[s + 1], time)).length
}

/** How long items spent in `stage`, for those that left it in [from, to) */
export function timesInStage(timeline: FlowTimeline, stage: string, from: number, to: number): number[] {
  const s = timeline.stages.indexOf(stage)
  return timeline.items
    .filter(({ crossed }) => {
      const left = crossed[s + 1]
      return crossed[s] !== undefined && left !== undefined && left >= from && left < to
    })
    .map(({ crossed }) => ((crossed[s + 1] as number) - (crossed[s] as number)) / MILLISECONDS_PER_DAY)
}

/** Number of items finished per day, for `days` days from `start` */
export function dailyThroughput(timeline: FlowTimeline, start: number, days: number): number[] {
  const counts = new Array<number>(days).fill(0)
  for (const { finished } of finishedBetween(timeline, start, start + days * MILLISECONDS_PER_DAY)) {
    counts[Math.floor((finished - start) / MILLISECONDS_PER_DAY)]++
  }
  return counts
}

/** Work in progress at the end of each day, for `days` days from `start` */
export function dailyWorkInProgress(
  timeline: FlowTimeline,
  start: number,
  days: number
): { count: number; totalAgeDays: number; averageAgeDays: number }[] {
  return Array.from({ length: days }, (_, day) => {
    const ages = inProgressAt(timeline, start + (day + 1) * MILLISECONDS_PER_DAY).map((wip) => wip.ageDays)
    const totalAgeDays = ages.reduce((sum, age) => sum + age, 0)
    return { count: ages.length, totalAgeDays, averageAgeDays: ages.length ? totalAgeDays / ages.length : 0 }
  })
}
