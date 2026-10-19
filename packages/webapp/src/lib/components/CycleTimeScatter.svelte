<script lang="ts">
import { formatDate, formatDuration, formatShortDuration } from '$lib/format'
import { scaleLinear, scaleLog, scaleTime } from 'd3-scale'

export type ScatterPoint = {
  identifier: string
  url: string
  completionDate: Date
  cycleTimeDays: number
}

export type PercentileLine = {
  percentile: number
  days: number
  emphasis: boolean
}

const {
  points,
  percentiles,
  log,
  fromName,
  toName,
}: {
  points: readonly ScatterPoint[]
  percentiles: readonly PercentileLine[]
  log: boolean
  fromName: string
  toName: string
} = $props()

const height = 440
const margin = { top: 16, right: 92, bottom: 32, left: 52 }
// Points within this distance of the pointer can be hovered, so small dots are easy to hit
const hitRadius = 24

let width = $state(800)

const x = $derived.by(() => {
  const times = points.map((p) => p.completionDate.getTime())
  return scaleTime()
    .domain([new Date(Math.min(...times)), new Date(Math.max(...times))])
    .range([margin.left, width - margin.right])
})

const y = $derived.by(() => {
  const days = points.map((p) => p.cycleTimeDays)
  const range = [height - margin.bottom, margin.top]
  return log
    ? scaleLog()
        .domain([Math.min(...days), Math.max(...days)])
        .range(range)
        .nice()
    : scaleLinear()
        .domain([0, Math.max(...days)])
        .range(range)
        .nice()
})

const xTicks = $derived(x.ticks(Math.max(2, Math.floor(width / 110))))
const xTickFormat = $derived(x.tickFormat())
const yTicks = $derived(log ? y.ticks().filter((t) => Number.isInteger(Math.log10(t))) : y.ticks(5))

const dots = $derived(points.map((p) => ({ cx: x(p.completionDate), cy: y(p.cycleTimeDays) })))

let hovered = $state<number | null>(null)
const hoveredPoint = $derived(hovered === null ? null : points[hovered])

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const px = event.clientX - rect.left
  const py = event.clientY - rect.top
  let nearest: number | null = null
  let nearestDistance = hitRadius
  dots.forEach((dot, i) => {
    const distance = Math.hypot(dot.cx - px, dot.cy - py)
    if (distance <= nearestDistance) {
      nearest = i
      nearestDistance = distance
    }
  })
  hovered = nearest
}

function onClick() {
  if (hoveredPoint) window.open(hoveredPoint.url, '_blank', 'noopener')
}
</script>

<div class="relative" bind:clientWidth={width}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <svg
    {width}
    {height}
    class="block {hoveredPoint ? 'cursor-pointer' : ''}"
    role="img"
    aria-label="Scatter plot of {points.length} issues: days from {fromName} to {toName} against the date they reached {toName}"
    onpointermove={onPointerMove}
    onpointerleave={() => (hovered = null)}
    onclick={onClick}
  >
    {#each yTicks as tick}
      <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} class="stroke-gray-100" />
      <text x={margin.left - 8} y={y(tick)} dy="0.32em" text-anchor="end" class="fill-gray-500 text-xs">
        {formatShortDuration(tick)}
      </text>
    {/each}
    <line
      x1={margin.left}
      x2={width - margin.right}
      y1={height - margin.bottom}
      y2={height - margin.bottom}
      class="stroke-gray-300"
    />
    {#each xTicks as tick}
      <text x={x(tick)} y={height - 10} text-anchor="middle" class="fill-gray-500 text-xs">{xTickFormat(tick)}</text>
    {/each}

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

    {#each dots as dot, i}
      <circle cx={dot.cx} cy={dot.cy} r={i === hovered ? 6.5 : 4} class="fill-indigo-600 stroke-white" stroke-width="2" />
    {/each}
  </svg>

  {#if hoveredPoint && hovered !== null}
    {@const dot = dots[hovered]}
    {@const flip = dot.cx > width * 0.7}
    <div
      class="pointer-events-none absolute whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] leading-snug shadow-lg"
      style:left="{dot.cx}px"
      style:top="{dot.cy}px"
      style:transform="translate({flip ? 'calc(-100% - 14px)' : '14px'}, -50%)"
    >
      <div class="font-semibold text-gray-900">{hoveredPoint.identifier}</div>
      <div class="mt-0.5 text-gray-700">{formatDuration(hoveredPoint.cycleTimeDays)} from {fromName}</div>
      <div class="mt-0.5 text-gray-500">Reached {toName} {formatDate(hoveredPoint.completionDate)}</div>
      <div class="mt-1.5 text-indigo-600">Click to open in Linear</div>
    </div>
  {/if}
</div>
