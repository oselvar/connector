<script lang="ts">
import ChartCoachNote from '$lib/components/ChartCoachNote.svelte'
import DailyLineChart from '$lib/components/DailyLineChart.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import { formatDuration, formatShortDuration } from '$lib/format'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import { MILLISECONDS_PER_DAY, type WorkItem, dailyWorkInProgress, makeFlowTimeline } from '@oselvar/core'

const { items }: { items: readonly WorkItem<string>[] } = $props()

const team = getTeam()
const range = getStageRange()
const now = Date.now()

const fromName = $derived(team.stages[range.from])
const toName = $derived(team.stages[range.to])

// Every day from the first issue that started, up to today
const history = $derived.by(() => {
  const timeline = makeFlowTimeline(items, team.stages, fromName, toName)
  const starts = timeline.items.map(({ crossed }) => crossed[0]).filter((t): t is number => t !== undefined)
  if (starts.length === 0) return null
  const start = Math.floor(Math.min(...starts) / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY
  const days = Math.floor((now - start) / MILLISECONDS_PER_DAY) + 1
  return { start: new Date(start), days: dailyWorkInProgress(timeline, start, days) }
})

const today = $derived(history?.days[history.days.length - 1])
const monthAgo = $derived(history ? history.days[Math.max(0, history.days.length - 31)] : undefined)
</script>

{#if today && monthAgo}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    {today.count}
    {today.count === 1 ? 'issue is' : 'issues are'} in progress{today.count > 0
      ? `, ${formatDuration(today.averageAgeDays)} old on average`
      : ''}.
  </p>
  <p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
    A month ago, {monthAgo.count}
    {monthAgo.count === 1 ? 'issue was' : 'issues were'} in progress{monthAgo.count > 0
      ? `, ${formatDuration(monthAgo.averageAgeDays)} old on average`
      : ''}. Counting issues that reached {fromName} but not yet {toName}.
  </p>
{:else}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    No issues have reached {fromName} yet.
  </p>
{/if}

<ChartCoachNote {items} chart="wip" />

<section class="mt-8 rounded-xl bg-white px-4 pb-5 pt-6 shadow-sm sm:px-6">
  <StageRange stages={team.stages} bind:from={range.from} bind:to={range.to} />
  {#if history}
    <h2 class="mt-5 border-t border-gray-100 pt-4 text-sm font-semibold text-gray-900">Issues in progress</h2>
    <p class="text-sm text-gray-600">At the end of each day. Hover to see a day.</p>
    <div class="mt-2">
      <DailyLineChart
        start={history.start}
        values={history.days.map((d) => d.count)}
        label="Issues in progress at the end of each day"
        formatValue={(n) => `${n} in progress`}
        formatTick={(n) => String(n)}
      />
    </div>
    <h2 class="mt-6 text-sm font-semibold text-gray-900">Average age of issues in progress</h2>
    <p class="text-sm text-gray-600">
      How long, on average, the issues in progress had been going. When it rises, work is getting stuck.
    </p>
    <div class="mt-2">
      <DailyLineChart
        start={history.start}
        values={history.days.map((d) => d.averageAgeDays)}
        label="Average age of issues in progress at the end of each day"
        formatValue={(days) => `${formatDuration(days)} on average`}
        formatTick={formatShortDuration}
      />
    </div>
  {/if}
</section>
