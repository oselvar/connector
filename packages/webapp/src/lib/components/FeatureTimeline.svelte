<script lang="ts">
import { page } from '$app/state'
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import StateName from '$lib/components/StateName.svelte'
import { formatDate, formatDuration, plural } from '$lib/format'
import { type IssueNode, issueHierarchy } from '$lib/levels'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { MILLISECONDS_PER_DAY as DAY } from '@oselvar/core'
import {
  type LeafProgress,
  type LinearWorkItem,
  agingLimit,
  leafProgress,
  leavesThatCount,
  leftBehind,
  summarizeItem,
} from '@oselvar/linear'

/**
 * One top-level item as it stands: how its scope grew against what got finished, and each
 * sub-issue on a timeline, grouped by whether it's active, waiting or finished.
 */
const { all, identifier }: { all: readonly LinearWorkItem[]; identifier: string } = $props()

const team = getTeam()
const range = getStageRange()
const now = Date.now()
const HOUR = 3_600_000

// Wide enough to read, scrolling sideways when the item has been open long
const targetWidth = 720
const minPxPerHour = 1.5
const maxPxPerHour = 14
const labelRoom = 100
const scopeHeight = 190

const stages = $derived(team.stages)
const startIndex = $derived(range.from + 1)
const finishIndex = $derived(range.to)
const hierarchy = $derived(issueHierarchy(all))
const node = $derived(hierarchy.topLevel.find((n) => n.issue.identifier === identifier))
const limit = $derived(
  agingLimit(
    hierarchy.leaves.map((n) => n.issue),
    stages,
    startIndex,
    finishIndex
  )
)
const summary = $derived(node && summarizeItem(node, hierarchy, stages, startIndex, finishIndex, new Date(now), limit))

const behind = $derived(node ? leftBehind(node, hierarchy, stages, stages[startIndex]) : [])

type Leaf = { node: IssueNode; progress: LeafProgress; aging: boolean; parent: IssueNode | undefined }
const leaves: Leaf[] = $derived(
  node
    ? leavesThatCount(node, hierarchy, stages).map((leaf) => {
        const progress = leafProgress(leaf.issue, stages, startIndex, finishIndex)
        const aging =
          limit !== undefined &&
          progress.status === 'active' &&
          progress.started !== undefined &&
          (now - progress.started.getTime()) / DAY > limit
        const parent = hierarchy.parentOf(leaf)
        return { node: leaf, progress, aging, parent: parent?.id === node.id ? undefined : parent }
      })
    : []
)

// The window runs from when the item was created to today, or to when it finished
const windowStart = $derived(node ? node.issue.createdAt.getTime() : now)
const lastDay = $derived(summary?.end?.getTime() ?? now)
const pxPerHour = $derived(
  Math.min(maxPxPerHour, Math.max(minPxPerHour, (targetWidth - labelRoom) / ((lastDay - windowStart) / HOUR)))
)
// Past the end, leave room for the scope chart's labels
const windowEnd = $derived(lastDay + (labelRoom / pxPerHour) * HOUR)
const trackWidth = $derived(Math.round(((windowEnd - windowStart) / HOUR) * pxPerHour))
const x = (time: number) => Math.min(trackWidth, Math.max(0, ((time - windowStart) / HOUR) * pxPerHour))

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const ticks = $derived.by(() => {
  const step = [3, 6, 12, 24, 48, 168].find((hours) => hours * pxPerHour >= 88) ?? 336
  const first = new Date(windowStart)
  first.setHours(0, 0, 0, 0)
  const result: { x: number; label: string; major: boolean }[] = []
  for (let t = first.getTime(); t <= windowEnd; t += step * HOUR) {
    if (t < windowStart) continue
    const date = new Date(t)
    const midnight = date.getHours() === 0
    const label =
      step >= 168 ? dayMonth.format(date) : midnight ? weekday.format(date) : String(date.getHours()).padStart(2, '0')
    result.push({ x: x(t), label, major: midnight })
  }
  return result
})

// Scope: leaves added against leaves finished, as two step lines
const scope = $derived.by(() => {
  const added = leaves.map((leaf) => leaf.progress.added.getTime()).sort((a, b) => a - b)
  const finished = leaves.flatMap((leaf) => leaf.progress.finished?.getTime() ?? []).sort((a, b) => a - b)
  const total = leaves.length
  const max = Math.max(4, Math.ceil(total / 4) * 4)
  const y = (n: number) => scopeHeight - 14 - (n * (scopeHeight - 34)) / max
  const path = (times: number[]) => {
    let n = times.filter((t) => t <= windowStart).length
    let d = `M0 ${y(n)}`
    for (const t of times) {
      if (t <= windowStart) continue
      d += ` H${x(t)} V${y(++n)}`
    }
    return { d: `${d} H${x(summary?.end?.getTime() ?? now)}`, end: n }
  }
  const scopeLine = path(added)
  const doneLine = path(finished)
  const end = x(summary?.end?.getTime() ?? now)
  return {
    scopeLine: scopeLine.d,
    doneLine: doneLine.d,
    scopeArea: `${scopeLine.d} V${y(0)} H0 Z`,
    doneArea: `${doneLine.d} V${y(0)} H0 Z`,
    grid: [1, 2, 3, 4].map((i) => ({ y: y((max / 4) * i), label: String((max / 4) * i) })),
    labelX: end + 10,
    scopeY: y(scopeLine.end),
    doneY: y(doneLine.end),
    atStart: added.filter((t) => t <= windowStart + DAY).length,
  }
})

// Rows: leaves grouped by status, with sub-issues of sub-issues under their parent
type Row =
  | { kind: 'parent'; node: IssueNode; finished: number; total: number; drift: string | undefined }
  | { kind: 'leaf'; leaf: Leaf; depth: number }

function rowsFor(status: LeafProgress['status'], key: (leaf: Leaf) => number): Row[] {
  const matching = leaves.filter((leaf) => leaf.progress.status === status)
  const entries: { key: number; parent?: IssueNode; leaves: Leaf[] }[] = []
  const byParent = new Map<string, (typeof entries)[number]>()
  for (const leaf of matching) {
    if (!leaf.parent) {
      entries.push({ key: key(leaf), leaves: [leaf] })
      continue
    }
    let entry = byParent.get(leaf.parent.id)
    if (!entry) {
      entry = { key: Number.POSITIVE_INFINITY, parent: leaf.parent, leaves: [] }
      byParent.set(leaf.parent.id, entry)
      entries.push(entry)
    }
    entry.leaves.push(leaf)
    entry.key = Math.min(entry.key, key(leaf))
  }
  return entries
    .sort((a, b) => a.key - b.key)
    .flatMap((entry): Row[] => {
      const sorted = [...entry.leaves].sort((a, b) => key(a) - key(b))
      if (!entry.parent) return sorted.map((leaf) => ({ kind: 'leaf', leaf, depth: 0 }))
      const under = leaves.filter((leaf) => leaf.parent?.id === entry.parent?.id)
      const finished = under.filter((leaf) => leaf.progress.status === 'finished').length
      const completed = entry.parent.issue.linearStateType === 'completed'
      const drift =
        !completed && finished === under.length
          ? `All finished, still ${entry.parent.issue.linearState}`
          : completed && finished < under.length
            ? `${entry.parent.issue.linearState}, but work is open`
            : undefined
      return [
        { kind: 'parent', node: entry.parent, finished, total: under.length, drift },
        ...sorted.map((leaf): Row => ({ kind: 'leaf', leaf, depth: 1 })),
      ]
    })
}

const time = (date: Date | undefined) => date?.getTime() ?? now
let open = $state({ active: true, waiting: true, finished: false })
const groups = $derived([
  {
    key: 'active' as const,
    label: 'Active',
    hint: 'longest first',
    rows: rowsFor('active', (leaf) => time(leaf.progress.started)),
  },
  {
    key: 'waiting' as const,
    label: 'Waiting',
    hint: 'not started, oldest first',
    rows: rowsFor('waiting', (leaf) => leaf.progress.added.getTime()),
  },
  {
    key: 'finished' as const,
    label: 'Finished',
    hint: 'in the order they finished',
    rows: rowsFor('finished', (leaf) => time(leaf.progress.finished)),
  },
])

const marks = (status: LeafProgress['status']) =>
  leaves
    .filter((leaf) => leaf.progress.status === status)
    .map((leaf) => ({
      x: x(
        time(
          status === 'finished'
            ? leaf.progress.finished
            : status === 'active'
              ? leaf.progress.started
              : leaf.progress.added
        )
      ),
      tip: leaf.node.issue.identifier,
    }))

type Bar = { left: number; width: number; kind: 'waiting' | 'active' | 'aging' | 'finished'; tip: string }
function bars(leaf: Leaf): Bar[] {
  const { added, started, finished } = leaf.progress
  const end = summary?.end?.getTime() ?? now
  const bar = (from: number, to: number, kind: Bar['kind'], tip: string): Bar => ({
    left: x(from),
    width: Math.max(4, x(to) - x(from)),
    kind,
    tip,
  })
  const result: Bar[] = []
  const waitEnd = started?.getTime() ?? end
  if (waitEnd - added.getTime() > HOUR / 4) {
    result.push(
      bar(added.getTime(), waitEnd, 'waiting', `Waiting ${formatDuration((waitEnd - added.getTime()) / DAY)}`)
    )
  }
  if (started && finished) {
    result.push(
      bar(
        started.getTime(),
        finished.getTime(),
        'finished',
        `Finished in ${formatDuration((finished.getTime() - started.getTime()) / DAY)}`
      )
    )
  } else if (started) {
    const limitAt = limit === undefined ? end : started.getTime() + limit * DAY
    result.push(bar(started.getTime(), Math.min(limitAt, end), 'active', 'Active'))
    if (limitAt < end) result.push(bar(limitAt, end, 'aging', 'Active longer than 85% of sub-issues take'))
  }
  return result
}

const age = (leaf: Leaf) => {
  const { status, added, started, finished } = leaf.progress
  if (status === 'finished' && started && finished)
    return `took ${formatDuration((finished.getTime() - started.getTime()) / DAY)}`
  if (status === 'active' && started) return `active ${formatDuration((now - started.getTime()) / DAY)}`
  return `waiting ${formatDuration((now - added.getTime()) / DAY)}`
}

const mergeDots = (leaf: Leaf) =>
  leaf.node.issue.pullRequests.flatMap((pr) =>
    pr.ships && pr.mergedAt && pr.mergedAt.getTime() >= windowStart
      ? [{ x: x(pr.mergedAt.getTime()), tip: `${pr.label} merged` }]
      : []
  )

// The headline
const openDays = $derived(summary?.start ? ((summary.end?.getTime() ?? now) - summary.start.getTime()) / DAY : 0)
const periodDays = $derived((now - windowStart - DAY) / DAY)
const rates = $derived.by(() => {
  const since = windowStart + DAY
  const added = leaves.filter((leaf) => leaf.progress.added.getTime() > since).length
  const finished = leaves.filter((leaf) => (leaf.progress.finished?.getTime() ?? 0) > since).length
  return { added: added / periodDays, finished: finished / periodDays }
})
const growing = $derived(
  summary !== undefined &&
    summary.group !== 'finished' &&
    summary.total - scope.atStart >= 5 &&
    summary.total >= scope.atStart * 1.5
)
const oldestAging = $derived(
  leaves.filter((leaf) => leaf.aging).sort((a, b) => time(a.progress.started) - time(b.progress.started))[0]
)
const movedIn = $derived(leaves.find((leaf) => (leaf.progress.started?.getTime() ?? now) < windowStart))
const mergedPrs = $derived(
  leaves.reduce((n, leaf) => n + leaf.node.issue.pullRequests.filter((pr) => pr.ships && pr.mergedAt).length, 0)
)
const perDay = (n: number) => (n >= 1 ? String(Math.round(n)) : n.toFixed(1))

const listHref = $derived(`${page.url.pathname.replace(/\/[^/]+$/, '')}${page.url.search}`)
const fills: Record<Bar['kind'], string> = {
  waiting: 'border border-dashed border-gray-400 bg-gray-50',
  active: 'bg-indigo-600',
  aging: 'bg-amber-500',
  finished: 'bg-indigo-200',
}
</script>

{#if !node || !summary}
  <p class="mt-6 text-4xl font-semibold leading-tight tracking-tight text-gray-900">No top-level item called {identifier}.</p>
  <p class="mt-3.5 text-base text-gray-600"><a href={listHref} class="text-indigo-600 hover:text-indigo-800">Back to the timeline</a></p>
{:else}
  {@const issue = node.issue}
  <div class="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
    <a href={listHref} class="text-gray-500 hover:text-gray-700">Timeline</a>
    <span aria-hidden="true" class="text-gray-400">/</span>
    <span class="font-mono text-[13px] font-semibold text-indigo-600">{issue.identifier}</span>
    <span class="text-xs"><StateName name={issue.linearState} /></span>
    <a href={issue.workItem.name} target="_blank" rel="noreferrer" class="ml-auto text-indigo-600 hover:text-indigo-800">Open in Linear</a>
  </div>
  <h2 class="mt-2 text-xl font-semibold leading-snug text-gray-900">{issue.title}</h2>

  <p class="mt-7 max-w-[24em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    {#if summary.group === 'finished'}
      {issue.identifier} finished in {formatDuration(openDays)}.
    {:else if growing}
      {issue.identifier} grew from {scope.atStart} to {summary.total} sub-issues in {formatDuration(openDays)}.{#if rates.added > rates.finished}{' '}You’re adding them faster than you finish them.{/if}
    {:else if summary.aging > 0}
      {issue.identifier} has {plural(summary.aging, 'sub-issue', 'sub-issues')} taking longer than usual.
    {:else}
      {issue.identifier}: {summary.finished} of {summary.total} sub-issues finished.
    {/if}
  </p>
  <p class="mt-3.5 max-w-[66ch] text-base leading-normal text-gray-600">
    {#if summary.group !== 'finished' && periodDays >= 1}
      Since {formatDate(new Date(windowStart + DAY))} the team finished about {perDay(rates.finished)} sub-issues a day and added about
      {perDay(rates.added)}.
    {/if}
    {#if summary.waiting > 0 && growing}
      The {summary.waiting} that are waiting are the decision to make: which of them belong in this item, and which are a follow-up?
    {:else if summary.waiting > 0}
      {plural(summary.waiting, 'sub-issue is', 'sub-issues are')} waiting to start.
    {/if}
    {#if oldestAging}
      {oldestAging.node.issue.identifier} has been active for {formatDuration((now - time(oldestAging.progress.started)) / DAY)}, longer
      than 85% of your sub-issues take.
    {/if}
  </p>
  {#if behind.length > 0}
    <p class="mt-3.5 max-w-[66ch] text-base leading-normal text-gray-600">
      <span class="whitespace-nowrap rounded-full border border-orange-300 bg-orange-50 px-2 text-xs font-semibold text-orange-800"
        >{issue.linearState}, but work is open</span
      >
      {plural(behind.length, 'sub-issue was', 'sub-issues were')} still open when {issue.identifier} was closed, so {behind.length === 1
        ? 'it doesn’t'
        : 'they don’t'} count here:
      {#each behind as leaf, i}<a href={leaf.issue.workItem.name} target="_blank" rel="noreferrer" class="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800"
          >{leaf.issue.identifier}</a
        >{i < behind.length - 1 ? ', ' : ''}{/each}. Close {behind.length === 1 ? 'it' : 'them'}, or move {behind.length === 1
        ? 'it'
        : 'them'} to an item of {behind.length === 1 ? 'its' : 'their'} own.
    </p>
  {/if}

  <div class="mt-7 flex flex-wrap gap-x-10 gap-y-4 rounded-xl bg-white px-6 py-5 shadow-sm">
    <div class="flex min-w-[120px] flex-col gap-0.5">
      <span class="text-[13px] text-gray-600">In scope</span><span class="text-2xl font-semibold">{summary.total}</span>
      <span class="text-[13px] text-gray-600">{scope.atStart} on the first day</span>
    </div>
    <div class="flex min-w-[120px] flex-col gap-0.5">
      <span class="text-[13px] text-gray-600">Finished</span><span class="text-2xl font-semibold">{summary.finished}</span>
      <span class="text-[13px] text-gray-600">{plural(mergedPrs, 'PR', 'PRs')} merged</span>
    </div>
    <div class="flex min-w-[120px] flex-col gap-0.5">
      <span class="text-[13px] text-gray-600">Active</span><span class="text-2xl font-semibold">{summary.active}</span>
      {#if summary.aging > 0}
        <span><span class="whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2 text-xs font-semibold text-amber-800">{summary.aging} aging</span></span>
      {/if}
    </div>
    <div class="flex min-w-[120px] flex-col gap-0.5">
      <span class="text-[13px] text-gray-600">Waiting</span><span class="text-2xl font-semibold">{summary.waiting}</span>
      <span class="text-[13px] text-gray-600">not started</span>
    </div>
    <div class="flex min-w-[120px] flex-col gap-0.5">
      <span class="text-[13px] text-gray-600">{summary.group === 'finished' ? 'Took' : 'Open for'}</span>
      <span class="text-2xl font-semibold">{formatDuration(openDays)}</span>
      {#if movedIn}
        <span class="text-[13px] text-gray-600">{movedIn.node.issue.identifier} started {formatDate(movedIn.progress.started as Date)}, before {issue.identifier} existed</span>
      {/if}
    </div>
  </div>

  <section class="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-gray-200 px-6 py-4 text-[13px] text-gray-600">
      <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-7 rounded-full border border-dashed border-gray-400 bg-gray-50"></span>Waiting, from when it was added</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-7 rounded-full bg-indigo-600"></span>Active</span>
      {#if limit !== undefined}
        <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-7 rounded-full bg-amber-500"></span>Active longer than 85% of sub-issues ({formatDuration(limit)})</span>
      {/if}
      <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-7 rounded-full bg-indigo-200"></span>Finished</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded-full border-2 border-white bg-orange-600 ring-1 ring-orange-600"></span>PR merged</span>
    </div>

    <div class="overflow-x-auto">
      <div class="timeline relative" style="width: calc(var(--left) + {trackWidth}px)">
        <div aria-hidden="true" class="pointer-events-none absolute inset-y-0" style="left: var(--left); width: {trackWidth}px">
          {#each ticks as tick}
            <div class="absolute inset-y-0 border-l {tick.major ? 'border-gray-200' : 'border-gray-100'}" style="left: {tick.x}px"></div>
          {/each}
          {#if summary.group !== 'finished'}
            <div class="absolute inset-y-0 border-l-2 border-gray-900" style="left: {x(now)}px"></div>
          {/if}
        </div>

        <div class="flex h-11 border-b border-gray-200">
          <div class="sticky left-0 z-20 flex flex-none items-center border-r border-gray-200 bg-white px-4 text-[13px] font-semibold text-gray-600" style="width: var(--left)">
            Sub-issue
          </div>
          <div class="relative z-10 flex-none" style="width: {trackWidth}px">
            {#each ticks as tick}
              <span class="absolute top-3.5 whitespace-nowrap text-xs {tick.major ? 'font-semibold text-gray-900' : 'text-gray-500'}" style="left: {tick.x + 6}px">{tick.label}</span>
            {/each}
            {#if summary.group !== 'finished'}
              <span class="absolute top-3 bg-white px-1 text-xs font-bold text-gray-900" style="left: {x(now) - 22}px">Today</span>
            {/if}
          </div>
        </div>

        <div class="flex border-b border-gray-200">
          <div class="sticky left-0 z-20 flex flex-none flex-col gap-1.5 border-r border-gray-200 bg-white px-4 py-4" style="width: var(--left)">
            <span class="text-[13px] font-semibold text-gray-600">Scope</span>
            <span class="text-[15px] leading-snug text-gray-900">Sub-issues added vs. finished. The gap between the lines is what’s still open.</span>
          </div>
          <div class="relative z-10 flex-none" style="width: {trackWidth}px">
            <svg width={trackWidth} height={scopeHeight} class="block" role="img" aria-label="{summary.total} sub-issues in scope, {summary.finished} finished">
              {#each scope.grid as line}
                <line x1="0" x2={trackWidth} y1={line.y} y2={line.y} stroke="#f3f4f6" />
                <text x="6" y={line.y - 4} font-size="11" fill="#6b7280">{line.label}</text>
              {/each}
              <path d={scope.scopeArea} fill="#f3f4f6" />
              <path d={scope.doneArea} fill="#c7d2fe" />
              <path d={scope.doneLine} fill="none" stroke="#4f46e5" stroke-width="2" />
              <path d={scope.scopeLine} fill="none" stroke="#374151" stroke-width="2" />
              <text x={scope.labelX} y={scope.scopeY + 4} font-size="12" font-weight="600" fill="#111827">{summary.total} in scope</text>
              {#if scope.doneY - scope.scopeY > 28}
                <text x={scope.labelX} y={(scope.scopeY + scope.doneY) / 2 + 4} font-size="12" fill="#4b5563">{summary.total - summary.finished} open</text>
              {/if}
              {#if scope.doneY - scope.scopeY > 14}
                <text x={scope.labelX} y={scope.doneY + 4} font-size="12" font-weight="600" fill="#3730a3">{summary.finished} finished</text>
              {/if}
            </svg>
          </div>
        </div>

        {#each groups as group (group.key)}
          {@const count = leaves.filter((leaf) => leaf.progress.status === group.key).length}
          {#if count > 0}
            <div class="flex border-b border-gray-200 bg-gray-50">
              <div class="sticky left-0 z-20 flex-none border-r border-gray-200 bg-gray-50" style="width: var(--left)">
                <button
                  type="button"
                  aria-expanded={open[group.key]}
                  onclick={() => (open[group.key] = !open[group.key])}
                  class="flex h-11 w-full cursor-pointer items-center gap-2 px-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" class="flex-none transition-transform {open[group.key] ? 'rotate-90' : ''}"
                    ><path d="M5 3l4 4-4 4" fill="none" stroke="#4b5563" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg
                  >
                  <span class="text-sm font-semibold text-gray-900">{group.label}</span>
                  <span class="text-sm text-gray-600">{count}</span>
                  <span class="ml-auto hidden text-xs text-gray-500 sm:inline">{group.hint}</span>
                </button>
              </div>
              <div class="relative z-10 h-11 flex-none" style="width: {trackWidth}px">
                {#if !open[group.key]}
                  {#each marks(group.key) as mark}
                    <span
                      class="absolute top-[18px] h-2 w-2 rounded-full {group.key === 'finished' ? 'bg-indigo-400' : group.key === 'active' ? 'bg-indigo-600' : 'bg-gray-400'}"
                      style="left: {mark.x - 4}px"
                      title={mark.tip}
                    ></span>
                  {/each}
                {/if}
              </div>
            </div>
            {#if open[group.key]}
              {#each group.rows as row}
                <div class="flex h-[38px] border-b border-gray-100">
                  {#if row.kind === 'parent'}
                    <div class="sticky left-0 z-20 flex flex-none items-center gap-2.5 border-r border-gray-200 bg-white px-4 text-[13px]" style="width: var(--left)">
                      <a href={row.node.issue.workItem.name} target="_blank" rel="noreferrer" class="flex-none font-mono font-semibold text-gray-500 hover:text-gray-700">{row.node.issue.identifier}</a>
                      <span class="min-w-0 flex-1 truncate text-gray-600" title={row.node.issue.title}>{row.node.issue.title}</span>
                      {#if row.drift}
                        <span class="whitespace-nowrap rounded-full border border-orange-300 bg-orange-50 px-2 text-xs font-semibold text-orange-800">{row.drift}</span>
                      {:else}
                        <span class="whitespace-nowrap text-xs text-gray-500">{row.finished} of {row.total} finished</span>
                      {/if}
                    </div>
                    <div class="relative z-10 flex-none" style="width: {trackWidth}px"></div>
                  {:else}
                    {@const leaf = row.leaf}
                    <div
                      class="sticky left-0 z-20 flex flex-none items-center gap-2.5 border-r border-gray-200 bg-white pr-4 text-sm"
                      style="width: var(--left); padding-left: {16 + row.depth * 22}px"
                    >
                      <a href={leaf.node.issue.workItem.name} target="_blank" rel="noreferrer" class="flex-none font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800">{leaf.node.issue.identifier}</a>
                      <span class="min-w-0 flex-1 truncate text-gray-900" title={leaf.node.issue.title}>{leaf.node.issue.title}</span>
                      {#if leaf.aging}
                        <span class="hidden whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2 text-xs font-semibold text-amber-800 sm:inline">{age(leaf)}</span>
                      {:else}
                        <span class="hidden whitespace-nowrap text-xs text-gray-500 sm:inline">{age(leaf)}</span>
                      {/if}
                      <span class="hidden flex-none text-xs sm:inline"><StateName name={leaf.node.issue.linearState} /></span>
                    </div>
                    <div class="relative z-10 flex-none" style="width: {trackWidth}px">
                      {#each bars(leaf) as bar}
                        <span class="absolute top-[13px] box-border h-3 rounded-full {fills[bar.kind]}" style="left: {bar.left}px; width: {bar.width}px" title={bar.tip}></span>
                      {/each}
                      {#each mergeDots(leaf) as dot}
                        <span class="absolute top-[13px] box-border h-3 w-3 rounded-full border-2 border-white bg-orange-600" style="left: {dot.x - 6}px" title={dot.tip}></span>
                      {/each}
                      {#if leaf.progress.added.getTime() < windowStart}
                        <span class="absolute left-1.5 top-2.5 whitespace-nowrap rounded-full border border-indigo-300 bg-white px-1.5 text-[11px] font-semibold text-indigo-800"
                          >◂ since {formatDate(leaf.progress.started ?? leaf.progress.added)}</span
                        >
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          {/if}
        {/each}
      </div>
    </div>
  </section>

  <p class="mt-6 max-w-[70ch] text-[13px] leading-normal text-gray-500">
    <RangeExplanation queue={stages[range.from]} finish={stages[range.to]} /> A sub-issue is added when it’s created, and finishes when
    its last closing PR merges to main, or when Linear marks it done, whichever is first. Waiting sub-issues are oldest first: the
    longer something has waited, the less likely it belongs in this item.
  </p>
{/if}

<style>
.timeline {
  --left: 240px;
}
@media (min-width: 640px) {
  .timeline {
    --left: 460px;
  }
}
</style>
