import { type Hierarchy, type WorkItem, crossedAt, makeHierarchy, rollUpStages } from '@oselvar/core'

import type { LinearWorkItem } from './LinearWorkItemStream'

export type IssueNode = { id: string; parentId: string | null; issue: LinearWorkItem }

/** Issues arranged by their parents */
export function issueHierarchy(issues: readonly LinearWorkItem[]): Hierarchy<IssueNode> {
  return makeHierarchy(issues.map((issue) => ({ id: issue.workItem.id, parentId: issue.parentId, issue })))
}

/**
 * The leaves that decide when a parent is finished. Normally all of them. Once the parent is
 * completed in Linear, leaves that never started are left out: closing the parent closes its
 * scope, and parked follow-ups were never committed to.
 */
export function leavesThatCount(
  node: IssueNode,
  hierarchy: Hierarchy<IssueNode>,
  stages: readonly string[],
  startStage: string
): IssueNode[] {
  const leaves = hierarchy.leavesOf(node)
  if (node.issue.linearStateType !== 'completed') return leaves
  const startIndex = stages.indexOf(startStage)
  return leaves.filter((leaf) => crossedAt(leaf.issue.workItem, stages, startIndex) !== undefined)
}

/**
 * A parent's work item, rolled up from the work under it: it starts when its first piece of
 * work starts, but not before it was created, and finishes when the last leaf that counts finishes. An issue without
 * sub-issues, or a completed parent whose sub-issues never started, is its own work item.
 */
export function rolledUpWorkItem(
  node: IssueNode,
  hierarchy: Hierarchy<IssueNode>,
  stages: readonly string[],
  startStage: string
): WorkItem<string> {
  const descendants = hierarchy.descendantsOf(node)
  const leaves = leavesThatCount(node, hierarchy, stages, startStage)
  const { workItem } = node.issue
  if (descendants.length === 0 || leaves.length === 0) return workItem
  const rolled = rollUpStages(
    workItem,
    descendants.map((d) => d.issue.workItem),
    leaves.map((leaf) => leaf.issue.workItem),
    stages,
    startStage,
    node.issue.createdAt
  )
  return { id: workItem.id, name: workItem.name, ...rolled } as WorkItem<string>
}
