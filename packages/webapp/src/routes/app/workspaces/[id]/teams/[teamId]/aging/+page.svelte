<script lang="ts">
import AgingView from '$lib/components/AgingView.svelte'
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} aging work</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues)}
    <AgingView {issues} stages={data.stages} />
  {/snippet}
</IssuesLoading>
