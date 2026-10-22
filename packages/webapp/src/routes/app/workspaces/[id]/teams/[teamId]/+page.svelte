<script lang="ts">
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import OverviewView from '$lib/components/OverviewView.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} overview</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues, all)}
    <OverviewView {issues} {all} />
  {/snippet}
</IssuesLoading>
