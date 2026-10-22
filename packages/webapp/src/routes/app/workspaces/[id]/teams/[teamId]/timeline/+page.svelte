<script lang="ts">
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import TimelineView from '$lib/components/TimelineView.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} timeline</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(_, all)}
    <TimelineView {all} />
  {/snippet}
</IssuesLoading>
