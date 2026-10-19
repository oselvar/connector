<script lang="ts">
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()

function copyShareLink() {
  navigator.clipboard.writeText(data.shareUrl)
}
</script>

<div class="px-4 sm:px-0">
  <div class="sm:flex sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">{data.workspace.name}</h1>
      <p class="mt-1 text-sm text-gray-500">Manage teams and view metrics</p>
    </div>
    <div class="mt-4 sm:mt-0">
      <a
        href="/app/workspaces/{data.workspace.id}/teams"
        class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        Add Linear team
      </a>
    </div>
  </div>

  <div class="mt-8 rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="text-sm font-medium text-gray-700">Share link</h3>
    <div class="mt-2 flex items-center gap-2">
      <input type="text" readonly value={data.shareUrl} class="flex-1 rounded-md border-gray-300 text-sm" />
      <button
        onclick={copyShareLink}
        class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Copy
      </button>
    </div>
    <p class="mt-1 text-xs text-gray-500">Share this link to invite team members to this workspace.</p>
  </div>

  <div class="mt-8">
    <h2 class="text-lg font-medium text-gray-900">Linear teams</h2>

    {#if data.teams.length === 0}
      <div class="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <h3 class="text-sm font-semibold text-gray-900">No teams</h3>
        <p class="mt-1 text-sm text-gray-500">Add a Linear team to start tracking metrics.</p>
      </div>
    {:else}
      <ul class="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {#each data.teams as team}
          <li class="flex items-center justify-between p-4">
            <div>
              <a
                href="/app/workspaces/{data.workspace.id}/teams/{team.id}"
                class="font-medium text-indigo-600 hover:text-indigo-800"
              >
                {team.linear_team_name}
              </a>
              <p class="text-sm text-gray-500">{team.linear_team_key}</p>
            </div>
            <div class="flex items-center gap-3">
              <a
                href="/api/workspaces/{data.workspace.id}/teams/{team.id}/export"
                class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Export CSV
              </a>
              <form method="POST" action="?/removeTeam">
                <input type="hidden" name="team_id" value={team.id} />
                <button class="text-sm text-gray-500 hover:text-red-600">Remove</button>
              </form>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
