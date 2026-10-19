import { getContext, setContext } from 'svelte'

/**
 * The span of the workflow the team's charts look at, as indexes into the stages, shared by
 * the chart tabs and kept in the URL as ?from=&to= stage names.
 *
 * `from` is the queue, where work waits; it isn't active. Work starts when it moves past it,
 * is active in the stages after it, and is finished when it reaches `to`. So `to` is always
 * at least two stages after `from`.
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
  return from !== -1 && to >= from + 2 ? { from, to } : { from: defaultFrom, to: defaultTo }
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

/** The names of the stages in their roles */
export function stageRoles(stages: readonly string[], range: StageRange) {
  return {
    /** Where work waits before it starts */
    queue: stages[range.from],
    /** The first active stage: work starts when it reaches this one or a later one */
    start: stages[range.from + 1],
    /** Where work is finished */
    finish: stages[range.to],
  }
}
