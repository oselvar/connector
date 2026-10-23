<script lang="ts">
import { page } from '$app/state'
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import StateName from '$lib/components/StateName.svelte'
import { formatDuration, plural } from '$lib/format'
import { issueHierarchy } from '$lib/levels'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { MILLISECONDS_PER_DAY as DAY } from '@oselvar/core'
import {
  type ItemGroup,
  type ItemSummary,
  type LinearWorkItem,
  agingLimit,
  rankItems,
  rankReason,
  summarizeItem,
} from '@oselvar/linear'

/**
 * Top-level items with sub-issues, in the order we'd tackle them: stuck work first, then
 * work where nothing is moving. Each links to its own timeline.
 */
const { all }: { all: readonly LinearWorkItem[] } = $props()

const team = getTeam()
const range = getStageRange()
const now = new Date()
const finishedWindowDays = 42

let show: 'open' | 'all' = $state('open')

const stages = $derived(team.stages)
const startIndex = $derived(range.from + 1)
const finishIndex = $derived(range.to)
const hierarchy = $derived(issueHierarchy(all))
const limit = $derived(
  agingLimit(
    hierarchy.leaves.map((node) => node.issue),
    stages,
    startIndex,
    finishIndex
  )
)

const ranked = $derived(
  rankItems(
    hierarchy.topLevel
      .filter((node) => hierarchy.childrenOf(node).length > 0)
      .map((node) => summarizeItem(node, hierarchy, stages, startIndex, finishIndex, now, limit))
      .filter(
        (item) =>
          item.group !== 'finished' ||
          (show === 'all' && item.end !== undefined && now.getTime() - item.end.getTime() < finishedWindowDays * DAY)
      )
  )
)

const groupText: Record<ItemGroup, { title: string; hint: string }> = {
  stuck: { title: 'Stuck', hint: 'Started work is taking longer than usual. Go and help finish it.' },
  stalled: {
    title: 'Stalled',
    hint: 'Some of it is done, but nothing is active. Pick it back up, or close what’s left.',
  },
  moving: { title: 'Moving', hint: 'Work is active and within the usual time.' },
  idle: { title: 'Not started', hint: 'Nothing has started yet. Leave these until the ones above are done.' },
  finished: { title: 'Finished', hint: `In the last ${finishedWindowDays / 7} weeks, most recent first.` },
}

const groups = $derived(
  (['stuck', 'stalled', 'moving', 'idle', 'finished'] as const)
    .map((group) => ({ group, items: ranked.filter((item) => item.group === group) }))
    .filter(({ items }) => items.length > 0)
)

const first = $derived(ranked[0])
const timelineHref = (item: ItemSummary) => `${page.url.pathname}/${item.node.issue.identifier}${page.url.search}`
const pct = (n: number, total: number) => `${total === 0 ? 0 : (100 * n) / total}%`
const openFor = (item: ItemSummary) => {
  if (item.end && item.start) return `took ${formatDuration((item.end.getTime() - item.start.getTime()) / DAY)}`
  const since = item.start ?? item.node.issue.createdAt
  return formatDuration((now.getTime() - since.getTime()) / DAY)
}
</script>

<p class="mt-6 max-w-[24em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
  {#if !first || first.group === 'finished'}
    No open top-level items with sub-issues.
  {:else if first.group === 'stuck' && first.total - first.finished === 1}
    Finish {first.node.issue.identifier} first. It’s one sub-issue from done, and that one is stuck.
  {:else if first.group === 'stuck'}
    Start with {first.node.issue.identifier}: {plural(first.aging, 'sub-issue is', 'sub-issues are')} taking longer than usual.
  {:else if first.group === 'stalled'}
    Pick {first.node.issue.identifier} back up. {first.finished} of {first.total} sub-issues are finished, and nothing is active.
  {:else if first.group === 'moving'}
    Nothing is stuck. {plural(ranked.filter((item) => item.group === 'moving').length, 'item is', 'items are')} moving.
  {:else}
    Nothing has started yet.
  {/if}
</p>
<p class="mt-3.5 max-w-[66ch] text-base leading-normal text-gray-600">
  The list is in the order we’d tackle it. Stuck work comes first: sub-issues active longer than 85% of yours take{#if limit !== undefined}
    ({formatDuration(limit)}){/if}. Then items where nothing is moving. Within each group, the item closest to done comes first,
  because finishing it is what gets something shipped.
</p>

<section class="mt-8 rounded-xl bg-white px-4 pb-4 pt-6 shadow-sm sm:px-6">
  <StageRange stages={team.stages} bind:from={range.from} bind:to={range.to} />
</section>

<section class="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm">
  <div class="min-w-[940px]">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-gray-600">
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-sm bg-indigo-200"></span>Finished</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-sm bg-indigo-600"></span>Active</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-sm bg-amber-500"></span>Aging</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-sm border border-dashed border-gray-400 bg-gray-50"></span>Waiting</span>
      </div>
      <div class="flex overflow-hidden rounded-lg border border-gray-300" role="group" aria-label="Which items">
        {#each [{ value: 'open', label: 'Still open' }, { value: 'all', label: `All, last ${finishedWindowDays / 7} weeks` }] as option}
          {@const on = show === option.value}
          <button
            type="button"
            aria-pressed={on}
            onclick={() => (show = option.value as 'open' | 'all')}
            class="min-h-10 cursor-pointer px-3.5 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 {on
              ? 'bg-indigo-600 font-semibold text-white'
              : 'text-gray-700 hover:bg-gray-50'}">{option.label}</button
          >
        {/each}
      </div>
    </div>

    {#if groups.length === 0}
      <p class="px-5 py-6 text-[15px] text-gray-600">No top-level items with sub-issues to show.</p>
    {:else}
      <div class="grid grid-cols-[minmax(0,1fr)_240px_110px_130px_90px] gap-5 border-b border-gray-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
        <span>Item</span><span>Sub-issues</span><span class="text-right">Added this week</span><span>Active</span><span class="text-right">Open for</span>
      </div>
      {#each groups as { group, items }}
        {@const offset = ranked.indexOf(items[0])}
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-gray-200 bg-gray-50 px-5 pb-2.5 pt-3.5">
          <h3 class="text-sm font-semibold text-gray-900">{groupText[group].title}</h3>
          <span class="text-[13px] text-gray-600">{groupText[group].hint}</span>
        </div>
        {#each items as item, i (item.node.id)}
          {@const issue = item.node.issue}
          {@const growing = item.total >= 10 && item.addedThisWeek >= item.total * 0.5}
          <a
            href={timelineHref(item)}
            class="grid min-h-11 grid-cols-[minmax(0,1fr)_240px_110px_130px_90px] items-center gap-5 border-b border-gray-100 px-5 py-3.5 text-gray-900 hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600"
          >
            <span class="flex min-w-0 gap-3.5">
              <span class="w-6 flex-none text-right text-sm font-semibold tabular-nums text-gray-500">{offset + i + 1}</span>
              <span class="flex min-w-0 flex-col gap-1">
                <span class="flex min-w-0 items-center gap-2.5">
                  <span class="flex-none font-mono text-[13px] font-semibold text-indigo-600">{issue.identifier}</span>
                  <span class="truncate text-sm font-medium" title={issue.title}>{issue.title}</span>
                  <span class="flex-none text-xs"><StateName name={issue.linearState} /></span>
                </span>
                <span class="text-[13px] leading-snug text-gray-700">{rankReason(item)}</span>
              </span>
            </span>
            <span class="flex flex-col gap-1.5">
              <span class="flex h-3 overflow-hidden rounded-full bg-gray-50 ring-1 ring-inset ring-gray-200" aria-hidden="true">
                <span class="block bg-indigo-200" style="width: {pct(item.finished, item.total)}"></span>
                <span class="block bg-indigo-600" style="width: {pct(item.active - item.aging, item.total)}"></span>
                <span class="block bg-amber-500" style="width: {pct(item.aging, item.total)}"></span>
              </span>
              <span class="text-[13px] tabular-nums text-gray-600">{item.finished} of {item.total} finished · {item.waiting} waiting</span>
            </span>
            <span class="text-right text-sm tabular-nums {growing ? 'font-bold text-gray-900' : 'text-gray-600'}"
              >{item.addedThisWeek > 0 ? `+${item.addedThisWeek}` : '0'}</span
            >
            <span class="flex items-center gap-2 text-[13px] text-gray-600">
              <span class="tabular-nums">{item.active > 0 ? item.active : '–'}</span>
              {#if item.aging > 0}
                <span class="whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2 text-xs font-semibold text-amber-800">{item.aging} aging</span>
              {/if}
            </span>
            <span class="text-right text-sm tabular-nums text-gray-600">{openFor(item)}</span>
          </a>
        {/each}
      {/each}
    {/if}
  </div>
</section>

<p class="mt-6 max-w-[70ch] text-[13px] leading-normal text-gray-500">
  <RangeExplanation queue={stages[range.from]} finish={stages[range.to]} /> A top-level item starts when its first sub-issue
  starts, but not before it was created, and finishes when its last sub-issue finishes. Open for counts from when it started, or from when it was created if nothing has.
</p>
