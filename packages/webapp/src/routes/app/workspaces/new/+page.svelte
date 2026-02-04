<script lang="ts">
import { enhance } from '$app/forms'
import type { ActionData } from './$types'

const { form }: { form: ActionData } = $props()
</script>

<div class="mx-auto max-w-md px-4 sm:px-0">
  <h1 class="text-2xl font-bold text-gray-900">Create workspace</h1>
  <p class="mt-2 text-sm text-gray-700">Create a new workspace to track your team's metrics.</p>

  <form method="POST" use:enhance class="mt-8 space-y-6">
    {#if form?.error}
      <div class="rounded-md bg-red-50 p-4">
        <p class="text-sm text-red-700">{form.error}</p>
      </div>
    {/if}

    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Workspace name</label>
      <input
        type="text"
        name="name"
        id="name"
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="My Team"
      />
    </div>

    <div>
      <button
        type="submit"
        class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Create workspace
      </button>
    </div>
  </form>
</div>
