<script lang="ts">
import StateName from '$lib/components/StateName.svelte'
import { formatDate } from '$lib/format'
import { scaleBand, scaleLinear } from 'd3-scale'

export type ThroughputWeek = {
  /** First day of the week */
  start: Date
  /** Last day of the week */
  end: Date
  count: number
}

const { weeks, toName }: { weeks: readonly ThroughputWeek[]; toName: string } = $props()

const height = 320
const margin = { top: 16, right: 16, bottom: 32, left: 40 }

let width = $state(800)

const x = $derived(
  scaleBand<number>()
    .domain(weeks.map((_, i) => i))
    .range([margin.left, width - margin.right])
    .paddingInner(0.15)
)
const y = $derived(
  scaleLinear()
    .domain([0, Math.max(...weeks.map((w) => w.count), 1)])
    .range([height - margin.bottom, margin.top])
    .nice()
)
const yTicks = $derived(y.ticks(5).filter(Number.isInteger))
// Label about every 90px, so labels don't collide
const labelEvery = $derived(Math.max(1, Math.ceil(90 / Math.max(x.step(), 1))))
const monthDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

/** A bar with its top corners rounded, anchored to the baseline */
function bar(i: number, count: number): string {
  const left = x(i) ?? 0
  const w = x.bandwidth()
  const top = y(count)
  const bottom = y(0)
  const r = Math.min(4, w / 2, bottom - top)
  return `M${left},${bottom}V${top + r}Q${left},${top} ${left + r},${top}H${left + w - r}Q${left + w},${top} ${left + w},${top + r}V${bottom}Z`
}

let hovered = $state<number | null>(null)
</script>

<div class="relative" bind:clientWidth={width}>
  <svg {width} {height} class="block" role="img" aria-label="Issues that reached {toName} each week">
    {#each yTicks as tick}
      <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} class="stroke-gray-900/5" />
      <text x={margin.left - 8} y={y(tick)} dy="0.32em" text-anchor="end" class="fill-gray-500 text-xs">{tick}</text>
    {/each}
    {#each weeks as week, i}
      {#if week.count > 0}
        <path d={bar(i, week.count)} class={hovered === i ? 'fill-indigo-800' : 'fill-indigo-600'} />
      {/if}
      {#if i % labelEvery === 0}
        <text x={(x(i) ?? 0) + x.bandwidth() / 2} y={height - 10} text-anchor="middle" class="fill-gray-500 text-xs">
          {monthDay.format(week.start)}
        </text>
      {/if}
      <!-- The whole column is the hover target, so short bars are easy to hit -->
      <rect
        x={(x(i) ?? 0) - (x.step() - x.bandwidth()) / 2}
        y={margin.top}
        width={x.step()}
        height={height - margin.top - margin.bottom}
        fill="transparent"
        role="presentation"
        onpointerenter={() => (hovered = i)}
        onpointerleave={() => (hovered = null)}
      />
    {/each}
    <line
      x1={margin.left}
      x2={width - margin.right}
      y1={height - margin.bottom}
      y2={height - margin.bottom}
      class="stroke-gray-300"
    />
  </svg>

  {#if hovered !== null}
    {@const week = weeks[hovered]}
    {@const cx = (x(hovered) ?? 0) + x.bandwidth() / 2}
    {@const flip = cx > width * 0.7}
    <div
      class="pointer-events-none absolute whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] leading-snug shadow-lg"
      style:left="{cx}px"
      style:top="{y(week.count)}px"
      style:transform="translate({flip ? 'calc(-100% - 12px)' : '12px'}, -50%)"
    >
      <div class="font-semibold text-gray-900">{monthDay.format(week.start)} to {formatDate(week.end)}</div>
      <div class="mt-0.5 text-gray-700">
        {week.count === 1 ? '1 issue' : `${week.count} issues`} reached <StateName name={toName} />
      </div>
    </div>
  {/if}
</div>
