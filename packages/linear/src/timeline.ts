import { MILLISECONDS_PER_DAY as DAY, type Hierarchy, crossedAt, percentile } from '@oselvar/core'

import type { LinearWorkItem } from './LinearWorkItemStream'
import { type IssueNode, leavesThatCount, rolledUpWorkItem } from './rollUp'

export type LeafStatus = 'waiting' | 'active' | 'finished'

/** Where a piece of work is between the start and finish stages */
export type LeafProgress = {
  status: LeafStatus
  /** When it was added: created, usually under its parent */
  added: Date
  /** When it started, or when it finished if it skipped straight to that */
  started?: Date
  finished?: Date
}

export function leafProgress(
  issue: LinearWorkItem,
  stages: readonly string[],
  startIndex: number,
  finishIndex: number
): LeafProgress {
  const finished = crossedAt(issue.workItem, stages, finishIndex)
  const started = crossedAt(issue.workItem, stages, startIndex) ?? finished
  const status = finished ? 'finished' : started ? 'active' : 'waiting'
  return { status, added: issue.createdAt, started, finished }
}

/**
 * How long, in days, 85% of finished leaves took from start to finish. Active work older
 * than this is aging: it's taking longer than usual.
 */
export function agingLimit(
  leaves: readonly LinearWorkItem[],
  stages: readonly string[],
  startIndex: number,
  finishIndex: number
): number | undefined {
  const days = leaves.flatMap((leaf) => {
    const { started, finished } = leafProgress(leaf, stages, startIndex, finishIndex)
    return started && finished ? [(finished.getTime() - started.getTime()) / DAY] : []
  })
  return percentile(days, 85)
}

/**
 * Stuck: some work is taking longer than usual. Stalled: some work is done, but nothing is
 * active. Moving: work is active, within the usual time. Idle: nothing has started.
 */
export type ItemGroup = 'stuck' | 'stalled' | 'moving' | 'idle' | 'finished'

export const ITEM_GROUPS: readonly ItemGroup[] = ['stuck', 'stalled', 'moving', 'idle', 'finished']

export type ItemSummary = {
  node: IssueNode
  group: ItemGroup
  /** The leaves that count, see leavesThatCount */
  total: number
  finished: number
  active: number
  aging: number
  waiting: number
  /** Leaves added in the last 7 days */
  addedThisWeek: number
  start?: Date
  end?: Date
}

/** How a top-level item's work is doing */
export function summarizeItem(
  node: IssueNode,
  hierarchy: Hierarchy<IssueNode>,
  stages: readonly string[],
  startIndex: number,
  finishIndex: number,
  now: Date,
  agingLimitDays: number | undefined
): ItemSummary {
  const leaves = leavesThatCount(node, hierarchy, stages, stages[startIndex])
  const progress = leaves.map((leaf) => leafProgress(leaf.issue, stages, startIndex, finishIndex))
  const count = (status: LeafStatus) => progress.filter((p) => p.status === status).length
  const aging =
    agingLimitDays === undefined
      ? 0
      : progress.filter(
          (p) => p.status === 'active' && p.started && (now.getTime() - p.started.getTime()) / DAY > agingLimitDays
        ).length
  const rolled = rolledUpWorkItem(node, hierarchy, stages, stages[startIndex])
  const end = crossedAt(rolled, stages, finishIndex)
  const finished = count('finished')
  const active = count('active')
  const group: ItemGroup = end
    ? 'finished'
    : aging > 0
      ? 'stuck'
      : active > 0
        ? 'moving'
        : finished > 0
          ? 'stalled'
          : 'idle'

  return {
    node,
    group,
    total: leaves.length,
    finished,
    active,
    aging,
    waiting: count('waiting'),
    addedThisWeek: progress.filter((p) => now.getTime() - p.added.getTime() < 7 * DAY).length,
    start: crossedAt(rolled, stages, startIndex) ?? end,
    end,
  }
}

/**
 * Orders items by what to tackle first: stuck, stalled, moving, then not started. Within a
 * group, the item closest to done comes first, because finishing it is what ships something.
 * Finished items come last, most recent first.
 */
export function rankItems(items: readonly ItemSummary[]): ItemSummary[] {
  const share = (item: ItemSummary) => (item.total === 0 ? 0 : item.finished / item.total)
  return [...items].sort(
    (a, b) =>
      ITEM_GROUPS.indexOf(a.group) - ITEM_GROUPS.indexOf(b.group) ||
      (a.group === 'finished'
        ? (b.end?.getTime() ?? 0) - (a.end?.getTime() ?? 0)
        : share(b) - share(a) || b.aging - a.aging)
  )
}

/** Why an item is where it is in the ranking, in a sentence */
export function rankReason(item: ItemSummary): string {
  const left = item.total - item.finished
  switch (item.group) {
    case 'stuck':
      if (left === item.aging) {
        return left === 1
          ? 'The last sub-issue is stuck. Finishing it ships the item.'
          : `All ${left} remaining sub-issues are stuck.`
      }
      if (item.active >= 5) {
        return `${item.active} sub-issues started at once, ${item.aging} stuck. Finish some before starting more.`
      }
      if (item.total >= 10 && item.addedThisWeek >= item.total * 0.5) {
        return `${item.aging} stuck, and ${item.addedThisWeek} sub-issues added this week. Decide what belongs here, and split off the rest.`
      }
      return `${item.aging} stuck, ${left} left to finish.`
    case 'stalled':
      return left === 1 ? 'One sub-issue left, and nobody is on it.' : `${left} sub-issues left, none active.`
    case 'moving':
      return `${item.active} active, ${item.waiting} waiting.`
    case 'idle':
      return item.total === 1 ? 'Not started.' : `${item.total} sub-issues, none started.`
    case 'finished':
      return `${item.total} sub-issues finished.`
  }
}
