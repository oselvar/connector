<script lang="ts">
import ChartCoachNote from '$lib/components/ChartCoachNote.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import ThroughputChart, { type ThroughputWeek } from '$lib/components/ThroughputChart.svelte'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { MILLISECONDS_PER_DAY, type WorkItem, finishedBetween, makeFlowTimeline, percentile } from '@oselvar/core'

const { items }: { items: readonly WorkItem<string>[] } = $props()

const team = getTeam()
const range = getStageRange()
const now = Date.now()
const WEEK = 7 * MILLISECONDS_PER_DAY

const fromName = $derived(team.stages[range.from])
const toName = $derived(team.stages[range.to])

// Weeks ending today, back to the week of the first finished issue
const weeks: ThroughputWeek[] = $derived.by(() => {
  const finished = finishedBetween(makeFlowTimeline(items, team.stages, fromName, toName), 0, now)
  if (finished.length === 0) return []
  const first = Math.min(...finished.map((f) => f.finished))
  const count = Math.ceil((now - first) / WEEK)
  return Array.from({ length: count }, (_, i) => {
    const start = now - (count - i) * WEEK
    const end = start + WEEK
    return {
      start: new Date(start),
      end: new Date(end - MILLISECONDS_PER_DAY),
      count: finished.filter((f) => f.finished >= start && f.finished < end).length,
    }
  })
})

const recent = $derived(weeks.slice(-8).map((w) => w.count))
const typical = $derived(percentile(recent, 50) ?? 0)
</script>

{#if weeks.length > 0}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    The team finishes about {typical}
    {typical === 1 ? 'issue' : 'issues'} a week.
  </p>
  <p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
    In the last {recent.length} weeks, between {Math.min(...recent)} and {Math.max(...recent)} issues reached {toName}
    each week, counting issues that started at {fromName} or later.
  </p>
{:else}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    No issues have reached {toName} yet.
  </p>
{/if}

<ChartCoachNote {items} chart="throughput" />

<section class="mt-8 rounded-xl bg-white px-4 pb-5 pt-6 shadow-sm sm:px-6">
  <StageRange stages={team.stages} bind:from={range.from} bind:to={range.to} />
  <p class="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">
    Issues that reached {toName} each week. Hover a bar to see the week.
  </p>
  {#if weeks.length > 0}
    <div class="mt-3"><ThroughputChart {weeks} {toName} /></div>
  {/if}
</section>
