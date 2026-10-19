<script lang="ts">
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import ThroughputView from '$lib/components/ThroughputView.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} throughput</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues)}
    <ThroughputView {issues} items={issues.map((issue) => issue.workItem)} />
  {/snippet}
</IssuesLoading>
