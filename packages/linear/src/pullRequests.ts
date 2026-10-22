import type { WorkItem } from '@oselvar/core'

import type { LinearAttachment } from './types'

export type PullRequestStatus = 'open' | 'draft' | 'merged' | 'closed' | 'unknown'

/** A GitHub pull request linked to a Linear issue */
export type PullRequest = {
  url: string
  /** owner/repo#number */
  label: string
  status: PullRequestStatus
  mergedAt: Date | null
}

const PULL_REQUEST_URL = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/

/**
 * The pull request an attachment links to, or null if it links to something else.
 * Linear's GitHub integration keeps the PR's status in the attachment's metadata. PRs
 * linked by hand have no status, and don't count as merged.
 */
export function toPullRequest(attachment: LinearAttachment): PullRequest | null {
  const match = attachment.url.match(PULL_REQUEST_URL)
  if (!match) return null
  const [, owner, repo, number] = match

  const metadata = attachment.metadata ?? {}
  const status = toStatus(metadata.status, metadata.draft)
  const mergedAt =
    status === 'merged'
      ? (toDate(metadata.mergedAt) ?? toDate(metadata.closedAt) ?? toDate(attachment.updatedAt) ?? null)
      : null

  return { url: match[0], label: `${owner}/${repo}#${number}`, status, mergedAt }
}

function toStatus(status: unknown, draft: unknown): PullRequestStatus {
  const value = typeof status === 'string' ? status.toLowerCase() : ''
  if (value === 'merged' || value === 'closed') return value
  if (value === 'draft' || (value === 'open' && draft === true)) return 'draft'
  if (value === 'open' || value === 'inreview' || value === 'approved') return 'open'
  return 'unknown'
}

function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** When the last of an issue's PRs merged, if at least one merged and none are still open */
export function lastMergedAt(pullRequests: readonly PullRequest[]): Date | null {
  if (pullRequests.some((pr) => pr.status === 'open' || pr.status === 'draft')) return null
  const merged = pullRequests.flatMap((pr) => (pr.mergedAt ? [pr.mergedAt] : []))
  if (merged.length === 0) return null
  return new Date(Math.max(...merged.map((date) => date.getTime())))
}

/**
 * Finishes a work item when its last PR merged, for teams where merging is shipping.
 * If Linear says it finished earlier, that stays. If it moved through later stages after
 * the merge, it finishes when it last moved, so the timestamps stay in workflow order.
 */
export function finishOnMerge<Stage extends string>(
  workItem: WorkItem<Stage>,
  stages: readonly Stage[],
  finishStage: Stage,
  mergedAt: Date | null
): WorkItem<Stage> {
  if (!mergedAt) return workItem
  const existing = workItem[finishStage]
  if (existing instanceof Date && existing.getTime() <= mergedAt.getTime()) return workItem

  const before = stages.slice(0, stages.indexOf(finishStage))
  const latestBefore = Math.max(
    mergedAt.getTime(),
    ...before.map((stage) => {
      const date = workItem[stage]
      return date instanceof Date ? date.getTime() : 0
    })
  )
  return { ...workItem, [finishStage]: new Date(latestBefore) }
}
