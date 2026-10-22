import { type StagedItem, crossedAt } from './cycleTime'

/** Something that may have a parent, such as a Linear issue with sub-issues */
export type Node = {
  id: string
  parentId: string | null
}

export type Hierarchy<T extends Node> = {
  /** Items with no parent among the items. Their parent may be elsewhere, such as in another team. */
  topLevel: T[]
  /** Items with no children among the items. An item with neither parent nor children is both. */
  leaves: T[]
  childrenOf(item: T): T[]
  /** Children, their children and so on */
  descendantsOf(item: T): T[]
  /** The leaves under an item, or the item itself if it is a leaf */
  leavesOf(item: T): T[]
  /** The item's top-level ancestor, or the item itself if it is top-level */
  topLevelOf(item: T): T
  parentOf(item: T): T | undefined
}

/**
 * Arranges items into a tree by their parent ids. A parent id that doesn't match an item
 * is treated as no parent, so items whose parents are left out (canceled, or in another team)
 * become top-level items.
 */
export function makeHierarchy<T extends Node>(items: readonly T[]): Hierarchy<T> {
  const byId = new Map(items.map((item) => [item.id, item]))
  const children = new Map<string, T[]>()
  for (const item of items) {
    if (item.parentId !== null && byId.has(item.parentId)) {
      const siblings = children.get(item.parentId) ?? []
      siblings.push(item)
      children.set(item.parentId, siblings)
    }
  }

  const parentOf = (item: T) => (item.parentId === null ? undefined : byId.get(item.parentId))
  const childrenOf = (item: T) => children.get(item.id) ?? []
  const descendantsOf = (item: T): T[] => {
    const result: T[] = []
    // Guards against cycles, which Linear doesn't allow but bad data might have
    const seen = new Set([item.id])
    const queue = [...childrenOf(item)]
    while (queue.length > 0) {
      const next = queue.shift() as T
      if (seen.has(next.id)) continue
      seen.add(next.id)
      result.push(next)
      queue.push(...childrenOf(next))
    }
    return result
  }

  return {
    topLevel: items.filter((item) => parentOf(item) === undefined),
    leaves: items.filter((item) => childrenOf(item).length === 0),
    childrenOf,
    descendantsOf,
    leavesOf: (item) => {
      const descendants = descendantsOf(item)
      return descendants.length === 0 ? [item] : descendants.filter((d) => childrenOf(d).length === 0)
    },
    topLevelOf: (item) => {
      const seen = new Set<string>()
      let current = item
      for (let parent = parentOf(current); parent && !seen.has(parent.id); parent = parentOf(current)) {
        seen.add(current.id)
        current = parent
      }
      return current
    },
    parentOf,
  }
}

/**
 * The stage timestamps of a parent, rolled up from itself and the work under it.
 *
 * Up to and including `startStage`, it reached a stage when the first of the parent or any
 * descendant crossed it: the parent started when any of its work started. After that, it
 * reached a stage when all of its leaves had crossed it, so it is finished when the last
 * leaf finishes. The parent's own state doesn't decide that, so moving a parent to Done
 * early doesn't hide open work, and leaving it open after its work is done doesn't
 * make it look active.
 */
export function rollUpStages(
  parent: StagedItem,
  descendants: readonly StagedItem[],
  leaves: readonly StagedItem[],
  stages: readonly string[],
  startStage: string
): Record<string, Date> {
  const startIndex = stages.indexOf(startStage)
  const everyone = [parent, ...descendants]
  const result: Record<string, Date> = {}

  stages.forEach((stage, index) => {
    // Like work items, a parent skips the stages none of its work was ever in
    const entered = (item: StagedItem) => item[stage] instanceof Date
    if (index <= startIndex) {
      const earliest = earliestDate(everyone.map((item) => (entered(item) ? (item[stage] as Date) : undefined)))
      if (earliest) result[stage] = earliest
    } else if (leaves.some(entered)) {
      const crossings = leaves.map((item) => crossedAt(item, stages, index))
      if (crossings.every((date) => date !== undefined)) {
        result[stage] = latestDate(crossings) as Date
      }
    }
  })

  // Different pieces of work enter the early stages, so keep the timestamps in workflow order
  let next: Date | undefined
  for (const stage of [...stages].reverse()) {
    const date = result[stage]
    if (!date) continue
    if (next && date.getTime() > next.getTime()) result[stage] = next
    next = result[stage]
  }
  return result
}

function earliestDate(dates: readonly (Date | undefined)[]): Date | undefined {
  let result: Date | undefined
  for (const date of dates) {
    if (date && (!result || date.getTime() < result.getTime())) result = date
  }
  return result
}

function latestDate(dates: readonly (Date | undefined)[]): Date | undefined {
  let result: Date | undefined
  for (const date of dates) {
    if (date && (!result || date.getTime() > result.getTime())) result = date
  }
  return result
}
