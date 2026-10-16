<script lang="ts">
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<div class="flex min-h-screen flex-col items-center justify-center">
  <div class="mx-auto max-w-md text-center">
    <h1 class="mb-4 text-4xl font-bold text-gray-900">Oselvar Metrics</h1>
    <p class="mb-8 text-lg text-gray-600">Track and visualize your team's workflow metrics from Linear and GitHub.</p>

    {#if data.user}
      <a
        href="/app"
        class="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Go to Dashboard
      </a>
    {:else}
      <a
        href="/login"
        class="inline-block rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Sign In
      </a>
    {/if}
  </div>
</div>
