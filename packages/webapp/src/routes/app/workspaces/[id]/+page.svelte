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
      <p class="mt-1 text-sm text-gray-500">Manage members and view metrics</p>
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
</div>
