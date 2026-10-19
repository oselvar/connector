<script lang="ts">
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import WipView from '$lib/components/WipView.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} work in progress</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues)}
    <WipView items={issues.map((issue) => issue.workItem)} />
  {/snippet}
</IssuesLoading>
