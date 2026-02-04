import type { HistoricWorkItem, WorkItemSnapshot } from '@oselvar/core'

import type { TodoistActivityEvent, TodoistSection, TodoistTask } from './types'

const NO_SECTION_STAGE = '(No Section)'
const COMPLETED_STAGE = 'completed'

export function makeHistoricWorkItem(
  task: TodoistTask,
  activities: readonly TodoistActivityEvent[],
  sectionMap: Map<string, string>
): HistoricWorkItem<string> {
  const snapshots: WorkItemSnapshot<string>[] = []

  // Get task-specific activities sorted by date (oldest first)
  const taskActivities = activities
    .filter((activity) => activity.object_id === task.id)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  // Find the initial stage from creation activity or fall back to current section
  const createdActivity = taskActivities.find((a) => a.event_type === 'added')
  const initialTimestamp = new Date(task.created_at)

  // Determine initial section:
  // 1. If creation activity has section_id, use that
  // 2. Otherwise fall back to task's current section (best effort when activity history is limited)
  let initialSectionId: string | null = null
  if (createdActivity?.extra_data?.section_id) {
    initialSectionId = createdActivity.extra_data.section_id
  } else if (taskActivities.length === 0) {
    // No activity history - use current section as best effort
    initialSectionId = task.section_id
  }

  const initialStage = getStageName(initialSectionId, sectionMap)
  snapshots.push({ timestamp: initialTimestamp, stage: initialStage })

  // Process section changes from activity log
  for (const activity of taskActivities) {
    if (activity.event_type === 'updated' && activity.extra_data?.section_id !== undefined) {
      const sectionId = activity.extra_data.section_id || null
      const stage = getStageName(sectionId, sectionMap)
      snapshots.push({ timestamp: new Date(activity.event_date), stage })
    }
  }

  // Add completed snapshot if task is done
  if (task.is_completed && task.completed_at) {
    snapshots.push({ timestamp: new Date(task.completed_at), stage: COMPLETED_STAGE })
  }

  return {
    id: task.id,
    name: task.url,
    snapshots: snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
  }
}

function getStageName(sectionId: string | null, sectionMap: Map<string, string>): string {
  if (sectionId === null || sectionId === '') {
    return NO_SECTION_STAGE
  }
  return sectionMap.get(sectionId) ?? NO_SECTION_STAGE
}

export function buildSectionMap(sections: readonly TodoistSection[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const section of sections) {
    map.set(section.id, section.name)
  }
  return map
}

export function getDefaultStages(sections: readonly TodoistSection[]): readonly string[] {
  const stages: string[] = [NO_SECTION_STAGE]
  // Sections are already ordered by display order
  for (const section of sections) {
    stages.push(section.name)
  }
  stages.push(COMPLETED_STAGE)
  return stages
}
