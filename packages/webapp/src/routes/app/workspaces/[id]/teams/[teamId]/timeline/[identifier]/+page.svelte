<script lang="ts">
import { page } from '$app/state'
import FeatureTimeline from '$lib/components/FeatureTimeline.svelte'
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{page.params.identifier} timeline</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(_, all)}
    <FeatureTimeline {all} identifier={page.params.identifier as string} />
  {/snippet}
</IssuesLoading>
