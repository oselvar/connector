<script lang="ts">
import ChartCoachNote from '$lib/components/ChartCoachNote.svelte'
import RangeExplanation from '$lib/components/RangeExplanation.svelte'
import StageRange from '$lib/components/StageRange.svelte'
import StateName from '$lib/components/StateName.svelte'
import { formatDate } from '$lib/format'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import {
  MILLISECONDS_PER_DAY as DAY,
  type WorkItem,
  dailyThroughput,
  forecastHowMany,
  forecastWhen,
  inProgressAt,
  makeFlowTimeline,
  seededRandom,
} from '@oselvar/core'
import type { LinearWorkItem } from '@oselvar/linear'

const {
  items,
  issues,
}: {
  items: readonly WorkItem<string>[]
  /** The same issues, with who they are assigned to, for the coach */
  issues: readonly LinearWorkItem[]
} = $props()

const team = getTeam()
const range = getStageRange()
const now = Date.now()
const today = Math.floor(now / DAY) * DAY
const runs = 10000
const historyDays = 90
const chances = [
  { percent: 95, label: 'Almost certain' },
  { percent: 85, label: 'Likely' },
  { percent: 50, label: 'Even chance' },
]

// Where work waits, and the first stage where it is active
const queueName = $derived(team.stages[range.from])
const fromName = $derived(team.stages[range.from + 1])
const toName = $derived(team.stages[range.to])
const timeline = $derived(makeFlowTimeline(items, team.stages, fromName, toName))

// Past daily throughput to sample from: the last 90 days, or since the first issue started
const history = $derived.by(() => {
  const starts = timeline.items.map(({ crossed }) => crossed[0]).filter((t): t is number => t !== undefined)
  if (starts.length === 0) return []
  const first = Math.floor(Math.min(...starts) / DAY) * DAY
  const start = Math.max(today - (historyDays - 1) * DAY, first)
  return dailyThroughput(timeline, start, Math.round((today - start) / DAY) + 1)
})
const finishedInHistory = $derived(history.reduce((sum, n) => sum + n, 0))

// How many by a date
const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10)
let byDate = $state(isoDate(today + 28 * DAY))
const days = $derived(Math.round((Date.parse(byDate) - today) / DAY))
const howMany = $derived(days > 0 ? forecastHowMany(history, days, runs, seededRandom(1)) : [])
const atLeast = (percent: number) => howMany[Math.floor(((100 - percent) / 100) * (howMany.length - 1))]

// When will N be done
// svelte-ignore state_referenced_locally
let count = $state(Math.max(inProgressAt(timeline, now).length, 1))
const when = $derived(count > 0 ? forecastWhen(history, count, runs, seededRandom(2)) : [])
const within = (percent: number) => when[Math.ceil((percent / 100) * when.length) - 1]
const dateIn = (daysAhead: number) => formatDate(new Date(today + daysAhead * DAY))
</script>

{#if finishedInHistory > 0}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    How much will be done, and when?
  </p>
  <p class="mt-3.5 max-w-[62ch] text-base leading-normal text-gray-600">
    These forecasts replay how many issues reached <StateName name={toName} /> each day over the last {history.length} days, {runs.toLocaleString(
      'en'
    )} times. They assume the team keeps working the way it has; if that changes, so will the answers.
    <RangeExplanation queue={queueName} finish={toName} />
  </p>
{:else}
  <p class="mt-6 max-w-[22em] text-4xl font-semibold leading-tight tracking-tight text-gray-900">
    Nothing has reached <StateName name={toName} /> in the last {historyDays} days, so there is nothing to forecast from yet.
  </p>
{/if}

<ChartCoachNote {issues} chart="throughput" />

<section class="mt-8 rounded-xl bg-white px-4 pb-4 pt-6 shadow-sm sm:px-6">
  <StageRange stages={team.stages} bind:from={range.from} bind:to={range.to} />
</section>

{#if finishedInHistory > 0}
  <div class="mt-4 grid gap-4 md:grid-cols-2">
    <section class="rounded-xl bg-white p-6 shadow-sm">
      <label class="block">
        <span class="text-lg font-semibold text-gray-900">How many issues will reach <StateName name={toName} /> by</span>
        <input
          type="date"
          bind:value={byDate}
          min={isoDate(today + DAY)}
          class="mt-2 block rounded-md border border-gray-300 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-indigo-600"
        />
      </label>
      {#if howMany.length > 0}
        <p class="mt-5 text-[15px] leading-relaxed text-gray-900">
          By {formatDate(new Date(Date.parse(byDate)))}, the team will likely finish
          <span class="font-semibold">{atLeast(85)} or more</span> issues.
        </p>
        <table class="mt-4 w-full border-collapse text-sm">
          <tbody>
            {#each chances as chance}
              <tr class="border-t border-gray-100">
                <td class="py-2 text-gray-600">{chance.label} ({chance.percent}% chance)</td>
                <td class="py-2 text-right tabular-nums font-medium text-gray-900">{atLeast(chance.percent)} or more</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="mt-5 text-[15px] text-gray-600">Pick a date after today.</p>
      {/if}
    </section>

    <section class="rounded-xl bg-white p-6 shadow-sm">
      <label class="block">
        <span class="text-lg font-semibold text-gray-900">When will this many issues reach <StateName name={toName} />?</span>
        <input
          type="number"
          min="1"
          bind:value={count}
          class="mt-2 block w-32 rounded-md border border-gray-300 px-3 py-2 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-indigo-600"
        />
      </label>
      {#if when.length > 0}
        {@const likely = within(85)}
        <p class="mt-5 text-[15px] leading-relaxed text-gray-900">
          {#if Number.isFinite(likely)}
            {count === 1 ? 'It' : `${count} issues`} will likely be done by
            <span class="font-semibold">{dateIn(likely)}</span>.
          {:else}
            At the current pace, {count} issues would take more than ten years.
          {/if}
        </p>
        <table class="mt-4 w-full border-collapse text-sm">
          <tbody>
            {#each chances as chance}
              {@const daysNeeded = within(chance.percent)}
              <tr class="border-t border-gray-100">
                <td class="py-2 text-gray-600">{chance.label} ({chance.percent}% chance)</td>
                <td class="py-2 text-right tabular-nums font-medium text-gray-900">
                  {Number.isFinite(daysNeeded) ? `by ${dateIn(daysNeeded)}` : 'not within ten years'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="mt-3 text-[13px] text-gray-500">
          This starts from today, and counts any issues that finish, not particular ones.
        </p>
      {:else}
        <p class="mt-5 text-[15px] text-gray-600">Enter how many issues.</p>
      {/if}
    </section>
  </div>
{/if}
