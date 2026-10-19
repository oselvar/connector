<script lang="ts">
import { formatDate } from '$lib/format'
import { MILLISECONDS_PER_DAY } from '@oselvar/core'
import { scaleLinear, scaleTime } from 'd3-scale'

/** One value per day, from `start` */
const {
  start,
  values,
  label,
  formatValue,
  formatTick = formatValue,
}: {
  start: Date
  values: readonly number[]
  /** What the values are, for screen readers */
  label: string
  formatValue: (value: number) => string
  formatTick?: (value: number) => string
} = $props()

const height = 240
const margin = { top: 12, right: 16, bottom: 32, left: 48 }

let width = $state(800)

const dateOf = (day: number) => new Date(start.getTime() + day * MILLISECONDS_PER_DAY)
const x = $derived(
  scaleTime()
    .domain([start, dateOf(Math.max(values.length - 1, 1))])
    .range([margin.left, width - margin.right])
)
const y = $derived(
  scaleLinear()
    .domain([0, Math.max(...values, 1)])
    .range([height - margin.bottom, margin.top])
    .nice()
)
const xTicks = $derived(x.ticks(Math.max(2, Math.floor(width / 110))))
const xTickFormat = $derived(x.tickFormat())
const yTicks = $derived(y.ticks(4))
const path = $derived(values.map((v, day) => `${day === 0 ? 'M' : 'L'}${x(dateOf(day))},${y(v)}`).join(''))

let hoveredDay = $state<number | null>(null)

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const px = event.clientX - rect.left
  if (px < margin.left || px > width - margin.right) {
    hoveredDay = null
    return
  }
  const day = Math.round((x.invert(px).getTime() - start.getTime()) / MILLISECONDS_PER_DAY)
  hoveredDay = Math.min(Math.max(day, 0), values.length - 1)
}
</script>

<div class="relative" bind:clientWidth={width}>
  <svg
    {width}
    {height}
    class="block"
    role="img"
    aria-label={label}
    onpointermove={onPointerMove}
    onpointerleave={() => (hoveredDay = null)}
  >
    {#each yTicks as tick}
      <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} class="stroke-gray-900/5" />
      <text x={margin.left - 8} y={y(tick)} dy="0.32em" text-anchor="end" class="fill-gray-500 text-xs">
        {formatTick(tick)}
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
    <path d={path} fill="none" stroke="#4f46e5" stroke-width="2" stroke-linejoin="round" />
    {#if hoveredDay !== null}
      <line
        x1={x(dateOf(hoveredDay))}
        x2={x(dateOf(hoveredDay))}
        y1={margin.top}
        y2={height - margin.bottom}
        class="stroke-gray-900/25"
      />
      <circle
        cx={x(dateOf(hoveredDay))}
        cy={y(values[hoveredDay])}
        r="4.5"
        fill="#4f46e5"
        stroke="#ffffff"
        stroke-width="2"
      />
    {/if}
  </svg>

  {#if hoveredDay !== null}
    {@const cx = x(dateOf(hoveredDay))}
    {@const flip = cx > width * 0.7}
    <div
      class="pointer-events-none absolute top-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] leading-snug shadow-lg"
      style:left="{cx}px"
      style:transform="translateX({flip ? 'calc(-100% - 12px)' : '12px'})"
    >
      <div class="font-semibold text-gray-900">{formatDate(dateOf(hoveredDay))}</div>
      <div class="mt-0.5 text-gray-700">{formatValue(values[hoveredDay])}</div>
    </div>
  {/if}
</div>
