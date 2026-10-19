<script lang="ts">
import AgingChart, { type AgingColumn, type AgingDot } from '$lib/components/AgingChart.svelte'
import ChartCoachNote from '$lib/components/ChartCoachNote.svelte'
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import ScaleToggle from '$lib/components/ScaleToggle.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import StateName from '$lib/components/StateName.svelte'
import { formatDuration, issueIdentifier } from '$lib/format'
import { getStageRange } from '$lib/stageRange.svelte'
import { type StagePace, zones } from '$lib/zones'
import { zoneIndex } from '$lib/zones'
import { calculateCycleTimes, calculateStageExitAges, calculateWorkItemAges, percentile } from '@oselvar/core'
import type { LinearWorkItem } from '@oselvar/linear'

const { issues, stages }: { issues: readonly LinearWorkItem[]; stages: readonly string[] } = $props()

const range = getStageRange()
let log = $state(false)
const now = new Date()

// Where work waits, and the first stage where it is active
const queueName = $derived(stages[range.from])
const fromName = $derived(stages[range.from + 1])
const toName = $derived(stages[range.to])
const workItems = $derived(issues.map((issue) => issue.workItem))

// How long finished issues took, for the percentile lines
const finishedDays = $derived(
  calculateCycleTimes(workItems, stages, fromName, toName).map((item) => item.cycleTimeDays)
)
const p50 = $derived(percentile(finishedDays, 50) ?? 0)
const p85 = $derived(percentile(finishedDays, 85) ?? 0)
const p95 = $derived(percentile(finishedDays, 95) ?? 0)
const percentiles = $derived(
  finishedDays.length === 0
    ? []
    : [
        { percentile: 50, days: p50, emphasis: false },
        { percentile: 85, days: p85, emphasis: true },
        { percentile: 95, days: p95, emphasis: false },
      ]
)

// How old past issues were when they left each stage, for the zones
const paces = $derived(
  new Map(
    [...calculateStageExitAges(workItems, stages, fromName, toName)].map(
      ([stage, ages]): [string, StagePace | undefined] => [
        stage,
        ages.length === 0
          ? undefined
          : [percentile(ages, 50) ?? 0, percentile(ages, 70) ?? 0, percentile(ages, 85) ?? 0],
      ]
    )
  )
)

const dots: AgingDot[] = $derived(
  calculateWorkItemAges(
    issues.map((issue) => ({ workItem: issue.workItem, currentStage: issue.currentState })),
    stages,
    fromName,
    toName,
    now
  )
    .map((item) => ({
      identifier: issueIdentifier(item.name ?? item.id),
      url: item.name ?? '',
      stage: item.stage,
      ageDays: item.ageDays,
      zone: zoneIndex(item.ageDays, paces.get(item.stage)),
    }))
    .sort((a, b) => b.ageDays - a.ageDays)
)

const columns: AgingColumn[] = $derived(
  stages.slice(range.from + 1, range.to).map((stage) => ({
    stage,
    count: dots.filter((dot) => dot.stage === stage).length,
    pace: paces.get(stage),
  }))
)

const overdue = $derived(finishedDays.length === 0 ? 0 : dots.filter((dot) => dot.ageDays > p85).length)
const waiting = $derived(issues.filter((issue) => issue.currentState === queueName).length)
const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)
</script>

{#if dots.length === 0}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">No issues are active.</p>
  <p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
    <RangeExplanation queue={queueName} finish={toName} />
    {plural(waiting, 'issue is', 'issues are')} waiting in <StateName name={queueName} />.
  </p>
{:else if finishedDays.length === 0}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    {plural(dots.length, 'issue is', 'issues are')} active.
  </p>
  <p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
    None have finished yet, so there is nothing to compare their age with.
    <RangeExplanation queue={queueName} finish={toName} />
  </p>
{:else}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    {#if overdue === 0}
      No active issue is older than 85% of finished work.
    {:else}
      {plural(overdue, 'issue has', 'issues have')} been active longer than 85% of finished issues took.
    {/if}
  </p>
  <p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
    {plural(dots.length, 'issue is', 'issues are')} active. 85% of finished issues took
    {formatDuration(p85)} or less{overdue > 0 ? `, so ${overdue === 1 ? 'that one is' : 'those are'} the first to look at` : ''}.
    <RangeExplanation queue={queueName} finish={toName} />
    {plural(waiting, 'issue is', 'issues are')} waiting in <StateName name={queueName} /> and {waiting === 1 ? "isn't" : "aren't"}
    shown.
  </p>
{/if}

<ChartCoachNote {issues} chart="aging" />

<section class="mt-8 rounded-xl bg-white px-4 pb-5 pt-6 shadow-sm sm:px-6">
  <StageRange {stages} bind:from={range.from} bind:to={range.to} />

  <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-600">
      <span>Compared with finished issues at the same stage:</span>
      {#each zones as zone}
        <span class="inline-flex items-center gap-1.5">
          <span class="size-3 rounded-[3px] border" style:background={zone.swatch} style:border-color={zone.edge}></span>{zone.label}
        </span>
      {/each}
    </div>
    <ScaleToggle bind:log />
  </div>

  {#if dots.length > 0}
    <div class="mt-3">
      <AgingChart {columns} {dots} {percentiles} {log} {fromName} calloutAbove={finishedDays.length > 0 ? p85 : Infinity} />
    </div>
  {/if}
</section>

{#if dots.length > 0}
  <section class="mt-6">
    <h2 class="text-lg font-semibold text-gray-900">Oldest first</h2>
    <p class="mt-1 text-sm text-gray-600">
      Every active issue, with how it compares to finished issues at the same stage.
    </p>
    <div class="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="text-left text-gray-500">
            <th class="px-4 py-2.5 font-medium">Issue</th>
            <th class="px-4 py-2.5 font-medium">Stage</th>
            <th class="px-4 py-2.5 text-right font-medium">Age</th>
            <th class="px-4 py-2.5 font-medium">Pace</th>
          </tr>
        </thead>
        <tbody>
          {#each dots as dot}
            <tr class="border-t border-gray-100">
              <td class="px-4 py-2">
                <a href={dot.url} target="_blank" rel="noopener" class="text-indigo-600 hover:text-indigo-800">
                  {dot.identifier}
                </a>
              </td>
              <td class="px-4 py-2 text-gray-600"><StateName name={dot.stage} /></td>
              <td class="px-4 py-2 text-right tabular-nums">{formatDuration(dot.ageDays)}</td>
              <td class="px-4 py-2 text-gray-700">
                <span class="inline-flex items-center gap-2">
                  <span
                    class="size-3 rounded-[3px] border"
                    style:background={zones[dot.zone].swatch}
                    style:border-color={zones[dot.zone].edge}
                  ></span>{zones[dot.zone].label}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}
