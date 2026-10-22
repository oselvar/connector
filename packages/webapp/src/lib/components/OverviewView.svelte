<script lang="ts">
import { teamCoach, teamLinks } from '$lib/coach'
import CoachFindingCard from '$lib/components/CoachFindingCard.svelte'
import DriftPanel from '$lib/components/DriftPanel.svelte'
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import StateText from '$lib/components/StateText.svelte'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { coachHeadline } from '@oselvar/core'
import type { LinearWorkItem } from '@oselvar/linear'

const { issues, all }: { issues: readonly LinearWorkItem[]; all: readonly LinearWorkItem[] } = $props()

const team = getTeam()
const range = getStageRange()

// Where work waits
const queueName = $derived(team.stages[range.from])
const toName = $derived(team.stages[range.to])
const findings = $derived(teamCoach(issues, team, range))
const links = $derived(teamLinks(team.workspaceId, team.teamId, team.stages, range))

const tally = $derived.by(() => {
  const count = (status: string) => findings.filter((f) => f.status === status).length
  const parts = [
    [count('act'), 'thing needs action', 'things need action'],
    [count('watch'), 'is worth watching', 'are worth watching'],
    [count('good'), 'is going well', 'are going well'],
  ] as const
  const said = parts.filter(([n]) => n > 0).map(([n, one, many]) => `${n === 1 ? 'one' : n} ${n === 1 ? one : many}`)
  if (said.length === 0) return ''
  const sentence = said.length === 1 ? said[0] : `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}`
  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`
})
</script>

<p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
  <StateText text={coachHeadline(findings)} stages={team.stages} />
</p>
<p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
  <RangeExplanation queue={queueName} finish={toName} /> Comparing the last 30 days with the 30 days before. {tally}
</p>

<section class="mt-8 rounded-xl bg-white px-4 pb-4 pt-6 shadow-sm sm:px-6">
  <StageRange stages={team.stages} bind:from={range.from} bind:to={range.to} />
</section>

<DriftPanel issues={all} level={range.level} />

<div class="mt-4 flex flex-col gap-4">
  {#each findings as finding (finding.id)}
    <CoachFindingCard {finding} href={links.chart(finding.chart)} chartName={links.chartName(finding.chart)} />
  {:else}
    <p class="rounded-xl bg-white p-6 text-gray-600 shadow-sm">
      There isn't enough history yet to give advice.
    </p>
  {/each}
</div>

<p class="mt-6 max-w-[62ch] text-[13px] leading-normal text-gray-500">
  This advice comes from fixed checks on your Linear data, based on Daniel Vacanti's Actionable Agile Metrics for
  Predictability. Each finding links to the chart it comes from, so you can check it yourself.
</p>
