<script lang="ts">
import CoachLabels from '$lib/components/CoachLabels.svelte'
import Sparkline from '$lib/components/Sparkline.svelte'
import type { CoachFinding } from '@oselvar/core'

const { finding, href, chartName }: { finding: CoachFinding; href: string; chartName: string } = $props()
</script>

<article class="rounded-xl bg-white p-6 shadow-sm">
  <div class="grid gap-x-10 gap-y-6 {finding.series ? 'md:grid-cols-[minmax(0,1fr)_260px]' : ''}">
    <div class="min-w-0">
      <CoachLabels status={finding.status} trend={finding.trend} />
      <h2 class="mt-3 text-xl font-semibold leading-snug text-gray-900">{finding.title}</h2>
      <p class="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-gray-700">{finding.seen}</p>
      <p class="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-gray-600">{finding.why}</p>
      <div class="mt-4 max-w-[62ch] rounded-lg bg-gray-50 px-4 py-3">
        <p class="text-[13px] font-semibold text-gray-900">What to do</p>
        <p class="mt-1 text-[15px] leading-relaxed text-gray-900">{finding.action}</p>
      </div>
      <a {href} class="mt-3.5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
        See it on {chartName}
      </a>
    </div>
    {#if finding.series}
      <Sparkline series={finding.series} />
    {/if}
  </div>
</article>
