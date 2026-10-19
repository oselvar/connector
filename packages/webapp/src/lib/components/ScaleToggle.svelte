<script lang="ts">
let { log = $bindable() }: { log: boolean } = $props()
</script>

<div class="flex overflow-hidden rounded-lg border border-gray-300 text-[13px]" role="group" aria-label="Scale">
  {#each [false, true] as isLog}
    <button
      type="button"
      class="cursor-pointer px-3.5 py-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 {isLog
        ? 'border-l border-gray-300'
        : ''} {log === isLog ? 'bg-indigo-50 font-semibold text-indigo-800' : 'bg-white text-gray-600'}"
      aria-pressed={log === isLog}
      onclick={() => (log = isLog)}
    >
      {isLog ? 'Log' : 'Linear'}
    </button>
  {/each}
</div>
