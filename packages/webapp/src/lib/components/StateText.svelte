<script lang="ts">
import StateName from '$lib/components/StateName.svelte'

/** Text with the team's workflow state names shown as tags */
const { text, stages }: { text: string; stages: readonly string[] } = $props()

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Longest names first, so "In Progress Review" wins over "In Progress"
const parts = $derived.by(() => {
  if (stages.length === 0) return [{ text, isState: false }]
  const names = [...stages].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const pattern = new RegExp(`(?<![\\w])(${names.join('|')})(?![\\w])`, 'g')
  return text.split(pattern).map((part, i) => ({ text: part, isState: i % 2 === 1 }))
})
</script>

{#each parts as part}{#if part.isState}<StateName name={part.text} />{:else}{part.text}{/if}{/each}
