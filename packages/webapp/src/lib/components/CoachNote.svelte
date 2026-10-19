<script lang="ts">
import CoachLabels from '$lib/components/CoachLabels.svelte'
import type { CoachFinding } from '@oselvar/core'

/** The coach's most relevant advice for one chart, under its headline */
const { finding, overviewHref }: { finding: CoachFinding | undefined; overviewHref: string } = $props()
</script>

{#if finding}
  <div class="mt-5 max-w-[72ch] rounded-xl bg-white px-5 py-4 shadow-sm">
    <CoachLabels status={finding.status} trend={finding.trend} />
    <p class="mt-3 text-[15px] leading-relaxed text-gray-900">
      <span class="font-semibold">{finding.title}.</span>
      {finding.action}
    </p>
    <a href={overviewHref} class="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
      See all advice for this team
    </a>
  </div>
{/if}
