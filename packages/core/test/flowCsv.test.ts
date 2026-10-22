import { describe, expect, it } from 'vitest'
import { formatFlowCsv, parseCsv, parseCsvStages } from '../src/index.js'

describe('formatFlowCsv', () => {
  it('writes ID, Link, Name, the stages and then extra columns', () => {
    const csv = formatFlowCsv(
      [
        {
          id: 'ENG-1',
          link: 'https://linear.app/o/issue/ENG-1',
          name: 'Fix the thing, again',
          stages: { Todo: new Date('2026-01-01T00:00:00.000Z'), Done: new Date('2026-01-03T00:00:00.000Z') },
          attributes: { Level: 'Leaf', Parent: 'ENG-0' },
        },
      ],
      ['Todo', 'In Progress', 'Done'],
      ['Level', 'Parent', 'PRs']
    )
    expect(csv).toBe(
      [
        'ID,Link,Name,Todo,In Progress,Done,Level,Parent,PRs',
        'ENG-1,https://linear.app/o/issue/ENG-1,"Fix the thing, again",2026-01-01T00:00:00.000Z,,2026-01-03T00:00:00.000Z,Leaf,ENG-0,',
      ].join('\n')
    )
  })
})

describe('parseCsv', () => {
  const csv = [
    'ID,Link,Name,Todo,In Progress,Done,Level,Sub-issues,Parent',
    'ENG-1,https://l/ENG-1,One,2026-01-01,2026-01-02,,Parent,3,',
    'ENG-2,https://l/ENG-2,Two,,2026-01-02,2026-01-04,Leaf,,',
  ].join('\n')

  it('reads the Actionable Agile layout, keeping extra columns as text', () => {
    expect(parseCsvStages(csv)).toEqual(['Todo', 'In Progress', 'Done'])
    expect(parseCsv(csv)[0]).toEqual({
      id: 'ENG-1',
      name: 'One',
      Todo: new Date('2026-01-01'),
      'In Progress': new Date('2026-01-02'),
      Level: 'Parent',
      'Sub-issues': '3',
    })
  })

  it("reads Oselvar's own layout", () => {
    const own = 'id,name,Todo,Done\n1,https://l/1,2026-01-01,2026-01-02'
    expect(parseCsvStages(own)).toEqual(['Todo', 'Done'])
    expect(parseCsv(own)).toEqual([
      { id: '1', name: 'https://l/1', Todo: new Date('2026-01-01'), Done: new Date('2026-01-02') },
    ])
  })
})
