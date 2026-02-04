<script lang="ts">
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<div class="px-4 sm:px-0">
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-2xl font-bold text-gray-900">Workspaces</h1>
      <p class="mt-2 text-sm text-gray-700">Manage your workspaces and invite team members.</p>
    </div>
    <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
      <a
        href="/app/workspaces/new"
        class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        Create workspace
      </a>
    </div>
  </div>

  {#if data.workspaces.length === 0}
    <div class="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <h3 class="mt-2 text-sm font-semibold text-gray-900">No workspaces</h3>
      <p class="mt-1 text-sm text-gray-500">Get started by creating a new workspace.</p>
      <div class="mt-6">
        <a
          href="/app/workspaces/new"
          class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Create workspace
        </a>
      </div>
    </div>
  {:else}
    <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.workspaces as workspace}
        <a
          href="/app/workspaces/{workspace.id}"
          class="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md"
        >
          <h3 class="text-lg font-medium text-gray-900">{workspace.name}</h3>
          <p class="mt-1 text-sm text-gray-500">
            {workspace.role === 'owner' ? 'Owner' : 'Member'}
          </p>
        </a>
      {/each}
    </div>
  {/if}
</div>
