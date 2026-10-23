<script lang="ts">
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import { formatDuration, plural } from '$lib/format'
import { type IssueNode, issueHierarchy } from '$lib/levels'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { MILLISECONDS_PER_DAY as DAY, type StagedItem, crossedAt, percentile, rollUpStages } from '@oselvar/core'

/**
 * Top-level items with their sub-issues on a timeline: when each piece of work was waiting,
 * active and finished, and when its PRs merged. Shows how a big item's work moves, or stalls.
 */
const { all }: { all: readonly import('@oselvar/linear').LinearWorkItem[] } = $props()

const team = getTeam()
const range = getStageRange()
const now = Date.now()
const windowDays = 42
const windowStart = Math.floor(now / DAY) * DAY - windowDays * DAY
const windowEnd = now + 2 * DAY

// Chart geometry, in viewBox units
const width = 1000
const plotLeft = 330
const laneHeight = 10
const x = (time: number) =>
  plotLeft +
  ((Math.min(Math.max(time, windowStart), windowEnd) - windowStart) / (windowEnd - windowStart)) *
    (width - plotLeft - 10)

let show: 'open' | 'all' = $state('all')

const stages = $derived(team.stages)
const queueName = $derived(stages[range.from])
const toName = $derived(stages[range.to])
const hierarchy = $derived(issueHierarchy(all))

type Bar = { x: number; w: number; kind: 'waiting' | 'active' | 'finished'; tip: string; label: string }
type Dot = { cx: number; lane: number; tip: string }
type Row = {
  node: IssueNode
  start: number | undefined
  end: number | undefined
  bars: Bar[]
  dots: Dot[]
  leaves: number
  finishedLeaves: number
  drift: string | undefined
}

const time = (item: StagedItem, index: number) => crossedAt(item, stages, index)?.getTime()
const firstSeen = (item: StagedItem) =>
  Math.min(
    ...stages.map((stage) => (item[stage] instanceof Date ? (item[stage] as Date).getTime() : Number.POSITIVE_INFINITY))
  )

const rows: Row[] = $derived(
  hierarchy.topLevel
    .filter((node) => hierarchy.childrenOf(node).length > 0)
    .map((node) => {
      const leaves = hierarchy.leavesOf(node)
      const rolled = {
        id: node.id,
        ...rollUpStages(
          node.issue.workItem,
          hierarchy.descendantsOf(node).map((d) => d.issue.workItem),
          leaves.map((leaf) => leaf.issue.workItem),
          stages,
          stages[range.from + 1]
        ),
      }
      const start = time(rolled, range.from + 1)
      const end = time(rolled, range.to)

      const bars = leaves.map((leaf): Bar => {
        const item = leaf.issue.workItem
        const started = time(item, range.from + 1)
        const finished = time(item, range.to)
        const kind = finished !== undefined ? 'finished' : started !== undefined ? 'active' : 'waiting'
        const from = started ?? finished ?? firstSeen(item)
        const to = finished ?? now
        const bx = x(Number.isFinite(from) ? from : now)
        const took =
          finished !== undefined && started !== undefined ? ` after ${formatDuration((finished - started) / DAY)}` : ''
        return {
          x: bx,
          w: Math.max(5, x(to) - bx),
          kind,
          tip: `${leaf.issue.identifier} ${leaf.issue.title} · ${kind}${took}`,
          label: leaf.issue.identifier,
        }
      })
      const dots = leaves.flatMap((leaf, lane) =>
        leaf.issue.pullRequests.flatMap((pr) =>
          pr.ships && pr.mergedAt && pr.mergedAt.getTime() >= windowStart
            ? [{ cx: x(pr.mergedAt.getTime()), lane, tip: `${pr.label} merged (${leaf.issue.identifier})` }]
            : []
        )
      )
      const finishedLeaves = bars.filter((bar) => bar.kind === 'finished').length
      const completed = node.issue.linearStateType === 'completed'
      const drift =
        completed && end === undefined
          ? `${node.issue.linearState} in Linear, but work is open`
          : !completed && end !== undefined
            ? 'All work finished, still open in Linear'
            : undefined
      return { node, start, end, bars, dots, leaves: leaves.length, finishedLeaves, drift }
    })
    // Open items that started, and items that finished in the window
    .filter((row) => row.start !== undefined && (row.end === undefined || (show === 'all' && row.end >= windowStart)))
    .sort((a, b) =>
      (a.end === undefined) !== (b.end === undefined) ? (a.end === undefined ? -1 : 1) : (a.start ?? 0) - (b.start ?? 0)
    )
)

const layout = $derived.by(() => {
  let y = 40
  return rows.map((row) => {
    const top = y
    y += Math.max(78, 26 + row.bars.length * laneHeight) + 14
    return { row, top }
  })
})
const height = $derived(
  (layout.at(-1)?.top ?? 0) + Math.max(78, 26 + (layout.at(-1)?.row.bars.length ?? 0) * laneHeight) + 24
)

const ticks = $derived(
  Array.from({ length: 7 }, (_, i) => windowStart + (i * 7 + 1) * DAY).map((t) => ({
    x: x(t),
    label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(t)),
  }))
)

// How long finished top-level items took, to judge the open ones by
const finishedDays = $derived(
  hierarchy.topLevel.flatMap((node) => {
    const leaves = hierarchy.leavesOf(node)
    const rolled = {
      id: node.id,
      ...rollUpStages(
        node.issue.workItem,
        hierarchy.descendantsOf(node).map((d) => d.issue.workItem),
        leaves.map((leaf) => leaf.issue.workItem),
        stages,
        stages[range.from + 1]
      ),
    }
    const start = time(rolled, range.from + 1)
    const end = time(rolled, range.to)
    return start !== undefined && end !== undefined && end > start ? [(end - start) / DAY] : []
  })
)
const p85 = $derived(percentile(finishedDays, 85))
const open = $derived(rows.filter((row) => row.end === undefined))
const oldest = $derived(open[0])
const oldestDays = $derived(oldest?.start === undefined ? 0 : (now - oldest.start) / DAY)

const fills = { waiting: '#f9fafb', active: '#4f46e5', finished: '#c7d2fe' }
const truncate = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)
</script>

<p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
  {#if oldest && p85 !== undefined && oldestDays > p85}
    {oldest.node.issue.identifier} has been active for {formatDuration(oldestDays)}, longer than 85% of finished top-level items took.
  {:else if open.length > 0}
    {plural(open.length, 'top-level item is', 'top-level items are')} active.
  {:else}
    No top-level items with sub-issues are active.
  {/if}
</p>
<p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
  Each row is a top-level item with sub-issues, and each bar one of its leaves. A long stretch where no bar moves usually means
  the item was parked rather than worked on.
  {#if p85 !== undefined}85% of finished top-level items took {formatDuration(p85)} or less.{/if}
  <RangeExplanation queue={queueName} finish={toName} />
</p>

<section class="mt-8 rounded-xl bg-white px-4 pb-4 pt-6 shadow-sm sm:px-6">
  <StageRange stages={team.stages} bind:from={range.from} bind:to={range.to} />
</section>

<section class="mt-4 rounded-xl bg-white p-6 shadow-sm">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-gray-600">
      <span class="inline-flex items-center gap-1.5"><svg width="28" height="8" aria-hidden="true"><rect y="1" width="28" height="6" rx="3" fill="#4f46e5" /></svg>Active</span>
      <span class="inline-flex items-center gap-1.5"><svg width="28" height="8" aria-hidden="true"><rect x="0.5" y="1.5" width="27" height="5" rx="2.5" fill="#f9fafb" stroke="#9ca3af" stroke-dasharray="3 2" /></svg>Waiting</span>
      <span class="inline-flex items-center gap-1.5"><svg width="28" height="8" aria-hidden="true"><rect y="1" width="28" height="6" rx="3" fill="#c7d2fe" /></svg>Finished</span>
      <span class="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="#ea580c" stroke="#fff" stroke-width="1.5" /></svg>PR merged</span>
    </div>
    <div class="flex overflow-hidden rounded-lg border border-gray-300" role="group" aria-label="Which items">
      {#each [{ value: 'open', label: 'Still open' }, { value: 'all', label: `All, last ${windowDays / 7} weeks` }] as option}
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

  {#if rows.length === 0}
    <p class="mt-6 text-[15px] text-gray-600">No top-level items with sub-issues to show.</p>
  {:else}
    <div class="mt-4 overflow-x-auto">
      <svg viewBox="0 0 {width} {height}" class="block h-auto w-full min-w-[760px]" role="img" aria-label="Timeline of top-level items, with their leaves as bars and merged PRs as dots">
        {#each ticks as tick}
          <line x1={tick.x} x2={tick.x} y1="24" y2={height - 10} stroke="rgba(17,24,39,0.06)" />
          <text x={tick.x} y="14" text-anchor="middle" font-size="12" fill="#6b7280">{tick.label}</text>
        {/each}
        <line x1={x(now)} x2={x(now)} y1="20" y2={height - 10} stroke="#111827" stroke-width="1.5" />
        <text x={x(now)} y="14" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Today</text>

        {#each layout as { row, top } (row.node.id)}
          {@const issue = row.node.issue}
          <line x1="0" x2={width} y1={top - 10} y2={top - 10} stroke="#f3f4f6" />
          <a href={issue.workItem.name} target="_blank" rel="noreferrer">
            <text x="0" y={top + 8} font-size="13" font-weight="600" fill="#4f46e5" font-family="ui-monospace,Menlo,monospace">{issue.identifier}</text>
          </a>
          <text x="0" y={top + 26} font-size="13" font-weight="600" fill="#111827">{truncate(issue.title, 40)}<title>{issue.title}</title></text>
          <text x="0" y={top + 44} font-size="12" fill="#4b5563">
            {row.end === undefined
              ? `Active ${formatDuration((now - (row.start ?? now)) / DAY)} · ${row.finishedLeaves} of ${plural(row.leaves, 'leaf', 'leaves')} finished`
              : `Finished in ${formatDuration(((row.end ?? 0) - (row.start ?? 0)) / DAY)} · ${plural(row.leaves, 'leaf', 'leaves')}`}
          </text>
          {#if row.drift}
            <rect x="0" y={top + 52} width={row.drift.length * 6.2 + 16} height="20" rx="10" fill="#fff7ed" stroke="#fdba74" />
            <text x="8" y={top + 66} font-size="11" font-weight="600" fill="#9a3412">{row.drift}</text>
          {/if}
          <rect
            x={x(row.start ?? now)}
            y={top + 6}
            width={Math.max(4, x(row.end ?? now) - x(row.start ?? now))}
            height="4"
            rx="2"
            fill="#d1d5db"
          />
          {#each row.bars as bar, lane}
            <rect
              x={bar.x}
              y={top + 18 + lane * laneHeight}
              width={bar.w}
              height="7"
              rx="3.5"
              fill={fills[bar.kind]}
              stroke={bar.kind === 'waiting' ? '#9ca3af' : 'none'}
              stroke-dasharray={bar.kind === 'waiting' ? '3 2' : undefined}><title>{bar.tip}</title></rect
            >
            {#if bar.x + bar.w + 60 < width}
              <text x={bar.x + bar.w + 4} y={top + 25 + lane * laneHeight} font-size="9" fill="#6b7280" font-family="ui-monospace,Menlo,monospace">{bar.label}</text>
            {/if}
          {/each}
          {#each row.dots as dot}
            <circle cx={dot.cx} cy={top + 21.5 + dot.lane * laneHeight} r="4.5" fill="#ea580c" stroke="#fff" stroke-width="1.5"><title>{dot.tip}</title></circle>
          {/each}
        {/each}
      </svg>
    </div>
  {/if}
</section>

<p class="mt-6 max-w-[62ch] text-[13px] leading-normal text-gray-500">
  A top-level item starts when its first piece of work starts, and finishes when its last leaf finishes. Its own state in
  Linear doesn't decide that, so moving a parent to Done early doesn't hide open work.
</p>
