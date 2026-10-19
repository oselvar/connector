<script lang="ts">
/** A Linear workflow state's name, shown as a tag so it can't be mistaken for ordinary words */
const { name }: { name: string } = $props()
</script>

<span
  class="whitespace-nowrap rounded-[0.3em] bg-gray-100 px-[0.35em] py-px align-[0.05em] text-[0.88em] font-medium text-gray-800 ring-1 ring-gray-200 ring-inset"
  >{name}</span
>
