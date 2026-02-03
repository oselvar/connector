import { createBufferingCsvTransform } from './BufferingCsvStream'
import { createStreamingCsvTransform } from './StreamingCsvStream'
import type { WorkItem } from './types'

export function makeCsvTransform<Stage extends string>(
  stages: readonly Stage[]
): TransformStream<WorkItem<Stage>, string> {
  return stages.length > 0 ? createStreamingCsvTransform(stages) : createBufferingCsvTransform()
}
