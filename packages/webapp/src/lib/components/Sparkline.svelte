<script lang="ts">
import type { CoachSeries } from '@oselvar/core'

const { series }: { series: CoachSeries } = $props()

const width = 260
const height = 96
const plot = { left: 4, right: 256, top: 8, bottom: 76 }

const numbers = $derived(series.values.filter((v): v is number => v !== null))
const max = $derived(Math.max(...numbers, 1) * 1.1)
const min = $derived(Math.min(...numbers, 0))
const last = $derived(series.values.length - 1)
const x = (i: number) => plot.left + (i / Math.max(last, 1)) * (plot.right - plot.left)
const y = (v: number) => plot.bottom - ((v - min) / (max - min || 1)) * (plot.bottom - plot.top)

// Gaps where there are no values
const path = $derived(
  series.values
    .map((v, i) => (v === null ? '' : `${i > 0 && series.values[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v)}`))
    .join('')
)
const end = $derived(series.values[last])
const recentX = $derived(x(Math.max(last - series.recent, 0)))
</script>

<figure class="m-0">
  <svg viewBox="0 0 {width} {height}" class="block h-auto w-full" role="img" aria-label="{series.caption}, recently">
    <rect x={recentX} y="4" width={plot.right - recentX} height="72" class="fill-gray-100" />
    <text x={plot.right - 4} y="16" text-anchor="end" class="fill-gray-500 text-[10px]">Last 30 days</text>
    <path d={path} fill="none" stroke="#4f46e5" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    {#if end !== null}
      <circle cx={x(last)} cy={y(end)} r="4" fill="#4f46e5" stroke="#ffffff" stroke-width="2" />
    {/if}
    <text x={plot.left} y="92" class="fill-gray-500 text-[11px]">{series.values.length > 20 ? '90 days ago' : '13 weeks ago'}</text>
    <text x={plot.right} y="92" text-anchor="end" class="fill-gray-500 text-[11px]">Today</text>
  </svg>
  <figcaption class="mt-1.5 text-[13px] text-gray-600">{series.caption}</figcaption>
</figure>
