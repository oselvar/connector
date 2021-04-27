import assert from 'assert'
import { pipeline, Writable } from 'stream'
import { promisify } from 'util'

import { makeCsvStream, WorkItem } from '../src'

const asyncPipeline = promisify(pipeline)

const testStages = <const>['todo', 'doing', 'done']
export type TestStage = typeof testStages[number]

describe('StreamingCsvStream', () => {
  it('prints labels as arrays', async () => {
    const lines: string[] = []
    const csvStream = makeCsvStream(['todo', 'doing', 'done', 'labels'])
    const workItem: WorkItem<TestStage> = {
      id: '1',
      name: 'a',
      labels: '[one|two|three]',
    }
    csvStream.write(workItem)
    csvStream.end()
    await asyncPipeline(
      csvStream,
      new Writable({
        write(line: Buffer, _, callback) {
          lines.push(line.toString('utf-8'))
          callback()
        },
      })
    )
    assert.deepStrictEqual(lines, ['id,name,todo,doing,done,labels\n', '1,a,,,,[one|two|three]\n'])
  })
})
