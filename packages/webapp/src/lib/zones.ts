/**
 * How an in-progress item's age compares with how old past items were when they left
 * the same stage: within the 50th percentile, past it, past the 70th, or past the 85th.
 */
export const zones = [
  { label: 'On pace', swatch: 'bg-green-100 border-green-300', wash: 'fill-green-50' },
  { label: 'Slower than half', swatch: 'bg-yellow-100 border-yellow-300', wash: 'fill-yellow-50' },
  { label: 'Slower than 70%', swatch: 'bg-orange-100 border-orange-300', wash: 'fill-orange-50' },
  { label: 'Slower than 85%', swatch: 'bg-red-100 border-red-300', wash: 'fill-red-50' },
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
