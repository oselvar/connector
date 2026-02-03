import assert from 'node:assert'
import { describe, it } from 'vitest'

import makeHistoricWorkItem, { buildSectionMap, getDefaultStages } from '../../src/todoist/makeHistoricWorkItem'
import type { TodoistActivityEvent, TodoistSection, TodoistTask } from '../../src/todoist/types'

describe('makeHistoricWorkItem', () => {
  const sections: TodoistSection[] = [
    { id: '100', project_id: '1', order: 1, name: 'Backlog' },
    { id: '200', project_id: '1', order: 2, name: 'In Progress' },
    { id: '300', project_id: '1', order: 3, name: 'Done' },
  ]

  const sectionMap = buildSectionMap(sections)

  it('creates a snapshot for task creation with no section', () => {
    const task: TodoistTask = {
      id: 'task-1',
      project_id: '1',
      section_id: null,
      content: 'Test task',
      is_completed: false,
      created_at: '2024-01-01T10:00:00Z',
      completed_at: null,
      url: 'https://todoist.com/showTask?id=task-1',
    }

    const activities: TodoistActivityEvent[] = []

    const result = makeHistoricWorkItem(task, activities, sectionMap)

    assert.strictEqual(result.id, 'task-1')
    assert.strictEqual(result.name, 'https://todoist.com/showTask?id=task-1')
    assert.strictEqual(result.snapshots.length, 1)
    assert.strictEqual(result.snapshots[0].stage, '(No Section)')
    assert.deepStrictEqual(result.snapshots[0].timestamp, new Date('2024-01-01T10:00:00Z'))
  })

  it('creates snapshots for section changes', () => {
    const task: TodoistTask = {
      id: 'task-2',
      project_id: '1',
      section_id: '200',
      content: 'Task with section changes',
      is_completed: false,
      created_at: '2024-01-01T10:00:00Z',
      completed_at: null,
      url: 'https://todoist.com/showTask?id=task-2',
    }

    const activities: TodoistActivityEvent[] = [
      {
        id: 'event-1',
        object_type: 'item',
        object_id: 'task-2',
        event_type: 'added',
        event_date: '2024-01-01T10:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '100' },
      },
      {
        id: 'event-2',
        object_type: 'item',
        object_id: 'task-2',
        event_type: 'updated',
        event_date: '2024-01-02T14:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '200' },
      },
    ]

    const result = makeHistoricWorkItem(task, activities, sectionMap)

    assert.strictEqual(result.snapshots.length, 2)
    assert.strictEqual(result.snapshots[0].stage, 'Backlog')
    assert.deepStrictEqual(result.snapshots[0].timestamp, new Date('2024-01-01T10:00:00Z'))
    assert.strictEqual(result.snapshots[1].stage, 'In Progress')
    assert.deepStrictEqual(result.snapshots[1].timestamp, new Date('2024-01-02T14:00:00Z'))
  })

  it('adds completed snapshot for completed tasks', () => {
    const task: TodoistTask = {
      id: 'task-3',
      project_id: '1',
      section_id: '300',
      content: 'Completed task',
      is_completed: true,
      created_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-05T16:00:00Z',
      url: 'https://todoist.com/showTask?id=task-3',
    }

    const activities: TodoistActivityEvent[] = [
      {
        id: 'event-1',
        object_type: 'item',
        object_id: 'task-3',
        event_type: 'added',
        event_date: '2024-01-01T10:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '100' },
      },
      {
        id: 'event-2',
        object_type: 'item',
        object_id: 'task-3',
        event_type: 'updated',
        event_date: '2024-01-03T12:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '200' },
      },
      {
        id: 'event-3',
        object_type: 'item',
        object_id: 'task-3',
        event_type: 'updated',
        event_date: '2024-01-04T15:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '300' },
      },
    ]

    const result = makeHistoricWorkItem(task, activities, sectionMap)

    assert.strictEqual(result.snapshots.length, 4)
    assert.strictEqual(result.snapshots[0].stage, 'Backlog')
    assert.strictEqual(result.snapshots[1].stage, 'In Progress')
    assert.strictEqual(result.snapshots[2].stage, 'Done')
    assert.strictEqual(result.snapshots[3].stage, 'completed')
    assert.deepStrictEqual(result.snapshots[3].timestamp, new Date('2024-01-05T16:00:00Z'))
  })

  it('ignores activities for other tasks and uses current section', () => {
    const task: TodoistTask = {
      id: 'task-4',
      project_id: '1',
      section_id: '100',
      content: 'My task',
      is_completed: false,
      created_at: '2024-01-01T10:00:00Z',
      completed_at: null,
      url: 'https://todoist.com/showTask?id=task-4',
    }

    const activities: TodoistActivityEvent[] = [
      {
        id: 'event-1',
        object_type: 'item',
        object_id: 'other-task',
        event_type: 'updated',
        event_date: '2024-01-02T14:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '200' },
      },
    ]

    const result = makeHistoricWorkItem(task, activities, sectionMap)

    // When no activity history exists for this task, falls back to current section
    assert.strictEqual(result.snapshots.length, 1)
    assert.strictEqual(result.snapshots[0].stage, 'Backlog')
  })

  it('sorts snapshots chronologically', () => {
    const task: TodoistTask = {
      id: 'task-5',
      project_id: '1',
      section_id: '300',
      content: 'Task with out-of-order activities',
      is_completed: false,
      created_at: '2024-01-01T10:00:00Z',
      completed_at: null,
      url: 'https://todoist.com/showTask?id=task-5',
    }

    const activities: TodoistActivityEvent[] = [
      {
        id: 'event-2',
        object_type: 'item',
        object_id: 'task-5',
        event_type: 'updated',
        event_date: '2024-01-03T12:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '300' },
      },
      {
        id: 'event-1',
        object_type: 'item',
        object_id: 'task-5',
        event_type: 'updated',
        event_date: '2024-01-02T14:00:00Z',
        parent_project_id: '1',
        extra_data: { section_id: '200' },
      },
    ]

    const result = makeHistoricWorkItem(task, activities, sectionMap)

    assert.strictEqual(result.snapshots.length, 3)
    assert.strictEqual(result.snapshots[0].stage, '(No Section)')
    assert.strictEqual(result.snapshots[1].stage, 'In Progress')
    assert.strictEqual(result.snapshots[2].stage, 'Done')
  })
})

describe('buildSectionMap', () => {
  it('creates a map from section ID to section name', () => {
    const sections: TodoistSection[] = [
      { id: '100', project_id: '1', order: 1, name: 'Backlog' },
      { id: '200', project_id: '1', order: 2, name: 'In Progress' },
    ]

    const result = buildSectionMap(sections)

    assert.strictEqual(result.get('100'), 'Backlog')
    assert.strictEqual(result.get('200'), 'In Progress')
    assert.strictEqual(result.size, 2)
  })
})

describe('getDefaultStages', () => {
  it('returns stages with No Section first, then sections in order, then completed', () => {
    const sections: TodoistSection[] = [
      { id: '100', project_id: '1', order: 1, name: 'Backlog' },
      { id: '200', project_id: '1', order: 2, name: 'In Progress' },
      { id: '300', project_id: '1', order: 3, name: 'Done' },
    ]

    const result = getDefaultStages(sections)

    assert.deepStrictEqual(result, ['(No Section)', 'Backlog', 'In Progress', 'Done', 'completed'])
  })

  it('handles empty sections', () => {
    const result = getDefaultStages([])

    assert.deepStrictEqual(result, ['(No Section)', 'completed'])
  })
})
