<script lang="ts">
import { enhance } from '$app/forms'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<div class="flex min-h-screen flex-col items-center justify-center">
  <div class="w-full max-w-md text-center">
    <h1 class="mb-4 text-2xl font-bold text-gray-900">Join {data.workspace.name}</h1>
    <p class="mb-8 text-gray-600">You've been invited to join this workspace.</p>

    {#if data.isAuthenticated}
      <form method="POST" use:enhance>
        <button
          type="submit"
          class="inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Join workspace
        </button>
      </form>
    {:else}
      <a
        href="/login"
        class="inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        Sign in to join
      </a>
    {/if}
  </div>
</div>
