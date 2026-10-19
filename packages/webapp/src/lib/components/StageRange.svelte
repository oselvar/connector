<script lang="ts">
/**
 * Picks a span of a workflow with two handles on a track of ordered stages. The left handle's
 * stage is where work waits, the stages after it are active, and the right handle's stage is
 * where work is finished. So there is always at least one active stage between the handles.
 */
let { stages, from = $bindable(), to = $bindable() }: { stages: readonly string[]; from: number; to: number } = $props()

const last = $derived(stages.length - 1)
const position = (index: number) => `${(index / last) * 100}%`

function setFrom(value: number) {
  from = Math.min(value, to - 2)
}

function setTo(value: number) {
  to = Math.max(value, from + 2)
}

// Clicking a stage moves whichever handle is closest to it
function pick(index: number) {
  if (Math.abs(index - from) <= Math.abs(index - to) && index <= to - 2) setFrom(index)
  else setTo(index)
}
</script>

<div class="px-3">
  <div class="relative h-10">
    <!-- The whole workflow -->
    <div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200"></div>
    <!-- Waiting: from the queue stage to where work starts -->
    <div
      class="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-indigo-200"
      style:left={position(from)}
      style:right={`calc(100% - ${position(from + 1)})`}
    ></div>
    <!-- Active: from where work starts to where it is finished -->
    <div
      class="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-indigo-600"
      style:left={position(from + 1)}
      style:right={`calc(100% - ${position(to)})`}
    ></div>
    <!-- A stop for each stage -->
    {#each stages as _, i}
      <div
        class="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white {i > from &&
        i <= to
          ? 'border-indigo-600'
          : i === from
            ? 'border-indigo-300'
            : 'border-gray-300'}"
        style:left={position(i)}
      ></div>
    {/each}
    <input
      type="range"
      min="0"
      max={last}
      step="1"
      value={from}
      oninput={(e) => {
        setFrom(+e.currentTarget.value)
        e.currentTarget.value = String(from)
      }}
      aria-label="Where work waits"
      aria-valuetext={stages[from]}
    />
    <input
      type="range"
      min="0"
      max={last}
      step="1"
      value={to}
      oninput={(e) => {
        setTo(+e.currentTarget.value)
        e.currentTarget.value = String(to)
      }}
      aria-label="Where work is finished"
      aria-valuetext={stages[to]}
    />
  </div>

  <div class="relative mt-0.5 h-7 text-sm">
    {#each stages as stage, i}
      {@const selected = i === from || i === to}
      <button
        type="button"
        class="absolute -translate-x-1/2 cursor-pointer whitespace-nowrap rounded px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 {selected
          ? 'font-semibold text-gray-900'
          : 'hidden text-gray-500 hover:text-gray-900 sm:block'}"
        style:left={position(i)}
        onclick={() => pick(i)}
      >
        {stage}
      </button>
    {/each}
  </div>

  <!-- What each part of the range means -->
  <div class="relative h-5 text-xs text-gray-500" aria-hidden="true">
    <span class="absolute -translate-x-1/2 whitespace-nowrap" style:left={position(from)}>Waiting</span>
    <span class="absolute -translate-x-1/2 whitespace-nowrap font-medium text-indigo-700" style:left={position((from + 1 + to) / 2)}
      >Active</span
    >
    <span class="absolute -translate-x-1/2 whitespace-nowrap" style:left={position(to)}>Finished</span>
  </div>
</div>

<style>
  /* Two native range inputs stacked on the track. Only their thumbs take pointer input,
     so either handle can be dragged and both keep native keyboard support. */
  input[type='range'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    background: transparent;
    pointer-events: none;
    appearance: none;
  }
  input[type='range']::-webkit-slider-runnable-track {
    background: transparent;
  }
  input[type='range']::-moz-range-track {
    background: transparent;
  }
  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    pointer-events: auto;
    width: 22px;
    height: 22px;
    border-radius: 9999px;
    background: white;
    border: 2px solid var(--color-indigo-600);
    box-shadow: 0 1px 2px rgb(17 24 39 / 0.2);
    cursor: grab;
  }
  input[type='range']::-moz-range-thumb {
    pointer-events: auto;
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    background: white;
    border: 2px solid var(--color-indigo-600);
    box-shadow: 0 1px 2px rgb(17 24 39 / 0.2);
    cursor: grab;
  }
  input[type='range']:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--color-indigo-600);
    outline-offset: 2px;
  }
  input[type='range']:focus-visible::-moz-range-thumb {
    outline: 2px solid var(--color-indigo-600);
    outline-offset: 2px;
  }
</style>
