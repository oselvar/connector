<script lang="ts">
import type { Level } from '$lib/stageRange.svelte'

/**
 * Switches the team's charts between leaves and top-level issues. The two are never mixed:
 * a parent and its sub-issues are one work item at one level, and several at the other.
 */
let { level = $bindable(), counts }: { level: Level; counts: Record<Level, number> | undefined } = $props()

const options: { value: Level; label: string }[] = [
  { value: 'leaves', label: 'Leaves' },
  { value: 'top', label: 'Top-level' },
]

const explanations: Record<Level, string> = {
  leaves: 'Issues with no sub-issues. Standalone issues count at both levels.',
  top: 'Issues with no parent. They start when their first piece of work starts, and finish when their last sub-issue finishes.',
}
</script>

<div class="mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-2">
  <span class="text-sm text-gray-600">Work items</span>
  <div class="flex overflow-hidden rounded-lg border border-gray-300 bg-white" role="group" aria-label="Work item level">
    {#each options as option}
      {@const selected = level === option.value}
      <button
        type="button"
        aria-pressed={selected}
        onclick={() => (level = option.value)}
        class="inline-flex min-h-10 cursor-pointer items-center gap-2 px-3.5 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 {selected
          ? 'bg-indigo-600 font-semibold text-white'
          : 'text-gray-700 hover:bg-gray-50'}"
      >
        {option.label}
        {#if counts}
          <span class="rounded-full px-1.5 text-xs {selected ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}">
            {counts[option.value]}
          </span>
        {/if}
      </button>
    {/each}
  </div>
  <span class="max-w-[60ch] text-[13px] text-gray-500">{explanations[level]}</span>
</div>
