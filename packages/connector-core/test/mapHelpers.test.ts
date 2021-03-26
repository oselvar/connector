import assert from 'assert'

import { makeMapFromString, orderedMapValues } from '../src'

describe('makeMap', () => {
  it('makes identity map from non-colon entries', () => {
    const map = makeMapFromString('Todo,Doing,Done')
    assert.deepStrictEqual(orderedMapValues(map), ['Todo', 'Doing', 'Done'])
    assert.deepStrictEqual(Object.fromEntries(map.entries()), { Todo: 'Todo', Doing: 'Doing', Done: 'Done' })
  })

  it('makes map from colon entries', () => {
    const map = makeMapFromString('A:Todo,B:C:Doing,D:Done')
    assert.deepStrictEqual(orderedMapValues(map), ['Todo', 'Doing', 'Done'])
    assert.deepStrictEqual(Object.fromEntries(map.entries()), { A: 'Todo', B: 'Doing', C: 'Doing', D: 'Done' })
  })
})
