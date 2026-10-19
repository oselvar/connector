/**
 * Monte Carlo forecasts from past daily throughput: each simulated day picks a random day
 * from the past and assumes the same number of items finish.
 */

/** A seeded random number generator (mulberry32), so forecasts are repeatable */
export function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** How many items finish in `days` days, one result per run, smallest first */
export function forecastHowMany(
  dailyThroughput: readonly number[],
  days: number,
  runs: number,
  random: () => number
): number[] {
  if (dailyThroughput.length === 0) return []
  const results: number[] = []
  for (let run = 0; run < runs; run++) {
    let total = 0
    for (let day = 0; day < days; day++) {
      total += dailyThroughput[Math.floor(random() * dailyThroughput.length)]
    }
    results.push(total)
  }
  return results.sort((a, b) => a - b)
}

/**
 * How many days until `count` items have finished, one result per run, fewest first.
 * Runs that don't get there within maxDays give Infinity.
 */
export function forecastWhen(
  dailyThroughput: readonly number[],
  count: number,
  runs: number,
  random: () => number,
  maxDays = 3650
): number[] {
  if (dailyThroughput.length === 0 || dailyThroughput.every((n) => n === 0)) return []
  const results: number[] = []
  for (let run = 0; run < runs; run++) {
    let total = 0
    let day = 0
    while (total < count && day < maxDays) {
      total += dailyThroughput[Math.floor(random() * dailyThroughput.length)]
      day++
    }
    results.push(total >= count ? day : Number.POSITIVE_INFINITY)
  }
  return results.sort((a, b) => a - b)
}
