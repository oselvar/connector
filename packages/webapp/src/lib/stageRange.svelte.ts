import { getContext, setContext } from 'svelte'

/**
 * Which work items the team's charts look at, shared by the chart tabs and kept in the URL
 * as ?from=&to=&level=.
 *
 * `from` and `to` are the span of the workflow, as indexes into the stages. `from` is the
 * queue, where work waits; it isn't active. Work starts when it moves past it, is active in
 * the stages after it, and is finished when it reaches `to`. So `to` is always at least two
 * stages after `from`.
 *
 * `level` is whether the work items are leaves (issues without sub-issues) or top-level
 * issues (issues without a parent, with dates rolled up from the work under them).
 */
export type StageRange = { from: number; to: number; level: Level }

export type Level = 'leaves' | 'top'

const key = Symbol('stageRange')

export function readStageRange(
  url: URL,
  stages: readonly string[],
  defaultFrom: number,
  defaultTo: number
): StageRange {
  const from = stages.indexOf(url.searchParams.get('from') ?? '')
  const to = stages.indexOf(url.searchParams.get('to') ?? '')
  const level = url.searchParams.get('level') === 'top' ? 'top' : 'leaves'
  return from !== -1 && to >= from + 2 ? { from, to, level } : { from: defaultFrom, to: defaultTo, level }
}

export function stageRangeSearch(stages: readonly string[], range: StageRange): string {
  const params = new URLSearchParams({ from: stages[range.from], to: stages[range.to] })
  if (range.level === 'top') params.set('level', 'top')
  return `?${params}`
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
