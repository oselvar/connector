import { describe, expect, it } from 'vitest'
import { forecastHowMany, forecastWhen, forecastWhenSplit, seededRandom } from '../src/index.js'

describe('forecastHowMany', () => {
  it('adds up random past days', () => {
    expect(forecastHowMany([2, 2, 2], 10, 3, seededRandom(1))).toEqual([20, 20, 20])
  })

  it('spreads results when past days vary', () => {
    const results = forecastHowMany([0, 4], 10, 1000, seededRandom(1))
    expect(results[0]).toBeGreaterThanOrEqual(0)
    expect(results[999]).toBeLessThanOrEqual(40)
    expect(results[500]).toBeGreaterThan(10)
    expect(results[500]).toBeLessThan(30)
  })
})

describe('forecastWhen', () => {
  it('counts days until enough items finish', () => {
    expect(forecastWhen([2], 7, 2, seededRandom(1))).toEqual([4, 4])
  })

  it('has no answer when nothing ever finished', () => {
    expect(forecastWhen([0, 0], 7, 2, seededRandom(1))).toEqual([])
  })
})

describe('forecastWhenSplit', () => {
  it('picks how many items each run has to finish', () => {
    const results = forecastWhenSplit([1], [1, 5], 1000, seededRandom(1))
    expect(new Set(results)).toEqual(new Set([1, 5]))
  })
})
