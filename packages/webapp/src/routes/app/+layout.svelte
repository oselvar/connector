<script lang="ts">
import type { LayoutData } from './$types'

const { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props()
</script>

<div class="min-h-screen bg-gray-100">
  <nav class="bg-white shadow">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 justify-between">
        <div class="flex">
          <a href="/app" class="flex shrink-0 items-center">
            <span class="text-xl font-bold text-indigo-600">Oselvar</span>
          </a>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <a
              href="/app/workspaces"
              class="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            >
              Workspaces
            </a>
          </div>
        </div>
        <div class="flex items-center">
          <span class="mr-4 text-sm text-gray-500">
            {[data.user.githubId && 'GitHub', data.user.linearId && 'Linear'].filter(Boolean).join(' + ')}
          </span>
          <a href="/logout" class="text-sm text-gray-500 hover:text-gray-700"> Sign out </a>
        </div>
      </div>
    </div>
  </nav>

  <main class="py-10">
    <div class="mx-auto max-w-7xl sm:px-6 lg:px-8">
      {@render children()}
    </div>
  </main>
</div>
