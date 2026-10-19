<script lang="ts">
import type { CoachStatus, CoachTrend } from '@oselvar/core'

const { status, trend }: { status: CoachStatus; trend: CoachTrend | null } = $props()

const statuses = {
  act: { label: 'Act now', classes: 'bg-red-50 text-red-700', icon: 'M8 1.75 14.5 13.5H1.5Z M8 6.25v3.25 M8 11.6v.1' },
  watch: {
    label: 'Keep an eye on',
    classes: 'bg-yellow-50 text-yellow-800',
    icon: 'M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z M8 9.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z',
  },
  good: {
    label: 'Going well',
    classes: 'bg-green-50 text-green-700',
    icon: 'M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5Z M5.25 8.25l1.9 1.9 3.6-3.9',
  },
}
const trends = {
  worse: { label: 'Worse than the 30 days before', icon: 'M2 11.5 6 7.5l2.5 2.5L14 4.5 M10 4.5h4v4' },
  better: { label: 'Better than the 30 days before', icon: 'M2 4.5 6 8.5l2.5-2.5L14 11.5 M10 11.5h4v-4' },
  same: { label: 'About the same as the 30 days before', icon: 'M2 8h12 M10.5 4.5 14 8l-3.5 3.5' },
}
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
  <span class="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-2.5 font-semibold {statuses[status].classes}">
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d={statuses[status].icon} />
    </svg>
    {statuses[status].label}
  </span>
  {#if trend}
    <span class="inline-flex items-center gap-1.5 text-gray-700">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d={trends[trend].icon} />
      </svg>
      {trends[trend].label}
    </span>
  {/if}
</div>
