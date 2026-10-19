import { type CycleTimeItem, calculateCycleTimes as calculate, parseCsv, parseCsvStages } from '@oselvar/core'

export type { CycleTimeItem }

export type CycleTimeOptions = {
  fromStage: string
  toStage: string
}

/**
 * Calculates cycle times from CSV data. The CSV's stage columns give the workflow order.
 */
export function calculateCycleTimes(csvString: string, options: CycleTimeOptions): CycleTimeItem[] {
  return calculate(parseCsv(csvString), parseCsvStages(csvString), options.fromStage, options.toStage)
}
