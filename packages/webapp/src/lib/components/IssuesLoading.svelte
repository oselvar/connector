<script lang="ts">
import type { LinearWorkItem } from '@oselvar/linear'
import type { Snippet } from 'svelte'

const { issues, children }: { issues: Promise<LinearWorkItem[]>; children: Snippet<[LinearWorkItem[]]> } = $props()
</script>

{#await issues}
  <p class="mt-6 text-4xl font-semibold leading-tight tracking-tight text-gray-300">Loading issues from Linear…</p>
  <p class="mt-3.5 text-base text-gray-600">Teams with many issues can take a minute.</p>
{:then loaded}
  {@render children(loaded)}
{:catch}
  <p class="mt-6 text-4xl font-semibold leading-tight tracking-tight text-gray-900">Couldn't load issues from Linear.</p>
  <p class="mt-3.5 text-base text-gray-600">Reload the page to try again.</p>
{/await}
