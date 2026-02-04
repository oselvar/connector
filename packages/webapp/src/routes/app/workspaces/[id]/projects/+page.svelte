<script lang="ts">
import { enhance } from '$app/forms'
import type { ActionData, PageData } from './$types'

const { data, form }: { data: PageData; form: ActionData } = $props()
const selection = $state<{ project: { id: string; name: string } | null }>({ project: null })
</script>

<div class="mx-auto max-w-md px-4 sm:px-0">
  <h1 class="text-2xl font-bold text-gray-900">Add project</h1>
  <p class="mt-2 text-sm text-gray-700">Add a Todoist project to {data.workspace.name}.</p>

  {#if !data.hasTodoistConnected}
    <div class="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
      <h3 class="text-sm font-semibold text-gray-900">Connect Todoist</h3>
      <p class="mt-1 text-sm text-gray-500">Link your Todoist account to add projects.</p>
      <div class="mt-4">
        <a
          href="/login/todoist"
          class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Connect Todoist
        </a>
      </div>
    </div>
  {:else}
    <form method="POST" use:enhance class="mt-8 space-y-6">
      {#if form?.error}
        <div class="rounded-md bg-red-50 p-4">
          <p class="text-sm text-red-700">{form.error}</p>
        </div>
      {/if}

      <div>
        <label for="project" class="block text-sm font-medium text-gray-700">Select a project</label>
        <select
          name="todoist_project_id"
          id="project"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          onchange={(e) => {
            const select = e.target as HTMLSelectElement
            const option = select.options[select.selectedIndex]
            selection.project = { id: select.value, name: option.text }
          }}
        >
          <option value="">Choose a project...</option>
          {#each data.todoistProjects as project}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
        {#if selection.project}
          <input type="hidden" name="todoist_project_name" value={selection.project.name} />
        {/if}
      </div>

      <div>
        <button
          type="submit"
          disabled={!selection.project}
          class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
        >
          Add project
        </button>
      </div>
    </form>
  {/if}

  <div class="mt-8">
    <a href="/app/workspaces/{data.workspace.id}" class="text-sm text-indigo-600 hover:text-indigo-500">
      ← Back to workspace
    </a>
  </div>
</div>
