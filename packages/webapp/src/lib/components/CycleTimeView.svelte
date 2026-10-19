<script lang="ts">
import { rollingColor } from '$lib/colors'
import ChartCoachNote from '$lib/components/ChartCoachNote.svelte'
import CycleTimeScatter, { type ScatterPoint } from '$lib/components/CycleTimeScatter.svelte'
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import ScaleToggle from '$lib/components/ScaleToggle.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import StateName from '$lib/components/StateName.svelte'
import { formatDate, formatDuration, formatMonth, issueIdentifier } from '$lib/format'
import { getStageRange } from '$lib/stageRange.svelte'
import { type WorkItem, calculateCycleTimes, percentile, rollingPercentile } from '@oselvar/core'
import type { LinearWorkItem } from '@oselvar/linear'

const {
  items,
  issues,
  stages,
}: {
  items: readonly WorkItem<string>[]
  /** The same issues, with who they are assigned to, for the coach */
  issues: readonly LinearWorkItem[]
  stages: readonly string[]
} = $props()

const range = getStageRange()
let log = $state(false)

// Where work waits, and the first stage where it is active
const queueName = $derived(stages[range.from])
const fromName = $derived(stages[range.from + 1])
const toName = $derived(stages[range.to])

const points: ScatterPoint[] = $derived(
  calculateCycleTimes(items, stages, fromName, toName)
    .map((item) => ({
      identifier: issueIdentifier(item.name ?? item.id),
      url: item.name ?? '',
      completionDate: item.completionDate,
      cycleTimeDays: item.cycleTimeDays,
    }))
    .sort((a, b) => a.completionDate.getTime() - b.completionDate.getTime())
)

const days = $derived(points.map((p) => p.cycleTimeDays))
const p50 = $derived(percentile(days, 50) ?? 0)
const p85 = $derived(percentile(days, 85) ?? 0)
const p95 = $derived(percentile(days, 95) ?? 0)
// The trend: 85th percentile of the issues that finished in the previous 30 days
const rolling = $derived(
  rollingPercentile(
    points.map((p) => ({ date: p.completionDate, value: p.cycleTimeDays })),
    85,
    30,
    5
  )
)

const percentiles = $derived([
  { percentile: 50, days: p50, emphasis: false },
  { percentile: 85, days: p85, emphasis: true },
  { percentile: 95, days: p95, emphasis: false },
])

const slowestFirst = $derived([...points].sort((a, b) => b.cycleTimeDays - a.cycleTimeDays))
</script>

{#if points.length > 0}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    85% of issues finished within {formatDuration(p85)} of starting.
  </p>
  <p class="mt-3.5 max-w-[60ch] text-base leading-normal text-gray-600">
    Based on {points.length}
    {points.length === 1 ? 'issue' : 'issues'} that reached <StateName name={toName} /> between {formatMonth(points[0].completionDate)}
    and {formatMonth(points[points.length - 1].completionDate)}. Half took {formatDuration(p50)} or less, and 1 in 20 took
    longer than {formatDuration(p95)}. <RangeExplanation queue={queueName} finish={toName} />
  </p>
{:else}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    No issues have started and finished yet.
  </p>
  <p class="mt-3.5 text-base text-gray-600">
    <RangeExplanation queue={queueName} finish={toName} /> Move the handles, or wait for more issues to finish.
  </p>
{/if}

<ChartCoachNote {issues} chart="cycle-time" />

<section class="mt-8 rounded-xl bg-white px-4 pb-5 pt-6 shadow-sm sm:px-6">
  <StageRange {stages} bind:from={range.from} bind:to={range.to} />

  <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
    <div>
      <p class="text-sm text-gray-600">Days from starting to finishing, by the date each issue reached <StateName name={toName} /></p>
      <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-600">
        <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-indigo-600"></span>An issue</span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-0.5 w-4 rounded-full" style:background={rollingColor}></span>85% of issues finished in the previous 30 days
          took this long or less
        </span>
      </div>
    </div>
    <ScaleToggle bind:log />
  </div>

  {#if points.length > 0}
    <div class="mt-3">
      <CycleTimeScatter {points} {percentiles} {rolling} {log} {fromName} {toName} />
    </div>
  {/if}
</section>

{#if points.length > 0}
  <details class="mt-4 text-sm text-gray-600">
    <summary class="cursor-pointer py-2">Show these issues as a table</summary>
    <div class="mt-2 max-h-80 overflow-auto rounded-xl bg-white">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="text-left text-gray-500">
            <th class="px-4 py-2.5 font-medium">Issue</th>
            <th class="px-4 py-2.5 font-medium">Reached <StateName name={toName} /></th>
            <th class="px-4 py-2.5 text-right font-medium">Days</th>
          </tr>
        </thead>
        <tbody>
          {#each slowestFirst as point}
            <tr class="border-t border-gray-100">
              <td class="px-4 py-2">
                <a href={point.url} target="_blank" rel="noopener" class="text-indigo-600 hover:text-indigo-800">
                  {point.identifier}
                </a>
              </td>
              <td class="px-4 py-2">{formatDate(point.completionDate)}</td>
              <td class="px-4 py-2 text-right tabular-nums">
                {point.cycleTimeDays < 10 ? point.cycleTimeDays.toFixed(1) : Math.round(point.cycleTimeDays)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
{/if}
