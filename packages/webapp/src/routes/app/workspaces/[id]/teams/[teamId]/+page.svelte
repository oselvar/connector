<script lang="ts">
import CycleTimeView from '$lib/components/CycleTimeView.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} cycle time</title>
</svelte:head>

<div class="px-4 sm:px-0">
  <a href="/app/workspaces/{data.workspace.id}" class="text-sm text-gray-500 hover:text-gray-700">
    {data.workspace.name}
  </a>
  <h1 class="mt-1 text-[15px] font-semibold text-gray-600">{data.team.linear_team_name} cycle time</h1>

  {#await data.workItems}
    <p class="mt-5 text-4xl font-semibold leading-tight tracking-tight text-gray-300">Loading issues from Linear…</p>
    <p class="mt-3.5 text-base text-gray-600">Teams with many issues can take a minute.</p>
  {:then items}
    <CycleTimeView {items} stages={data.stages} defaultFrom={data.defaultFrom} defaultTo={data.defaultTo} />
  {:catch}
    <p class="mt-5 text-4xl font-semibold leading-tight tracking-tight text-gray-900">
      Couldn't load issues from Linear.
    </p>
    <p class="mt-3.5 text-base text-gray-600">Reload the page to try again.</p>
  {/await}
</div>
