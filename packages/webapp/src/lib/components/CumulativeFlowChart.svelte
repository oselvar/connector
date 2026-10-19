<script lang="ts">
import { formatDate, formatDuration } from '$lib/format'
import { MILLISECONDS_PER_DAY } from '@oselvar/core'
import { scaleLinear, scaleTime } from 'd3-scale'

export type FlowBand = {
  stage: string
  /** Cumulative count per day at the top of the band */
  upper: readonly number[]
  /** Cumulative count per day at the bottom of the band, or null for the bottom band */
  lower: readonly number[] | null
  /** The band's fill */
  color: string
}

let {
  start,
  bands,
  fromName,
  toName,
  hoveredStage = $bindable(null),
}: {
  start: Date
  /** Top to bottom: the stages in progress, then the finished stage */
  bands: readonly FlowBand[]
  fromName: string
  toName: string
  /** The stage of the band under the pointer */
  hoveredStage?: string | null
} = $props()

const height = 440
const margin = { top: 16, right: 16, bottom: 32, left: 48 }

let width = $state(800)

const arrivals = $derived(bands[0].upper)
const departures = $derived(bands[bands.length - 1].upper)
const dayCount = $derived(arrivals.length)
const dateOf = (day: number) => new Date(start.getTime() + day * MILLISECONDS_PER_DAY)

const x = $derived(
  scaleTime()
    .domain([start, dateOf(Math.max(dayCount - 1, 1))])
    .range([margin.left, width - margin.right])
)
const y = $derived(
  scaleLinear()
    .domain([0, Math.max(arrivals[dayCount - 1], 1)])
    .range([height - margin.bottom, margin.top])
    .nice()
)
const xTicks = $derived(x.ticks(Math.max(2, Math.floor(width / 110))))
const xTickFormat = $derived(x.tickFormat())
const yTicks = $derived(y.ticks(5).filter(Number.isInteger))

function linePath(counts: readonly number[]): string {
  return counts.map((count, day) => `${day === 0 ? 'M' : 'L'}${x(dateOf(day))},${y(count)}`).join('')
}

function areaPath(upper: readonly number[], lower: readonly number[] | null): string {
  const back = upper.map((_, day) => {
    const d = upper.length - 1 - day
    return `L${x(dateOf(d))},${y(lower ? lower[d] : 0)}`
  })
  return `${linePath(upper)}${back.join('')}Z`
}

let hoveredDay = $state<number | null>(null)

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const px = event.clientX - rect.left
  const py = event.clientY - rect.top
  if (px < margin.left || px > width - margin.right) {
    onPointerLeave()
    return
  }
  const fractionalDay = Math.min(
    Math.max((x.invert(px).getTime() - start.getTime()) / MILLISECONDS_PER_DAY, 0),
    dayCount - 1
  )
  hoveredDay = Math.round(fractionalDay)

  // The band under the pointer, using the same straight segments the bands are drawn with
  const count = y.invert(py)
  const at = (counts: readonly number[]) => {
    const before = Math.floor(fractionalDay)
    const after = Math.min(before + 1, dayCount - 1)
    return counts[before] + (counts[after] - counts[before]) * (fractionalDay - before)
  }
  hoveredStage =
    bands.find((band) => count <= at(band.upper) && count >= (band.lower ? at(band.lower) : 0))?.stage ?? null
}

function onPointerLeave() {
  hoveredDay = null
  hoveredStage = null
}

// Vertical line: work in progress that day. Horizontal line: back to when the arrivals
// line was as high as the departures line is now - roughly how long work took to get through.
/**
 * Where the line drawn through the daily counts first reaches `count`, as a fractional day,
 * so the end of the horizontal line sits exactly on the drawn line.
 */
function crossingDay(counts: readonly number[], count: number): number | null {
  const day = counts.findIndex((c) => c >= count)
  if (day === -1) return null
  if (day === 0) return 0
  const before = counts[day - 1]
  return day - 1 + (count - before) / (counts[day] - before)
}

const crosshair = $derived.by(() => {
  if (hoveredDay === null) return null
  const day = hoveredDay
  const done = departures[day]
  const arrived = done > 0 ? crossingDay(arrivals, done) : null
  return {
    day,
    x: x(dateOf(day)),
    wipTop: y(arrivals[day]),
    wipBottom: y(done),
    wip: arrivals[day] - done,
    leadX: arrived === null ? null : x(dateOf(arrived)),
    leadDays: arrived === null ? 0 : day - arrived,
    ...stability(day),
  }
})

/**
 * The horizontal line pairs the Nth issue to arrive with the Nth to finish, which are rarely the
 * same issue. It only approximates how long issues take when work in progress is steady, so
 * flag the days where it changed a lot over the previous 30 days.
 */
function stability(day: number) {
  const before = Math.max(0, day - 30)
  const wipBefore = arrivals[before] - departures[before]
  const wipNow = arrivals[day] - departures[day]
  const change = Math.abs(wipNow - wipBefore)
  return { steady: change <= 5 || change <= wipBefore * 0.25, wipBefore, daysBefore: day - before }
}
</script>

<div class="relative" bind:clientWidth={width}>
  <svg
    {width}
    {height}
    class="block"
    role="img"
    aria-label="Cumulative flow of issues from {fromName} to {toName}, by day"
    onpointermove={onPointerMove}
    onpointerleave={onPointerLeave}
  >
    {#each yTicks as tick}
      <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} class="stroke-gray-900/5" />
      <text x={margin.left - 8} y={y(tick)} dy="0.32em" text-anchor="end" class="fill-gray-500 text-xs">{tick}</text>
    {/each}

    {#each bands as band}
      <path
        d={areaPath(band.upper, band.lower)}
        fill={band.color}
        class="transition-opacity duration-100 motion-reduce:transition-none"
        opacity={hoveredStage === null || hoveredStage === band.stage ? 1 : 0.35}
      />
    {/each}
    {#each bands as band}
      <path d={linePath(band.upper)} fill="none" class="stroke-white" stroke-width="1.5" />
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

    {#if crosshair}
      <line
        x1={crosshair.x}
        x2={crosshair.x}
        y1={margin.top}
        y2={height - margin.bottom}
        class="stroke-gray-900/25"
      />
      <line
        x1={crosshair.x}
        x2={crosshair.x}
        y1={crosshair.wipTop}
        y2={crosshair.wipBottom}
        class="stroke-gray-900"
        stroke-width="2"
      />
      {#if crosshair.leadX !== null}
        <line
          x1={crosshair.leadX}
          x2={crosshair.x}
          y1={crosshair.wipBottom}
          y2={crosshair.wipBottom}
          class="stroke-gray-900"
          stroke-width="2"
        />
        <circle cx={crosshair.leadX} cy={crosshair.wipBottom} r="4" class="fill-gray-900 stroke-white" stroke-width="2" />
      {/if}
      <circle cx={crosshair.x} cy={crosshair.wipTop} r="4" class="fill-gray-900 stroke-white" stroke-width="2" />
      <circle cx={crosshair.x} cy={crosshair.wipBottom} r="4" class="fill-gray-900 stroke-white" stroke-width="2" />
    {/if}
  </svg>

  {#if crosshair}
    {@const flip = crosshair.x > width * 0.6}
    <div
      class="pointer-events-none absolute top-3 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] leading-snug shadow-lg"
      style:left="{crosshair.x}px"
      style:transform="translateX({flip ? 'calc(-100% - 16px)' : '16px'})"
    >
      <div class="font-semibold text-gray-900">{formatDate(dateOf(crosshair.day))}</div>
      <div class="mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
        {#each bands as band}
          {@const hovered = band.stage === hoveredStage}
          <span class="inline-flex items-center gap-1.5 {hovered ? 'font-semibold text-gray-900' : 'text-gray-700'}">
            <span class="size-2.5 rounded-[2px]" style:background={band.color}></span>{band.stage}
          </span>
          <span class="text-right tabular-nums text-gray-900 {hovered ? 'font-semibold' : ''}">
            {band.upper[crosshair.day] - (band.lower ? band.lower[crosshair.day] : 0)}
          </span>
        {/each}
      </div>
      <div class="mt-2 border-t border-gray-100 pt-2 text-gray-900">
        <span class="font-semibold">{crosshair.wip}</span> in progress (the vertical line)
      </div>
      <div class="mt-0.5 text-gray-900">
        {#if crosshair.leadX !== null}
          <div>If issues finished in the order they arrived, they'd take</div>
          <div>
            {crosshair.leadDays < 1 ? 'under a day' : `about ${formatDuration(crosshair.leadDays)}`} (the horizontal line)
          </div>
          {#if !crosshair.steady}
            <div class="mt-1.5 text-gray-500">Not a reliable cycle time here: work in progress went</div>
            <div class="text-gray-500">
              from {crosshair.wipBefore} to {crosshair.wip} in the {crosshair.daysBefore} days before.
            </div>
          {/if}
        {:else}
          Nothing had reached {toName} yet
        {/if}
      </div>
    </div>
  {/if}
</div>
