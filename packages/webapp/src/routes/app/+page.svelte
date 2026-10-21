<script lang="ts">
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<div class="px-4 sm:px-0">
  <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
  <p class="mt-2 text-gray-600">Welcome to Oselvar Metrics. Get started by creating a workspace.</p>

  <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <a
      href="/app/workspaces"
      class="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md"
    >
      <h3 class="text-lg font-medium text-gray-900">Workspaces</h3>
      <p class="mt-2 text-sm text-gray-500">Manage your workspaces</p>
    </a>

    {#if data.providers.linear && !data.user?.linearId}
      <a
        href="/login/linear"
        class="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md"
      >
        <h3 class="text-lg font-medium text-gray-900">Connect Linear</h3>
        <p class="mt-2 text-sm text-gray-500">Link your Linear account to track issues</p>
      </a>
    {/if}

    {#if data.providers.github && !data.user?.githubId}
      <a
        href="/login/github"
        class="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md"
      >
        <h3 class="text-lg font-medium text-gray-900">Connect GitHub</h3>
        <p class="mt-2 text-sm text-gray-500">Link your GitHub account to track issues</p>
      </a>
    {/if}
  </div>
</div>
