<script lang="ts">
import StateName from '$lib/components/StateName.svelte'

/** One sentence saying what the selected range means */
const { queue, finish }: { queue: string; finish: string } = $props()
</script>

Issues start when they move past <StateName name={queue} />, and finish when they reach <StateName name={finish} />.
