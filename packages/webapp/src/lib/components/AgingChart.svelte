<script lang="ts">
import type { PercentileLine } from '$lib/components/CycleTimeScatter.svelte'
import { formatDuration, formatShortDuration } from '$lib/format'
import { type StagePace, zoneSentence, zones } from '$lib/zones'
import { scaleLinear, scaleLog } from 'd3-scale'

export type AgingColumn = {
  stage: string
  count: number
  pace: StagePace | undefined
}

export type AgingDot = {
  identifier: string
  url: string
  stage: string
  ageDays: number
  zone: number
}

const {
  columns,
  dots,
  percentiles,
  log,
  fromName,
  calloutAbove,
}: {
  columns: readonly AgingColumn[]
  /** Oldest first */
  dots: readonly AgingDot[]
  percentiles: readonly PercentileLine[]
  log: boolean
  fromName: string
  /** The oldest few dots older than this get their identifier written next to them */
  calloutAbove: number
} = $props()

const height = 460
const margin = { top: 56, right: 92, bottom: 32, left: 52 }
const hitRadius = 24
const maxCallouts = 5
// Never show less than this on a log scale, so issues that just started stay on the chart
const minLogDays = 1 / 24

let width = $state(800)

const columnWidth = $derived((width - margin.left - margin.right) / Math.max(columns.length, 1))
const columnX = (index: number) => margin.left + index * columnWidth

const y = $derived.by(() => {
  const values = [...dots.map((d) => d.ageDays), ...percentiles.map((p) => p.days)]
  const range = [height - margin.bottom, margin.top]
  return log
    ? scaleLog()
        .domain([Math.max(Math.min(...values), minLogDays), Math.max(...values, 1)])
        .range(range)
        .nice()
        .clamp(true)
    : scaleLinear()
        .domain([0, Math.max(...values, 1)])
        .range(range)
        .nice()
        .clamp(true)
})
const yTicks = $derived(log ? y.ticks().filter((t) => Number.isInteger(Math.log10(t))) : y.ticks(5))

// Spread dots across their column, the same way every time for the same issue
function spread(identifier: string): number {
  let hash = 0
  for (const char of identifier) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return 0.18 + (0.64 * ((hash >>> 0) % 1000)) / 1000
}

const placed = $derived(
  dots.map((dot) => {
    const column = columns.findIndex((c) => c.stage === dot.stage)
    return { cx: columnX(column) + columnWidth * spread(dot.identifier), cy: y(dot.ageDays) }
  })
)

let hovered = $state<number | null>(null)
const hoveredDot = $derived(hovered === null ? null : dots[hovered])

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const px = event.clientX - rect.left
  const py = event.clientY - rect.top
  let nearest: number | null = null
  let nearestDistance = hitRadius
  placed.forEach((dot, i) => {
    const distance = Math.hypot(dot.cx - px, dot.cy - py)
    if (distance <= nearestDistance) {
      nearest = i
      nearestDistance = distance
    }
  })
  hovered = nearest
}

function onClick() {
  if (hoveredDot) window.open(hoveredDot.url, '_blank', 'noopener')
}

const top = margin.top
const bottom = $derived(height - margin.bottom)
</script>

<div class="relative" bind:clientWidth={width}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <svg
    {width}
    {height}
    class="block {hoveredDot ? 'cursor-pointer' : ''}"
    role="img"
    aria-label="Aging chart of {dots.length} issues in progress, by stage and days since {fromName}"
    onpointermove={onPointerMove}
    onpointerleave={() => (hovered = null)}
    onclick={onClick}
  >
    {#each columns as column, i}
      {@const x = columnX(i)}
      {#if column.pace}
        {@const bands = [bottom, ...column.pace.map((days) => y(days)), top]}
        {#each zones as zone, z}
          <rect {x} y={bands[z + 1]} width={columnWidth} height={Math.max(0, bands[z] - bands[z + 1])} fill={zone.wash} />
        {/each}
      {/if}
      {#if i > 0}
        <line x1={x} x2={x} y1={top} y2={bottom} class="stroke-white" stroke-width="4" />
      {/if}
      <text x={x + columnWidth / 2} y="22" text-anchor="middle" class="fill-gray-900 text-sm font-semibold">
        {column.stage}
      </text>
      <text x={x + columnWidth / 2} y="40" text-anchor="middle" class="fill-gray-500 text-xs">
        {column.count === 1 ? '1 issue' : `${column.count} issues`}
      </text>
    {/each}

    {#each yTicks as tick}
      <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} class="stroke-gray-900/5" />
      <text x={margin.left - 8} y={y(tick)} dy="0.32em" text-anchor="end" class="fill-gray-500 text-xs">
        {formatShortDuration(tick)}
      </text>
    {/each}
    <line x1={margin.left} x2={width - margin.right} y1={bottom} y2={bottom} class="stroke-gray-300" />
    <text x={margin.left - 8} y={height - 10} text-anchor="end" class="fill-gray-500 text-xs">Age</text>

    {#each percentiles as line}
      <line
        x1={margin.left}
        x2={width - margin.right}
        y1={y(line.days)}
        y2={y(line.days)}
        class={line.emphasis ? 'stroke-gray-500' : 'stroke-gray-300'}
      />
      <text
        x={width - margin.right + 8}
        y={y(line.days)}
        dy="0.32em"
        class="text-xs {line.emphasis ? 'fill-gray-900 font-semibold' : 'fill-gray-500'}"
      >
        {line.percentile}%: {formatShortDuration(line.days)}
      </text>
    {/each}

    {#each placed as dot, i}
      <circle cx={dot.cx} cy={dot.cy} r={i === hovered ? 6.5 : 4} class="fill-indigo-600 stroke-white" stroke-width="2" />
    {/each}
    {#each dots.slice(0, maxCallouts) as dot, i}
      {#if dot.ageDays > calloutAbove}
        <text x={placed[i].cx + 9} y={placed[i].cy} dy="0.32em" class="fill-gray-900 text-xs font-semibold">
          {dot.identifier}
        </text>
      {/if}
    {/each}
  </svg>

  {#if hoveredDot && hovered !== null}
    {@const dot = placed[hovered]}
    {@const flip = dot.cx > width * 0.7}
    <div
      class="pointer-events-none absolute whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] leading-snug shadow-lg"
      style:left="{dot.cx}px"
      style:top="{dot.cy}px"
      style:transform="translate({flip ? 'calc(-100% - 14px)' : '14px'}, -50%)"
    >
      <div class="font-semibold text-gray-900">{hoveredDot.identifier}</div>
      <div class="mt-0.5 text-gray-700">
        {formatDuration(hoveredDot.ageDays)} since {fromName}, now in {hoveredDot.stage}
      </div>
      <div class="mt-0.5 text-gray-700">{zoneSentence(hoveredDot.zone, hoveredDot.stage)}</div>
      <div class="mt-1.5 text-indigo-600">Click to open in Linear</div>
    </div>
  {/if}
</div>
