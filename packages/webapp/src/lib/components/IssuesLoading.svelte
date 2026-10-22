<script lang="ts">
import { issuesAtLevel } from '$lib/levels'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import type { LinearWorkItem } from '@oselvar/linear'
import type { Snippet } from 'svelte'

/**
 * Waits for a team's issues, then shows the work items at the selected level,
 * along with all issues for views that need both levels.
 */
const {
  issues,
  children,
}: {
  issues: Promise<LinearWorkItem[]>
  children: Snippet<[LinearWorkItem[], LinearWorkItem[]]>
} = $props()

const team = getTeam()
const range = getStageRange()
</script>

{#await issues}
  <p class="mt-6 text-4xl font-semibold leading-tight tracking-tight text-gray-300">Loading issues from Linear…</p>
  <p class="mt-3.5 text-base text-gray-600">Teams with many issues can take a minute.</p>
{:then loaded}
  {@render children(issuesAtLevel(loaded, team.stages, range), loaded)}
{:catch}
  <p class="mt-6 text-4xl font-semibold leading-tight tracking-tight text-gray-900">Couldn't load issues from Linear.</p>
  <p class="mt-3.5 text-base text-gray-600">Reload the page to try again.</p>
{/await}
