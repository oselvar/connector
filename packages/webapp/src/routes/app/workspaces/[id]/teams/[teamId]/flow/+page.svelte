<script lang="ts">
import FlowView from '$lib/components/FlowView.svelte'
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} cumulative flow</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues)}
    <FlowView items={issues.map((issue) => issue.workItem)} stages={data.stages} />
  {/snippet}
</IssuesLoading>
