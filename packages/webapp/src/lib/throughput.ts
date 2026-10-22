import { MILLISECONDS_PER_DAY as DAY, type FlowTimeline, dailyThroughput } from '@oselvar/core'

/** How far back forecasts look for past throughput */
export const HISTORY_DAYS = 90

/**
 * Past daily throughput to forecast from: the last 90 days up to today, or since the
 * first item started if that is more recent.
 */
export function throughputHistory(timeline: FlowTimeline, today: number): number[] {
  const starts = timeline.items.map(({ crossed }) => crossed[0]).filter((t): t is number => t !== undefined)
  if (starts.length === 0) return []
  const first = Math.floor(Math.min(...starts) / DAY) * DAY
  const start = Math.max(today - (HISTORY_DAYS - 1) * DAY, first)
  return dailyThroughput(timeline, start, Math.round((today - start) / DAY) + 1)
}
