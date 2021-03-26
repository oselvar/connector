import { Transform } from 'stream'

import BufferingCsvStream from './BufferingCsvStream'
import StreamingCsvStream from './StreamingCsvStream'

export function makeCsvStream<Stage extends string>(stages: readonly Stage[]): Transform {
  return stages.length > 0 ? new StreamingCsvStream(stages) : new BufferingCsvStream()
}
