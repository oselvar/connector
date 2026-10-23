<script lang="ts">
import StateName from '$lib/components/StateName.svelte'
import { formatDuration, plural } from '$lib/format'
import { type Level, getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { type Drift, type DriftKind, type LinearWorkItem, findDrift, isOpen, lastMergedAt } from '@oselvar/linear'

/**
 * Issues where Linear and GitHub, or a parent and its work, disagree about whether the
 * work is finished. Shows the kinds that matter at the selected level.
 */
const { issues, level }: { issues: readonly LinearWorkItem[]; level: Level } = $props()

const groupsByLevel: Record<Level, { kind: DriftKind; title: string; hint: string }[]> = {
  leaves: [
    {
      kind: 'merged-but-open',
      title: 'PR merged, issue still open',
      hint: 'Counted as finished when the last PR merged.',
    },
    {
      kind: 'done-but-pr-open',
      title: 'Issue finished, PR still open',
      hint: 'Counted as finished when Linear says so. Merge or close the PR.',
    },
  ],
  top: [
    {
      kind: 'parent-done-work-open',
      title: 'Parent finished, sub-issues still open',
      hint: 'Not finished: a top-level item finishes when its last sub-issue does.',
    },
    {
      kind: 'work-done-parent-open',
      title: 'All sub-issues finished, parent still open',
      hint: 'Counted as finished when the last sub-issue finished.',
    },
  ],
}

const now = Date.now()
const team = getTeam()
const range = getStageRange()
const drift = $derived(findDrift(issues, team.stages, team.stages[range.from + 1]))
const groups = $derived(
  groupsByLevel[level]
    .map((group) => ({ ...group, items: drift.filter((d) => d.kind === group.kind) }))
    .filter((group) => group.items.length > 0)
)
const total = $derived(groups.reduce((sum, group) => sum + group.items.length, 0))

function detail(d: Drift): string {
  switch (d.kind) {
    case 'merged-but-open': {
      const merged = lastMergedAt(d.issue.pullRequests)
      const labels = d.issue.pullRequests.filter((pr) => pr.ships && pr.status === 'merged').map((pr) => pr.label)
      return `${labels.join(', ')} merged ${merged ? `${formatDuration((now - merged.getTime()) / 86_400_000)} ago` : ''}`
    }
    case 'done-but-pr-open':
      return `${d.issue.pullRequests
        .filter(isOpen)
        .map((pr) => pr.label)
        .join(', ')} still open`
    case 'parent-done-work-open':
      return `${d.leaves?.finished ?? 0} of ${plural(d.leaves?.total ?? 0, 'sub-issue', 'sub-issues')} finished`
    case 'work-done-parent-open':
      return `All ${plural(d.leaves?.total ?? 0, 'sub-issue', 'sub-issues')} finished`
  }
}
</script>

{#if total > 0}
  <section aria-labelledby="drift" class="mt-8 rounded-xl bg-white p-6 shadow-sm">
    <p class="flex items-center gap-1.5 text-[13px] font-semibold text-amber-700">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.75 14.5 13.5H1.5Z M8 6.25v3.25 M8 11.6v.1"></path></svg>
      Fix the data
    </p>
    <h2 id="drift" class="mt-2 text-xl font-semibold leading-snug text-gray-900">Falling through the cracks</h2>
    <p class="mt-1.5 max-w-[64ch] text-[15px] leading-relaxed text-gray-600">
      Linear and GitHub, or parents and their sub-issues, disagree about {plural(total, 'issue', 'issues')}. The
      charts count work as finished when it really finished, so update Linear to match.
    </p>

    {#each groups as group (group.kind)}
      <div class="mt-6">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 class="text-[15px] font-semibold text-gray-900">{group.title}</h3>
          <span class="text-[13px] text-gray-500">{plural(group.items.length, 'issue', 'issues')}</span>
        </div>
        <p class="mb-2 mt-0.5 text-sm text-gray-600">{group.hint}</p>
        <ul>
          {#each group.items as d (d.issue.workItem.id)}
            <li class="grid items-center gap-x-6 gap-y-2 border-t border-gray-100 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <span class="font-mono text-[13px] font-semibold text-indigo-600">{d.issue.identifier}</span>
                  <span class="max-w-[60ch] truncate text-[15px] text-gray-900">{d.issue.title}</span>
                </div>
                <div class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-gray-600">
                  <StateName name={d.issue.linearState} />
                  <span>{detail(d)}</span>
                </div>
              </div>
              <a
                href={d.issue.workItem.name}
                target="_blank"
                rel="noreferrer"
                class="whitespace-nowrap text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Open in Linear
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </section>
{/if}
