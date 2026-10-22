import type { WorkItem } from '@oselvar/core'
import { describe, expect, it } from 'vitest'
import { finishOnMerge, lastMergedAt, toPullRequest } from '../src/index.js'
import type { PullRequest } from '../src/index.js'

const pr = (status: PullRequest['status'], mergedAt?: string): PullRequest => ({
  url: 'https://github.com/o/r/pull/1',
  label: 'o/r#1',
  status,
  mergedAt: mergedAt ? new Date(mergedAt) : null,
})

describe('toPullRequest', () => {
  it('ignores links that are not pull requests', () => {
    expect(
      toPullRequest({ url: 'https://github.com/o/r/issues/1', sourceType: null, metadata: null, updatedAt: '' })
    ).toBeNull()
  })

  it('falls back to when the attachment changed for a merged PR without a merge time', () => {
    const attachment = {
      url: 'https://github.com/o/r/pull/7/files',
      sourceType: 'github',
      metadata: { status: 'merged' },
      updatedAt: '2026-01-02T00:00:00.000Z',
    }
    expect(toPullRequest(attachment)).toEqual({
      url: 'https://github.com/o/r/pull/7',
      label: 'o/r#7',
      status: 'merged',
      mergedAt: new Date('2026-01-02T00:00:00.000Z'),
    })
  })

  it('treats PRs linked by hand as unknown', () => {
    const attachment = { url: 'https://github.com/o/r/pull/7', sourceType: 'api', metadata: {}, updatedAt: '' }
    expect(toPullRequest(attachment)?.status).toBe('unknown')
  })
})

describe('lastMergedAt', () => {
  it('is the last merge, once no PR is open', () => {
    expect(lastMergedAt([pr('merged', '2026-01-02'), pr('merged', '2026-01-05'), pr('closed')])).toEqual(
      new Date('2026-01-05')
    )
  })

  it('is null while a PR is open, or none merged', () => {
    expect(lastMergedAt([pr('merged', '2026-01-02'), pr('open')])).toBeNull()
    expect(lastMergedAt([pr('closed')])).toBeNull()
    expect(lastMergedAt([])).toBeNull()
  })
})

describe('finishOnMerge', () => {
  type Stage = 'Todo' | 'In Progress' | 'In Review' | 'Done'
  const stages: Stage[] = ['Todo', 'In Progress', 'In Review', 'Done']

  it('finishes when the last PR merged', () => {
    const item: WorkItem<Stage> = { id: '1', 'In Progress': new Date('2026-01-02') }
    expect(finishOnMerge(item, stages, 'Done', new Date('2026-01-04'))).toEqual({
      ...item,
      Done: new Date('2026-01-04'),
    })
  })

  it('keeps an earlier finish from Linear', () => {
    const item: WorkItem<Stage> = { id: '1', Done: new Date('2026-01-03') }
    expect(finishOnMerge(item, stages, 'Done', new Date('2026-01-04'))).toBe(item)
  })

  it('keeps timestamps in workflow order when the issue moved on after the merge', () => {
    const item: WorkItem<Stage> = {
      id: '1',
      'In Progress': new Date('2026-01-02'),
      'In Review': new Date('2026-01-06'),
    }
    expect(finishOnMerge(item, stages, 'Done', new Date('2026-01-04')).Done).toEqual(new Date('2026-01-06'))
  })
})
