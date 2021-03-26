import { csvFormatRow } from 'd3-dsv'
import { Transform, TransformCallback } from 'stream'

import { WorkItem } from '../src'

/**
 * Outputs Flow CSV from {@link HistoricWorkItem} stream.
 */
export default class StreamingCsvStream<Stage extends string> extends Transform {
  private readonly columns: readonly string[]
  private headerPrinted = false

  constructor(private readonly stages: readonly Stage[]) {
    super({
      readableObjectMode: false,
      writableObjectMode: true,
    })
    this.columns = ['id', 'link', ...this.stages]
  }

  _transform(workItem: WorkItem<Stage>, _: BufferEncoding, callback: TransformCallback) {
    if (!this.headerPrinted) {
      this.push(csvFormatRow(this.columns as string[]) + '\n')
      this.headerPrinted = true
    }
    const row = this.columns.map((column) => workItem[column])
    this.push(csvFormatRow((row as unknown) as string[]) + '\n')
    callback(null)
  }
}
