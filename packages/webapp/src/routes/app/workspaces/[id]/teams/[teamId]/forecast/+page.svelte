<script lang="ts">
import FeatureForecast from '$lib/components/FeatureForecast.svelte'
import ForecastView from '$lib/components/ForecastView.svelte'
import IssuesLoading from '$lib/components/IssuesLoading.svelte'
import { getStageRange } from '$lib/stageRange.svelte'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
const range = getStageRange()
</script>

<svelte:head>
  <title>{data.team.linear_team_name} forecast</title>
</svelte:head>

<IssuesLoading issues={data.issues}>
  {#snippet children(issues, all)}
    <ForecastView {issues} items={issues.map((issue) => issue.workItem)} />
    {#if range.level === 'top'}
      <FeatureForecast {all} />
    {/if}
  {/snippet}
</IssuesLoading>
