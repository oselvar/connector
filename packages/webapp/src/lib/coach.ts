import { issueIdentifier } from '$lib/format'
import { type StageRange, stageRangeSearch } from '$lib/stageRange.svelte'
import { type CoachChart, type CoachFinding, type WorkItem, coach } from '@oselvar/core'

export function teamCoach(
  items: readonly WorkItem<string>[],
  stages: readonly string[],
  range: StageRange,
  commitmentStage: string | undefined
): CoachFinding[] {
  return coach({
    items,
    stages,
    fromStage: stages[range.from],
    toStage: stages[range.to],
    commitmentStage,
    now: new Date(),
    identify: (item) => issueIdentifier(item.name ?? item.id),
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
  wip: 'the work in progress chart',
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
