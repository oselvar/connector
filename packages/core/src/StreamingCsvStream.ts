import { csvFormatRow } from 'd3-dsv'

import type { WorkItem } from './types'

/**
 * Creates a TransformStream that outputs Flow CSV from WorkItem objects.
 * CSV rows are emitted as each work item arrives (streaming mode).
 */
export function createStreamingCsvTransform<Stage extends string>(
  stages: readonly Stage[]
): TransformStream<WorkItem<Stage>, string> {
  const columns = ['id', 'name', ...stages]
  let headerPrinted = false

  return new TransformStream<WorkItem<Stage>, string>({
    transform(workItem, controller) {
      if (!headerPrinted) {
        controller.enqueue(`${csvFormatRow(columns as string[])}\n`)
        headerPrinted = true
      }
      const row = columns.map((column) => workItem[column as keyof WorkItem<Stage>])
      controller.enqueue(`${csvFormatRow(row as unknown as string[])}\n`)
    },
  })
}
