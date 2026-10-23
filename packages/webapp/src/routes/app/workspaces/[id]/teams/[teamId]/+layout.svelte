<script lang="ts">
import { replaceState } from '$app/navigation'
import { page } from '$app/state'
import LevelSwitch from '$lib/components/LevelSwitch.svelte'
import { levelCounts } from '$lib/levels'
import { readStageRange, setStageRange, stageRangeSearch } from '$lib/stageRange.svelte'
import { setTeam } from '$lib/team'
import type { Snippet } from 'svelte'
import type { LayoutData } from './$types'

const { data, children }: { data: LayoutData; children: Snippet } = $props()

// svelte-ignore state_referenced_locally
const range = $state(readStageRange(page.url, data.stages, data.defaultFrom, data.defaultTo))
setStageRange(range)
// Getters, so pages see the current data
setTeam({
  get workspaceId() {
    return data.workspace.id
  },
  get teamId() {
    return data.team.id
  },
  get stages() {
    return data.stages
  },
  get notStartedStages() {
    return data.notStartedStages
  },
  get teamSize() {
    return data.teamSize
  },
})

const search = $derived(stageRangeSearch(data.stages, range))
let counts: ReturnType<typeof levelCounts> | undefined = $state()
$effect(() => {
  data.issues.then((issues) => {
    counts = levelCounts(issues)
  })
})
const base = $derived(`/app/workspaces/${data.workspace.id}/teams/${data.team.id}`)
const tabs = $derived([
  { href: base, label: 'Overview' },
  { href: `${base}/cycle-time`, label: 'Cycle time' },
  { href: `${base}/aging`, label: 'Aging work' },
  { href: `${base}/flow`, label: 'Cumulative flow' },
  { href: `${base}/throughput`, label: 'Throughput' },
  { href: `${base}/wip`, label: 'Active work' },
  { href: `${base}/timeline`, label: 'Timeline' },
  { href: `${base}/forecast`, label: 'Forecast' },
])

// Keep the selected range in the URL, so it survives reloads and can be shared
$effect(() => {
  if (page.url.search !== search) {
    replaceState(`${page.url.pathname}${search}`, page.state)
  }
})
</script>

<div class="px-4 sm:px-0">
  <a href="/app/workspaces/{data.workspace.id}" class="text-sm text-gray-500 hover:text-gray-700">
    {data.workspace.name}
  </a>
  <nav class="mt-1 flex flex-wrap items-baseline gap-6 border-b border-gray-200" aria-label="Charts">
    <h1 class="pb-2.5 text-[15px] font-semibold text-gray-600">{data.team.linear_team_name}</h1>
    {#each tabs as tab}
      {@const current = page.url.pathname === tab.href || (tab.href !== base && page.url.pathname.startsWith(`${tab.href}/`))}
      <a
        href="{tab.href}{search}"
        aria-current={current ? 'page' : undefined}
        class="text-[15px] {current
          ? 'border-b-2 border-indigo-600 pb-2 font-semibold text-gray-900'
          : 'pb-2.5 text-gray-500 hover:text-gray-900'}"
      >
        {tab.label}
      </a>
    {/each}
  </nav>

  <LevelSwitch bind:level={range.level} {counts} />

  {@render children()}
</div>
