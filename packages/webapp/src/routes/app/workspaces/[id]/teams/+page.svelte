<script lang="ts">
import type { ActionData, PageData } from './$types'

const { data, form }: { data: PageData; form: ActionData } = $props()
</script>

<div class="px-4 sm:px-0">
  <a href="/app/workspaces/{data.workspace.id}" class="text-sm text-gray-500 hover:text-gray-700">
    &larr; {data.workspace.name}
  </a>
  <h1 class="mt-2 text-2xl font-bold text-gray-900">Add a Linear team</h1>

  {#if form?.error}
    <p class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{form.error}</p>
  {/if}

  {#if !data.linearConnected}
    <div class="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
      {#if data.linearAvailable}
        <p class="text-sm text-gray-500">Connect your Linear account to see your teams.</p>
        <a
          href="/login/linear"
          class="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Connect Linear
        </a>
      {:else}
        <p class="text-sm text-gray-500">Sign-in with Linear isn't set up, so Linear teams can't be added yet.</p>
      {/if}
    </div>
  {:else}
    <ul class="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {#each data.teams as team}
        <li class="flex items-center justify-between p-4">
          <div>
            <p class="font-medium text-gray-900">{team.name}</p>
            <p class="text-sm text-gray-500">{team.key}</p>
          </div>
          {#if team.added}
            <span class="text-sm text-gray-500">Added</span>
          {:else}
            <form method="POST">
              <input type="hidden" name="linear_team_id" value={team.id} />
              <button
                class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Add
              </button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
