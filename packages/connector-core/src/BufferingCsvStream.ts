import { csvFormat } from 'd3-dsv'
import { Transform, TransformCallback } from 'stream'

import { WorkItem } from '../src'

/**
 * Outputs Flow CSV from {@link HistoricWorkItem} stream.
 */
export default class BufferingCsvStream<Stages extends string> extends Transform {
  private readonly workItems: WorkItem<Stages>[] = []

  constructor() {
    super({
      readableObjectMode: false,
      writableObjectMode: true,
    })
  }

  _transform(workItem: WorkItem<Stages>, _: BufferEncoding, callback: TransformCallback) {
    this.workItems.push(workItem)
    callback()
  }

  _flush(callback: TransformCallback) {
    const csv = csvFormat(this.workItems)
    this.push(csv)
    callback()
  }
}
