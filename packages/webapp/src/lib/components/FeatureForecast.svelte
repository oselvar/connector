<script lang="ts">
import { formatDate, plural } from '$lib/format'
import { issueHierarchy } from '$lib/levels'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { HISTORY_DAYS, throughputHistory } from '$lib/throughput'
import {
  MILLISECONDS_PER_DAY as DAY,
  crossedAt,
  forecastWhenSplit,
  makeFlowTimeline,
  percentile,
  seededRandom,
} from '@oselvar/core'
import { type LinearWorkItem, leavesThatCount, rolledUpWorkItem } from '@oselvar/linear'

/**
 * When will a top-level item be done? Forecasts from how many sub-issues top-level items
 * usually have, and how many leaves the team finishes a day.
 */
const { all }: { all: readonly LinearWorkItem[] } = $props()

const team = getTeam()
const range = getStageRange()
const now = Date.now()
const today = Math.floor(now / DAY) * DAY
const runs = 10000
const maxBucket = 12
const chances = [50, 70, 85, 95]

const stages = $derived(team.stages)
const toIndex = $derived(range.to)
const hierarchy = $derived(issueHierarchy(all))
const finished = (item: { [stage: string]: unknown; id: string }) => crossedAt(item, stages, toIndex) !== undefined

// Leaves finish at this pace
const leafTimeline = $derived(
  makeFlowTimeline(
    hierarchy.leaves.map((node) => node.issue.workItem),
    stages,
    stages[range.from + 1],
    stages[range.to]
  )
)
const history = $derived(throughputHistory(leafTimeline, today))

// How many leaves top-level items finished in the last 90 days had
const counts = $derived(
  hierarchy.topLevel
    .filter((node) => {
      const rolled = rolledUpWorkItem(node, hierarchy, stages, stages[range.from + 1])
      const done = crossedAt(rolled, stages, toIndex)
      return done !== undefined && done.getTime() >= today - HISTORY_DAYS * DAY
    })
    .map((node) => leavesThatCount(node, hierarchy, stages, stages[range.from + 1]).length)
)
const p85 = $derived(counts.length === 0 ? undefined : Math.ceil(percentile(counts, 85) ?? 0))
const buckets = $derived(
  Array.from({ length: maxBucket }, (_, i) => ({
    label: i === maxBucket - 1 ? `${maxBucket}+` : String(i + 1),
    count: counts.filter((n) => (i === maxBucket - 1 ? n >= maxBucket : n === i + 1)).length,
    within: p85 !== undefined && i + 1 <= p85,
  }))
)
const tallest = $derived(Math.max(1, ...buckets.map((b) => b.count)))

// Top-level items with sub-issues that are still open, oldest first
const open = $derived(
  hierarchy.topLevel
    .filter((node) => hierarchy.childrenOf(node).length > 0)
    .map((node) => {
      const leaves = hierarchy.leavesOf(node)
      const left = leaves.filter((leaf) => !finished(leaf.issue.workItem)).length
      return { node, total: leaves.length, left }
    })
    .filter((item) => item.left > 0)
    .sort((a, b) => b.total - a.total)
)
let picked: string | null = $state(null)
const selected = $derived(open.find((item) => item.node.id === picked))

const when = $derived(forecastWhenSplit(history, selected ? [selected.left] : counts, runs, seededRandom(3)))
const within = (percent: number) => when[Math.ceil((percent / 100) * when.length) - 1]
const dateIn = (days: number) =>
  Number.isFinite(days) ? formatDate(new Date(today + days * DAY)) : 'not within ten years'
</script>

<div class="mt-4 grid gap-4 md:grid-cols-2">
  <section aria-labelledby="fan-out" class="rounded-xl bg-white p-6 shadow-sm">
    <h2 id="fan-out" class="text-lg font-semibold text-gray-900">Sub-issues per top-level item</h2>
    <p class="mt-1.5 text-sm leading-normal text-gray-600">
      The {plural(counts.length, 'top-level item', 'top-level items')} finished in the last {HISTORY_DAYS} days, by how many
      leaves they had. Standalone issues count as one.
    </p>
    {#if counts.length > 0}
      <svg viewBox="0 0 520 250" class="mt-4 block h-auto w-full" role="img" aria-label="Histogram of sub-issues per top-level item. 85% have {p85} or fewer.">
        {#each buckets as bucket, i}
          {@const h = (bucket.count / tallest) * 180}
          <rect x={20 + i * 41} y={210 - h} width="36" height={h} rx="3" fill={bucket.within ? '#4f46e5' : '#c7d2fe'}>
            <title>{plural(bucket.count, 'item', 'items')} with {bucket.label} {bucket.label === '1' ? 'leaf' : 'leaves'}</title>
          </rect>
          {#if bucket.count > 0}
            <text x={38 + i * 41} y={204 - h} text-anchor="middle" font-size="12" fill="#374151">{bucket.count}</text>
          {/if}
          <text x={38 + i * 41} y="228" text-anchor="middle" font-size="12" fill="#6b7280">{bucket.label}</text>
        {/each}
        <line x1="16" x2="512" y1="210" y2="210" stroke="#d1d5db" />
        {#if p85 !== undefined && p85 < maxBucket}
          <line x1={20 + p85 * 41 - 2.5} x2={20 + p85 * 41 - 2.5} y1="14" y2="210" stroke="#111827" stroke-width="1.5" stroke-dasharray="4 3" />
          <text x={20 + p85 * 41 + 4} y="24" font-size="12" font-weight="600" fill="#111827">85% have {p85} or fewer</text>
        {/if}
        <text x="266" y="248" text-anchor="middle" font-size="12" fill="#6b7280">Leaves</text>
      </svg>
      {#if p85 !== undefined}
        <div class="mt-3 rounded-lg bg-gray-50 px-4 py-3">
          <p class="text-[13px] font-semibold text-gray-900">Right-sizing</p>
          <p class="mt-1 text-[15px] leading-relaxed text-gray-900">
            An item split into more than {plural(p85, 'sub-issue', 'sub-issues')} is bigger than 85% of your past work.
            Consider splitting it into separate top-level items.
          </p>
        </div>
      {/if}
    {:else}
      <p class="mt-4 text-[15px] text-gray-600">No top-level items finished in the last {HISTORY_DAYS} days.</p>
    {/if}
  </section>

  <section aria-labelledby="feature-forecast" class="rounded-xl bg-white p-6 shadow-sm">
    <h2 id="feature-forecast" class="text-lg font-semibold text-gray-900">When will it be done?</h2>
    <div class="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
      {#each open as item (item.node.id)}
        {@const on = picked === item.node.id}
        <button
          type="button"
          aria-pressed={on}
          onclick={() => (picked = item.node.id)}
          class="min-h-11 cursor-pointer rounded-lg px-3.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-indigo-600 {on
            ? 'border-2 border-indigo-600 bg-indigo-50'
            : 'm-px border border-gray-200 hover:bg-gray-50'}"
        >
          <span class="block text-sm font-semibold text-gray-900">
            <span class="font-mono text-indigo-600">{item.node.issue.identifier}</span>
            {item.node.issue.title}
          </span>
          <span class="mt-0.5 block text-[13px] text-gray-600">
            {item.total - item.left} of {plural(item.total, 'leaf', 'leaves')} finished · {item.left} left
          </span>
        </button>
      {/each}
      <button
        type="button"
        aria-pressed={picked === null}
        onclick={() => (picked = null)}
        class="min-h-11 cursor-pointer rounded-lg px-3.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-indigo-600 {picked ===
        null
          ? 'border-2 border-indigo-600 bg-indigo-50'
          : 'm-px border border-gray-200 hover:bg-gray-50'}"
      >
        <span class="block text-sm font-semibold text-gray-900">A new item, not split yet</span>
        <span class="mt-0.5 block text-[13px] text-gray-600">Its number of leaves is picked from the chart on the left</span>
      </button>
    </div>

    {#if when.length > 0}
      <p class="mt-5 text-sm leading-relaxed text-gray-700">
        {#if selected}
          {plural(selected.left, 'leaf is', 'leaves are')} left. Each simulated future plays out how many leaves the team
          finishes a day.
        {:else}
          Each simulated future picks how many leaves the item has from your past top-level items, then plays out how many
          leaves the team finishes a day.
        {/if}
      </p>
      <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {#each chances as chance}
          <div
            class="rounded-lg px-3 py-2.5 {chance === 85 ? 'border border-indigo-300 bg-indigo-50' : 'border border-gray-100 bg-gray-50'}"
          >
            <div class="text-xs text-gray-600">{chance}% likely by</div>
            <div class="mt-0.5 text-base font-semibold text-gray-900">{dateIn(within(chance))}</div>
          </div>
        {/each}
      </div>
      <p class="mt-3.5 text-[13px] leading-normal text-gray-500">
        This assumes the whole team works only on this item. With other work going on in parallel it will take longer.
      </p>
    {:else}
      <p class="mt-5 text-[15px] text-gray-600">
        There isn't enough history yet: no leaves finished in the last {HISTORY_DAYS} days, or no top-level items did.
      </p>
    {/if}
  </section>
</div>

<p class="mt-4 max-w-[64ch] text-[13px] leading-normal text-gray-500">
  This is Prateek Singh's way of forecasting features: forecast a big item by how many small items it usually turns into, and
  how fast small items finish.
</p>
