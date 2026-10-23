import { makeHierarchy } from '@oselvar/core'

import type { LinearWorkItem } from './LinearWorkItemStream'
import { isOpen, lastMergedAt } from './pullRequests'

export type DriftKind =
  /** A leaf whose PRs all merged, but which is still open in Linear */
  | 'merged-but-open'
  /** A leaf that is completed in Linear while one of its PRs is still open */
  | 'done-but-pr-open'
  /** A parent that is completed in Linear while work under it is still open */
  | 'parent-done-work-open'
  /** A parent that is still open in Linear while all work under it is finished */
  | 'work-done-parent-open'

export type Drift = {
  kind: DriftKind
  issue: LinearWorkItem
  /** For parents: the leaves under it, and how many of them are finished */
  leaves?: { total: number; finished: number }
}

/** Whether Linear or GitHub says an issue is finished */
export function isFinished(issue: LinearWorkItem): boolean {
  return issue.linearStateType === 'completed' || lastMergedAt(issue.pullRequests) !== null
}

/**
 * Issues where Linear and GitHub, or a parent and the work under it, disagree about
 * whether the work is finished. They are usually issues somebody forgot to move.
 */
export function findDrift(issues: readonly LinearWorkItem[]): Drift[] {
  const nodes = issues.map((issue) => ({ id: issue.workItem.id, parentId: issue.parentId, issue }))
  const hierarchy = makeHierarchy(nodes)
  const result: Drift[] = []

  for (const node of hierarchy.leaves) {
    const { issue } = node
    const completed = issue.linearStateType === 'completed'
    if (!completed && lastMergedAt(issue.pullRequests)) {
      result.push({ kind: 'merged-but-open', issue })
    } else if (completed && issue.pullRequests.some(isOpen)) {
      result.push({ kind: 'done-but-pr-open', issue })
    }
  }

  const parents = nodes.filter((node) => hierarchy.childrenOf(node).length > 0)
  for (const node of parents) {
    const leaves = hierarchy.leavesOf(node)
    const finished = leaves.filter((leaf) => isFinished(leaf.issue)).length
    const completed = node.issue.linearStateType === 'completed'
    const counts = { total: leaves.length, finished }
    if (completed && finished < leaves.length) {
      result.push({ kind: 'parent-done-work-open', issue: node.issue, leaves: counts })
    } else if (!completed && finished === leaves.length) {
      result.push({ kind: 'work-done-parent-open', issue: node.issue, leaves: counts })
    }
  }
  return result
}
