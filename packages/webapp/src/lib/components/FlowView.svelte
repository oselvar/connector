<script lang="ts">
import ChartCoachNote from '$lib/components/ChartCoachNote.svelte'
import CumulativeFlowChart, { type FlowBand } from '$lib/components/CumulativeFlowChart.svelte'
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import StateName from '$lib/components/StateName.svelte'
import { getStageRange } from '$lib/stageRange.svelte'
import { type WorkItem, calculateCumulativeFlow } from '@oselvar/core'
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
let hoveredStage = $state<string | null>(null)
const now = new Date()

// Where work waits
const queueName = $derived(stages[range.from])
const toName = $derived(stages[range.to])
// One line per stage from the queue to the finish: the queue's band shows work waiting
const flow = $derived(calculateCumulativeFlow(items, stages, queueName, toName, now))

// One sequential hue for the stages in progress, lighter to darker in workflow order; Done is neutral.
// Plain colors rather than Tailwind classes, since these are picked at runtime.
const ramp = [
  { color: '#c7d2fe' },
  { color: '#a5b4fc' },
  { color: '#818cf8' },
  { color: '#6366f1' },
  { color: '#4f46e5' },
]
const doneColors = { color: '#e5e7eb' }
const waitingColors = { color: '#e0e7ff' }

const bands: FlowBand[] = $derived.by(() => {
  if (!flow) return []
  const lines = flow.lines
  const active = lines.length - 2
  return [
    { stage: queueName, upper: lines[0].counts, lower: lines[1].counts, ...waitingColors },
    ...lines.slice(1, -1).map((line, i) => ({
      stage: line.stage,
      upper: line.counts,
      lower: lines[i + 2].counts,
      ...(active === 1 ? ramp[3] : ramp[Math.round((i / (active - 1)) * (ramp.length - 1))]),
    })),
    { stage: toName, upper: lines[lines.length - 1].counts, lower: null, ...doneColors },
  ]
})

// Is work starting faster than it finishes, over the last 30 days?
const summary = $derived.by(() => {
  if (!flow) return undefined
  const arrivals = flow.lines[1].counts
  const departures = flow.lines[flow.lines.length - 1].counts
  const last = arrivals.length - 1
  const days = Math.min(30, last)
  const started = arrivals[last] - arrivals[last - days]
  const finished = departures[last] - departures[last - days]
  return {
    started,
    finished,
    days,
    wipNow: arrivals[last] - departures[last],
    wipThen: arrivals[last - days] - departures[last - days],
  }
})
const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)
</script>

{#if summary}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    {#if summary.started > summary.finished * 1.1}
      More work is starting than finishing.
    {:else if summary.finished > summary.started * 1.1}
      Work is finishing faster than it starts.
    {:else}
      Work is starting and finishing at about the same rate.
    {/if}
  </p>
  <p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
    In the last {summary.days} days, {plural(summary.started, 'issue', 'issues')} started and
    {summary.finished} finished. {summary.wipNow} {summary.wipNow === 1 ? 'is' : 'are'} active now,
    {summary.wipNow === summary.wipThen
      ? 'the same as'
      : `${summary.wipNow > summary.wipThen ? 'up' : 'down'} from ${summary.wipThen}`}
    {summary.days} days ago. <RangeExplanation queue={queueName} finish={toName} />
  </p>
{:else}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    No issues have reached <StateName name={queueName} /> yet.
  </p>
  <p class="mt-3.5 text-base text-gray-600">Move the left handle to an earlier stage.</p>
{/if}

<ChartCoachNote {issues} chart="flow" />

<section class="mt-8 rounded-xl bg-white px-4 pb-5 pt-6 shadow-sm sm:px-6">
  <StageRange {stages} bind:from={range.from} bind:to={range.to} />

  <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-600">
      {#each bands as band}
        <span
          class="inline-flex items-center gap-1.5 transition-opacity duration-100 motion-reduce:transition-none {hoveredStage ===
          band.stage
            ? 'font-semibold text-gray-900'
            : ''}"
          class:opacity-40={hoveredStage !== null && hoveredStage !== band.stage}
        >
          <span class="size-3 rounded-[3px]" style:background={band.color}></span>{band.stage}
        </span>
      {/each}
    </div>
    <p class="text-[13px] text-gray-500">Hover the chart to see active work and time in process on any day</p>
  </div>

  {#if flow}
    <div class="mt-3">
      <CumulativeFlowChart start={flow.start} {bands} started={flow.lines[1].counts} {toName} bind:hoveredStage />
    </div>
  {/if}
</section>
