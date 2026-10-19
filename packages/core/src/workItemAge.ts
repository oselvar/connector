import { MILLISECONDS_PER_DAY, type StagedItem, crossedAt } from './cycleTime'

export type AgingItem = {
  id: string
  name?: string
  stage: string
  ageDays: number
}

/**
 * The age of every item that is in progress: it has crossed fromStage, and its current
 * stage is before toStage. Age is the time since it crossed fromStage.
 */
export function calculateWorkItemAges(
  items: readonly { workItem: StagedItem; currentStage: string }[],
  stages: readonly string[],
  fromStage: string,
  toStage: string,
  now: Date
): AgingItem[] {
  const fromIndex = stages.indexOf(fromStage)
  const toIndex = stages.indexOf(toStage)

  const result: AgingItem[] = []
  for (const { workItem, currentStage } of items) {
    const currentIndex = stages.indexOf(currentStage)
    if (currentIndex < fromIndex || currentIndex >= toIndex) continue
    const started = crossedAt(workItem, stages, fromIndex)
    if (!started) continue

    result.push({
      id: workItem.id,
      ...(workItem.name === undefined ? {} : { name: workItem.name }),
      stage: currentStage,
      ageDays: Math.max(0, now.getTime() - started.getTime()) / MILLISECONDS_PER_DAY,
    })
  }
  return result
}

/**
 * For each stage from fromStage up to (not including) toStage: how old items were when they
 * left that stage, measured from when they crossed fromStage. Compare an in-progress item's
 * age with these to see whether it is slower than past items were at the same stage.
 */
export function calculateStageExitAges(
  items: readonly StagedItem[],
  stages: readonly string[],
  fromStage: string,
  toStage: string
): Map<string, number[]> {
  const fromIndex = stages.indexOf(fromStage)
  const toIndex = stages.indexOf(toStage)

  const exitAges = new Map<string, number[]>()
  for (let i = fromIndex; i < toIndex; i++) exitAges.set(stages[i], [])

  for (const item of items) {
    const started = crossedAt(item, stages, fromIndex)
    if (!started) continue
    for (let i = fromIndex; i < toIndex; i++) {
      const left = crossedAt(item, stages, i + 1)
      if (left && left.getTime() >= started.getTime()) {
        exitAges.get(stages[i])?.push((left.getTime() - started.getTime()) / MILLISECONDS_PER_DAY)
      }
    }
  }
  return exitAges
}
