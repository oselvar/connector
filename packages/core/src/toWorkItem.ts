import type { HistoricWorkItem, StageTimestamps, WorkItem } from './types'

/**
 * Flattens a work item's history to one timestamp per stage: when it entered that stage.
 *
 * A move back to an earlier stage erases the later stages, as if the work item never got
 * there - it has to move forward again to count. A stage it re-enters keeps its first
 * timestamp. So the timestamps always increase in workflow order, and cumulative flow
 * can never go down.
 *
 * The workflow order is the stage map's order, or the order stages first appear in the
 * history when the map is empty. Stages not in a non-empty map are ignored.
 */
export function toWorkItem<MappedStage extends string, OriginalStage extends string>(
  historicWorkItem: HistoricWorkItem<OriginalStage>,
  stageMap: Map<OriginalStage, MappedStage>
): WorkItem<MappedStage> | null {
  const { id, name } = historicWorkItem

  const timeSortedSnapshots = historicWorkItem.snapshots
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const order: MappedStage[] = [...new Set(stageMap.values())]
  const entered = new Map<MappedStage, Date>()

  for (const { timestamp, stage } of timeSortedSnapshots) {
    const mappedStage = stageMap.size === 0 ? (stage as unknown as MappedStage) : stageMap.get(stage)
    if (mappedStage === undefined) continue
    if (!order.includes(mappedStage)) order.push(mappedStage)

    // Moving back erases every later stage
    const index = order.indexOf(mappedStage)
    for (const laterStage of order.slice(index + 1)) {
      entered.delete(laterStage)
    }
    if (!entered.has(mappedStage)) {
      entered.set(mappedStage, timestamp)
    }
  }

  if (entered.size === 0) return null
  const stageTimestamps: StageTimestamps<MappedStage> = {}
  for (const stage of order) {
    const timestamp = entered.get(stage)
    if (timestamp) stageTimestamps[stage] = timestamp
  }
  return { ...{ id, name }, ...stageTimestamps }
}
