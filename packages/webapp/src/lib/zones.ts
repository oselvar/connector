/**
 * How an in-progress item's age compares with how old past items were when they left
 * the same stage: within the 50th percentile, past it, past the 70th, or past the 85th.
 * Plain colors rather than Tailwind classes, since these are picked at runtime.
 */
export const zones = [
  { label: 'On pace', swatch: '#dcfce7', edge: '#86efac', wash: '#f0fdf4' },
  { label: 'Slower than half', swatch: '#fef9c3', edge: '#fde047', wash: '#fefce8' },
  { label: 'Slower than 70%', swatch: '#ffedd5', edge: '#fdba74', wash: '#fff7ed' },
  { label: 'Slower than 85%', swatch: '#fee2e2', edge: '#fca5a5', wash: '#fef2f2' },
] as const

/** The 50th, 70th and 85th percentile of the ages at which past items left a stage */
export type StagePace = readonly [number, number, number]

export function zoneIndex(ageDays: number, pace: StagePace | undefined): number {
  if (!pace) return 0
  let zone = 0
  while (zone < pace.length && ageDays > pace[zone]) zone++
  return zone
}

export function zoneSentence(zone: number, stage: string): string {
  return [
    `On pace for ${stage}`,
    `Older than half of past issues were when they left ${stage}`,
    `Older than 70% of past issues were when they left ${stage}`,
    `Older than 85% of past issues were when they left ${stage}`,
  ][zone]
}
