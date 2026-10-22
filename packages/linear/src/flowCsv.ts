import { type FlowCsvRow, formatFlowCsv, makeHierarchy, rollUpStages } from '@oselvar/core'

import type { LinearWorkItem } from './LinearWorkItemStream'
import { lastMergedAt } from './pullRequests'

/**
 * The extra columns after the stages. To look at one level in a tool that imports the CSV,
 * filter on Level: leaves are Leaf and Standalone, top-level items are Top-level and Standalone.
 */
export const FLOW_CSV_ATTRIBUTES = ['Level', 'Parent', 'Top-level', 'Sub-issues', 'State', 'PRs', 'Merged at'] as const

/**
 * Formats issues as flow CSV, one row per issue. A parent's stage dates are rolled up from
 * the work under it: it starts when its first piece of work reaches `startStage`, and moves
 * on to later stages when all of its leaves have.
 */
export function formatLinearFlowCsv(
  issues: readonly LinearWorkItem[],
  stages: readonly string[],
  startStage: string
): string {
  const nodes = issues.map((issue) => ({ id: issue.workItem.id, parentId: issue.parentId, issue }))
  const hierarchy = makeHierarchy(nodes)

  const rows: FlowCsvRow[] = nodes.map((node) => {
    const { issue } = node
    const parent = hierarchy.parentOf(node)
    const children = hierarchy.childrenOf(node)
    const descendants = hierarchy.descendantsOf(node)
    const merged = lastMergedAt(issue.pullRequests)
    const stageDates =
      descendants.length === 0
        ? (issue.workItem as FlowCsvRow['stages'])
        : rollUpStages(
            issue.workItem,
            descendants.map((d) => d.issue.workItem),
            hierarchy.leavesOf(node).map((leaf) => leaf.issue.workItem),
            stages,
            startStage
          )

    return {
      id: issue.identifier,
      link: issue.workItem.name,
      name: issue.title,
      stages: stageDates,
      attributes: {
        Level: parent ? (children.length > 0 ? 'Middle' : 'Leaf') : children.length > 0 ? 'Top-level' : 'Standalone',
        Parent: parent?.issue.identifier ?? '',
        'Top-level': hierarchy.topLevelOf(node).issue.identifier,
        'Sub-issues': children.length > 0 ? String(children.length) : '',
        State: issue.linearState,
        PRs: issue.pullRequests.map((pr) => pr.label).join(' '),
        'Merged at': merged?.toISOString() ?? '',
      },
    }
  })

  return formatFlowCsv(rows, stages, FLOW_CSV_ATTRIBUTES)
}
