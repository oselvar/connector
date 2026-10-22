import type { Level, StageRange } from '$lib/stageRange.svelte'
import { type Hierarchy, makeHierarchy, rollUpStages } from '@oselvar/core'
import type { LinearWorkItem } from '@oselvar/linear'

export type IssueNode = { id: string; parentId: string | null; issue: LinearWorkItem }

export function issueHierarchy(issues: readonly LinearWorkItem[]): Hierarchy<IssueNode> {
  return makeHierarchy(issues.map((issue) => ({ id: issue.workItem.id, parentId: issue.parentId, issue })))
}

/**
 * The work items at one level. Leaves are issues without sub-issues. Top-level items are
 * issues without a parent, with their stages rolled up from the work under them, so a
 * top-level item starts when its first piece of work starts and finishes when its last
 * leaf finishes. Standalone issues are both.
 */
export function issuesAtLevel(
  issues: readonly LinearWorkItem[],
  stages: readonly string[],
  range: StageRange
): LinearWorkItem[] {
  const hierarchy = issueHierarchy(issues)
  if (range.level === 'leaves') return hierarchy.leaves.map((node) => node.issue)
  return hierarchy.topLevel.map((node) => rollUp(node, hierarchy, stages, stages[range.from + 1]))
}

export function levelCounts(issues: readonly LinearWorkItem[]): Record<Level, number> {
  const hierarchy = issueHierarchy(issues)
  return { leaves: hierarchy.leaves.length, top: hierarchy.topLevel.length }
}

function rollUp(
  node: IssueNode,
  hierarchy: Hierarchy<IssueNode>,
  stages: readonly string[],
  startStage: string
): LinearWorkItem {
  const descendants = hierarchy.descendantsOf(node)
  if (descendants.length === 0) return node.issue

  const { workItem } = node.issue
  const rolled = rollUpStages(
    workItem,
    descendants.map((d) => d.issue.workItem),
    hierarchy.leavesOf(node).map((leaf) => leaf.issue.workItem),
    stages,
    startStage
  )
  // It is in the last stage its work reached
  const reached = stages.filter((stage) => rolled[stage] !== undefined)
  return {
    ...node.issue,
    workItem: { id: workItem.id, name: workItem.name, ...rolled } as LinearWorkItem['workItem'],
    currentState: reached[reached.length - 1] ?? node.issue.currentState,
    pullRequests: [node.issue, ...descendants.map((d) => d.issue)].flatMap((issue) => issue.pullRequests),
  }
}
