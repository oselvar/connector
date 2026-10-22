<script lang="ts">
import { rollingColor } from '$lib/colors'
import StateName from '$lib/components/StateName.svelte'
import { formatDate, formatDuration, formatShortDuration } from '$lib/format'
import { MILLISECONDS_PER_DAY } from '@oselvar/core'
import { scaleLinear, scaleLog, scaleTime } from 'd3-scale'

export type ScatterPoint = {
  identifier: string
  url: string
  completionDate: Date
  cycleTimeDays: number
  /** The top-level item this is part of, if it is a sub-issue */
  group?: { id: string; label: string }
}

/** A finished top-level item, drawn when one of its leaves is hovered */
export type GroupMarker = {
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
  rolling,
  log,
  fromName,
  toName,
  markers = new Map(),
}: {
  points: readonly ScatterPoint[]
  /** Finished top-level items by id, to join their leaves to */
  markers?: ReadonlyMap<string, GroupMarker>
  percentiles: readonly PercentileLine[]
  /** A rolling percentile, one point per day; missing days break the line */
  rolling: readonly { date: Date; value: number }[]
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

// Lift the pen over days the rolling percentile leaves out
const rollingPath = $derived.by(() => {
  const lastDate = points[points.length - 1].completionDate.getTime()
  let path = ''
  let previous: number | null = null
  for (const { date, value } of rolling) {
    if (date.getTime() > lastDate) break
    const day = Math.round(date.getTime() / MILLISECONDS_PER_DAY)
    path += `${previous === day - 1 ? 'L' : 'M'}${x(date)},${y(value)}`
    previous = day
  }
  return path
})

let hovered = $state<number | null>(null)
const hoveredPoint = $derived(hovered === null ? null : points[hovered])
// The hovered point's siblings: the other leaves of the same top-level item
const group = $derived(hoveredPoint?.group?.id)
const inGroup = (i: number) => group !== undefined && points[i].group?.id === group
const siblings = $derived(group === undefined ? 0 : points.filter((p) => p.group?.id === group).length)
const marker = $derived.by(() => {
  const found = group === undefined ? undefined : markers.get(group)
  if (!found) return undefined
  // Keep it on the chart even if the whole item took longer than any of its leaves
  const cy = Math.max(margin.top, Math.min(height - margin.bottom, y(Math.max(found.cycleTimeDays, y.domain()[0]))))
  return { cx: x(found.completionDate), cy, days: found.cycleTimeDays }
})

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
    aria-label="Scatter plot of {points.length} issues: days from starting to finishing against the date they reached {toName}"
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

    <path d={rollingPath} fill="none" stroke={rollingColor} stroke-width="2" stroke-linejoin="round" />

    {#if marker}
      {#each dots as dot, i}
        {#if inGroup(i)}
          <line x1={dot.cx} y1={dot.cy} x2={marker.cx} y2={marker.cy} stroke="#ea580c" stroke-width="1.25" stroke-dasharray="3 3" />
        {/if}
      {/each}
    {/if}

    {#each dots as dot, i}
      {@const related = inGroup(i)}
      <circle
        cx={dot.cx}
        cy={dot.cy}
        r={i === hovered ? 6.5 : related ? 5.5 : 4}
        class="fill-indigo-600"
        fill-opacity={group !== undefined && !related ? 0.2 : 1}
        stroke={related ? '#ea580c' : 'white'}
        stroke-width="2"
      />
    {/each}

    {#if marker}
      <path
        d="M{marker.cx} {marker.cy - 9}L{marker.cx + 9} {marker.cy}L{marker.cx} {marker.cy + 9}L{marker.cx - 9} {marker.cy}Z"
        fill="white"
        stroke="#ea580c"
        stroke-width="2"
      />
    {/if}
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
      <div class="mt-0.5 text-gray-700">{formatDuration(hoveredPoint.cycleTimeDays)} from start to finish</div>
      <div class="mt-0.5 text-gray-500">Reached <StateName name={toName} /> {formatDate(hoveredPoint.completionDate)}</div>
      {#if hoveredPoint.group}
        <div class="mt-1.5 text-gray-700">Part of {hoveredPoint.group.label}</div>
        <div class="mt-0.5 text-gray-500">
          {siblings === 1 ? 'Its only finished leaf here' : `${siblings} of its leaves are here, ringed`}
          {#if marker}· the whole item took {formatDuration(marker.days)} (diamond){/if}
        </div>
      {/if}
      <div class="mt-1.5 text-indigo-600">Click to open in Linear</div>
    </div>
  {/if}
</div>
