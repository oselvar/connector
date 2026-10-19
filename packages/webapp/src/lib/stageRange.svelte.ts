import { getContext, setContext } from 'svelte'

/**
 * The span of the workflow the team's charts look at, as indexes into the stages.
 * Shared by the chart tabs and kept in the URL as ?from=&to= stage names.
 */
export type StageRange = { from: number; to: number }

const key = Symbol('stageRange')

export function readStageRange(
  url: URL,
  stages: readonly string[],
  defaultFrom: number,
  defaultTo: number
): StageRange {
  const from = stages.indexOf(url.searchParams.get('from') ?? '')
  const to = stages.indexOf(url.searchParams.get('to') ?? '')
  return from !== -1 && to > from ? { from, to } : { from: defaultFrom, to: defaultTo }
}

export function stageRangeSearch(stages: readonly string[], range: StageRange): string {
  return `?${new URLSearchParams({ from: stages[range.from], to: stages[range.to] })}`
}

export function setStageRange(range: StageRange) {
  setContext(key, range)
}

export function getStageRange(): StageRange {
  return getContext<StageRange>(key)
}
