import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { type WorkItem, makeCsvTransform } from '@oselvar/core'

/**
 * Pipes a work item stream to stdout as CSV
 */
export async function outputCsv<Stage extends string>(
  source: ReadableStream<WorkItem<Stage>>,
  stages: readonly Stage[]
): Promise<void> {
  const csvTransform = makeCsvTransform(stages)
  const csvStream = source.pipeThrough(csvTransform)

  // Convert to Node.js stream for stdout
  // biome-ignore lint/suspicious/noExplicitAny: Type mismatch between DOM and Node.js ReadableStream
  const nodeReadable = Readable.fromWeb(csvStream as any)

  await pipeline(nodeReadable, process.stdout)
}
