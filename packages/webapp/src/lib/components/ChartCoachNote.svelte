<script lang="ts">
import { teamCoach, teamLinks } from '$lib/coach'
import CoachNote from '$lib/components/CoachNote.svelte'
import { getStageRange } from '$lib/stageRange.svelte'
import { getTeam } from '$lib/team'
import type { CoachChart, WorkItem } from '@oselvar/core'

/** The coach's most relevant advice for a chart: a range that starts too early, then the chart's own */
const { items, chart }: { items: readonly WorkItem<string>[]; chart: CoachChart } = $props()

const team = getTeam()
const range = getStageRange()

const findings = $derived(teamCoach(items, team.stages, range, team.commitmentStage))
const finding = $derived(findings.find((f) => f.id === 'before-commitment') ?? findings.find((f) => f.chart === chart))
const links = $derived(teamLinks(team.workspaceId, team.teamId, team.stages, range))
</script>

<CoachNote {finding} overviewHref={links.overview} />
