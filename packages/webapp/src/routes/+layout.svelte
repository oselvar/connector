<script lang="ts">
import '../app.css'

const { children } = $props()
</script>

<svelte:head>
  <title>Oselvar Metrics</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  {@render children()}
</div>
