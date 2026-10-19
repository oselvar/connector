import { issueIdentifier } from '$lib/format'
import { type StageRange, stageRangeSearch } from '$lib/stageRange.svelte'
import type { TeamContext } from '$lib/team'
import { type CoachChart, type CoachFinding, coach } from '@oselvar/core'
import type { LinearWorkItem } from '@oselvar/linear'

export function teamCoach(issues: readonly LinearWorkItem[], team: TeamContext, range: StageRange): CoachFinding[] {
  const assignees = new Map(issues.map((issue) => [issue.workItem.id, issue.assignee ?? undefined]))
  return coach({
    items: issues.map((issue) => issue.workItem),
    stages: team.stages,
    queueStage: team.stages[range.from],
    fromStage: team.stages[range.from + 1],
    toStage: team.stages[range.to],
    notStartedStages: team.notStartedStages,
    now: new Date(),
    identify: (item) => issueIdentifier(item.name ?? item.id),
    teamSize: team.teamSize,
    assigneeOf: (item) => assignees.get(item.id),
  })
}

const chartPaths: Record<CoachChart, string> = {
  'cycle-time': 'cycle-time',
  aging: 'aging',
  flow: 'flow',
  throughput: 'throughput',
  wip: 'wip',
}

const chartNames: Record<CoachChart, string> = {
  'cycle-time': 'the cycle time chart',
  aging: 'the aging work chart',
  flow: 'the cumulative flow chart',
  throughput: 'the throughput chart',
  wip: 'the active work chart',
}

/** Links to a team's pages that keep the selected range */
export function teamLinks(workspaceId: string, teamId: string, stages: readonly string[], range: StageRange) {
  const base = `/app/workspaces/${workspaceId}/teams/${teamId}`
  const search = stageRangeSearch(stages, range)
  return {
    overview: `${base}${search}`,
    chart: (chart: CoachChart) => `${base}/${chartPaths[chart]}${search}`,
    chartName: (chart: CoachChart) => chartNames[chart],
  }
}
