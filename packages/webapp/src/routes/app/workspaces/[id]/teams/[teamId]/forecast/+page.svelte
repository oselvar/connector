<script lang="ts">
import ForecastView from '$lib/components/ForecastView.svelte'
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} forecast</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues)}
    <ForecastView items={issues.map((issue) => issue.workItem)} />
  {/snippet}
</IssuesLoading>
