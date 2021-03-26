import { HistoricWorkItem, StageTimestamps, WorkItem } from './types'

export function toWorkItem<MappedStage extends string, OriginalStage extends string>(
  historicWorkItem: HistoricWorkItem<OriginalStage>,
  stageMap: Map<OriginalStage, MappedStage>
): WorkItem<MappedStage> | null {
  const { id, name } = historicWorkItem

  const timeSortedSnapshots = historicWorkItem.snapshots
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const stageTimestamps: StageTimestamps<MappedStage> = {}
  for (const { timestamp, stage } of timeSortedSnapshots) {
    // @ts-ignore
    const mappedStage = stageMap.size === 0 ? (stage as MappedStage) : stageMap.get(stage)
    if (mappedStage === undefined) {
      // Ignore this stage - it's a stage we're not interested in for this workflow
      continue
    }
    if (!stageTimestamps[mappedStage]) {
      stageTimestamps[mappedStage] = timestamp
    }
  }
  if (Object.keys(stageTimestamps).length === 0) return null
  return { ...{ id, name }, ...stageTimestamps }
}
