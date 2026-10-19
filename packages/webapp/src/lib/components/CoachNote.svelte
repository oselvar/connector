<script lang="ts">
import CoachLabels from '$lib/components/CoachLabels.svelte'
import StateText from '$lib/components/StateText.svelte'
import { getTeam } from '$lib/team'
import type { CoachFinding } from '@oselvar/core'

/** The coach's most relevant advice for one chart, under its headline */
const { finding, overviewHref }: { finding: CoachFinding | undefined; overviewHref: string } = $props()
const team = getTeam()
</script>

{#if finding}
  <div class="mt-5 max-w-[72ch] rounded-xl bg-white px-5 py-4 shadow-sm">
    <CoachLabels status={finding.status} trend={finding.trend} />
    <p class="mt-3 text-[15px] leading-relaxed text-gray-900">
      <span class="font-semibold"><StateText text={finding.title} stages={team.stages} />.</span>
      <StateText text={finding.action} stages={team.stages} />
    </p>
    <a href={overviewHref} class="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
      See all advice for this team
    </a>
  </div>
{/if}
