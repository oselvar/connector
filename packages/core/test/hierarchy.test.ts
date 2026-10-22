import { describe, expect, it } from 'vitest'
import { makeHierarchy, rollUpStages } from '../src/index.js'

const stages = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done']

describe('makeHierarchy', () => {
  const items = [
    { id: 'feature', parentId: null },
    { id: 'task-1', parentId: 'feature' },
    { id: 'task-2', parentId: 'feature' },
    { id: 'subtask', parentId: 'task-2' },
    { id: 'standalone', parentId: null },
    { id: 'orphan', parentId: 'in-another-team' },
  ]
  const hierarchy = makeHierarchy(items)
  const byId = (id: string) => items.find((item) => item.id === id) as (typeof items)[number]
  const ids = (list: readonly { id: string }[]) => list.map((item) => item.id)

  it('makes items without a known parent top-level', () => {
    expect(ids(hierarchy.topLevel)).toEqual(['feature', 'standalone', 'orphan'])
  })

  it('makes items without children leaves', () => {
    expect(ids(hierarchy.leaves)).toEqual(['task-1', 'subtask', 'standalone', 'orphan'])
  })

  it('finds the leaves under an item, at any depth', () => {
    expect(ids(hierarchy.leavesOf(byId('feature')))).toEqual(['task-1', 'subtask'])
    expect(ids(hierarchy.leavesOf(byId('standalone')))).toEqual(['standalone'])
  })

  it('finds the top-level ancestor', () => {
    expect(hierarchy.topLevelOf(byId('subtask')).id).toBe('feature')
    expect(hierarchy.topLevelOf(byId('feature')).id).toBe('feature')
  })

  it('survives cycles', () => {
    const a = { id: 'a', parentId: 'b' }
    const cyclic = makeHierarchy([a, { id: 'b', parentId: 'a' }])
    expect(ids(cyclic.descendantsOf(a))).toEqual(['b'])
    expect(cyclic.topLevelOf(a).id).toBe('b')
  })
})

describe('rollUpStages', () => {
  const parent = {
    id: 'feature',
    Todo: new Date('2026-01-01'),
    // Moved to Done by hand while work was still open
    Done: new Date('2026-01-03'),
  }
  const done = {
    id: 'task-1',
    'In Progress': new Date('2026-01-02'),
    'In Review': new Date('2026-01-04'),
    Done: new Date('2026-01-05'),
  }
  const inReview = {
    id: 'task-2',
    Todo: new Date('2026-01-02'),
    'In Progress': new Date('2026-01-03'),
    'In Review': new Date('2026-01-06'),
  }

  it('starts when the first piece of work starts, and moves on when all leaves have', () => {
    expect(rollUpStages(parent, [done, inReview], [done, inReview], stages, 'In Progress')).toEqual({
      Todo: new Date('2026-01-01'),
      'In Progress': new Date('2026-01-02'),
      'In Review': new Date('2026-01-06'),
    })
  })

  it('finishes when the last leaf finishes, whatever the parent says', () => {
    const finished = { ...inReview, Done: new Date('2026-01-08') }
    const rolled = rollUpStages({ id: 'feature' }, [done, finished], [done, finished], stages, 'In Progress')
    expect(rolled.Done).toEqual(new Date('2026-01-08'))
  })

  it('counts leaves that skipped a stage as having crossed it', () => {
    const skipped = { id: 'task-3', 'In Progress': new Date('2026-01-02'), Done: new Date('2026-01-03') }
    const rolled = rollUpStages({ id: 'feature' }, [done, skipped], [done, skipped], stages, 'In Progress')
    expect(rolled['In Review']).toEqual(new Date('2026-01-04'))
    expect(rolled.Done).toEqual(new Date('2026-01-05'))
  })

  it('skips stages none of its work entered', () => {
    const skipped = { id: 'task-3', 'In Progress': new Date('2026-01-02'), Done: new Date('2026-01-03') }
    const rolled = rollUpStages({ id: 'feature' }, [skipped], [skipped], stages, 'In Progress')
    expect(rolled).toEqual({ 'In Progress': new Date('2026-01-02'), Done: new Date('2026-01-03') })
  })

  it('keeps timestamps in workflow order when different work enters early stages', () => {
    const early = { id: 'a', 'In Progress': new Date('2026-01-01') }
    const late = { id: 'b', Todo: new Date('2026-01-05') }
    const rolled = rollUpStages({ id: 'feature' }, [early, late], [early, late], stages, 'In Progress')
    expect(rolled).toEqual({ Todo: new Date('2026-01-01'), 'In Progress': new Date('2026-01-01') })
  })
})
