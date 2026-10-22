<script lang="ts">
import CycleTimeView from '$lib/components/CycleTimeView.svelte'
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} cycle time</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues, all)}
    <CycleTimeView {issues} {all} items={issues.map((issue) => issue.workItem)} stages={data.stages} />
  {/snippet}
</IssuesLoading>
