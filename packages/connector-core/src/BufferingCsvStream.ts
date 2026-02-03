import { csvFormat } from 'd3-dsv'

import type { WorkItem } from './types'

/**
 * Creates a TransformStream that buffers all WorkItem objects and outputs
 * CSV when the stream closes. Use this when stages are not known upfront.
 */
export function createBufferingCsvTransform<Stage extends string>(): TransformStream<WorkItem<Stage>, string> {
  const workItems: WorkItem<Stage>[] = []

  return new TransformStream<WorkItem<Stage>, string>({
    transform(workItem) {
      workItems.push(workItem)
    },
    flush(controller) {
      const csv = csvFormat(workItems)
      controller.enqueue(csv)
    },
  })
}
