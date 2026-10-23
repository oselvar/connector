import { crossedAt } from '@oselvar/core'

import type { LinearWorkItem } from './LinearWorkItemStream'
import { isOpen, lastMergedAt } from './pullRequests'
import { issueHierarchy } from './rollUp'

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
  /** For parents: the leaves that count, and how many of them are finished */
  leaves?: { total: number; finished: number }
}

/** Whether Linear or GitHub says an issue is finished */
export function isFinished(issue: LinearWorkItem): boolean {
  return issue.linearStateType === 'completed' || lastMergedAt(issue.pullRequests) !== null
}

/**
 * Issues where Linear and GitHub, or a parent and the work under it, disagree about
 * whether the work is finished. They are usually issues somebody forgot to move.
 *
 * Sub-issues that never reached `startStage` don't count against a completed parent:
 * closing the parent closes its scope.
 */
export function findDrift(issues: readonly LinearWorkItem[], stages: readonly string[], startStage: string): Drift[] {
  const hierarchy = issueHierarchy(issues)
  const nodes = hierarchy.topLevel.flatMap((top) => [top, ...hierarchy.descendantsOf(top)])
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

  const startIndex = stages.indexOf(startStage)
  const parents = nodes.filter((node) => hierarchy.childrenOf(node).length > 0)
  for (const node of parents) {
    const completed = node.issue.linearStateType === 'completed'
    const leaves = hierarchy
      .leavesOf(node)
      .filter((leaf) => !completed || crossedAt(leaf.issue.workItem, stages, startIndex) !== undefined)
    const finished = leaves.filter((leaf) => isFinished(leaf.issue)).length
    const counts = { total: leaves.length, finished }
    if (completed && finished < leaves.length) {
      result.push({ kind: 'parent-done-work-open', issue: node.issue, leaves: counts })
    } else if (!completed && finished === leaves.length) {
      result.push({ kind: 'work-done-parent-open', issue: node.issue, leaves: counts })
    }
  }
  return result
}
