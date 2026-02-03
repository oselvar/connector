# Todoist Connector

Fetches tasks from a Todoist project for workflow analysis.

## Usage

```bash
# Auto-discover all sections as stages
oselvar-metrics data todoist --token $TODOIST_TOKEN --project-id 2364124307

# Filter to specific sections
oselvar-metrics data todoist \
  --token $TODOIST_TOKEN \
  --project-id 2364124307 \
  --stages "Todo,Doing,Done"

# Rename sections in output
oselvar-metrics data todoist \
  --token $TODOIST_TOKEN \
  --project-id 2364124307 \
  --stages "Todo,In Progress:doing,Done"
```

## Options

| Option | Description |
|--------|-------------|
| `--token <token>` | Todoist API token (default: `$TODOIST_TOKEN` env var) |
| `--project-id <id>` | Todoist project ID (required) |
| `--stages <stages>` | Comma-separated sections to include. Use `Section:name` to rename in output. |
| `--pages <n>` | Limit activity log pages to fetch |

## Finding Your Project ID

The project ID is the numeric ID, not the URL slug. To find it:

```bash
curl -H "Authorization: Bearer $TODOIST_TOKEN" \
  "https://api.todoist.com/rest/v2/projects"
```

## Limitations

### No Section Change History

**Todoist's Activity API does not track when tasks move between sections.**

The activity log only records:
- Task creation
- Task completion
- Content/description changes
- Assignee changes

It does **not** record section (column) changes. This means:

1. **We only know the task's current section**, not when it arrived there
2. **The timestamp shown is the task creation date**, not when it entered that section
3. **Cycle time calculations will be inaccurate** if you need time-in-stage metrics

### What This Means for Analysis

If you're using Todoist in a Kanban style with sections like "Todo → Doing → Done":

- Tasks will appear in their **current** section column
- The timestamp will be when the task was **created**
- You cannot determine how long a task spent in each section

### Workarounds

1. **Use completion timestamps**: The `completed` stage accurately reflects when tasks were marked done
2. **Approximate with creation date**: If tasks typically start in the first section, creation date approximates entry time
3. **Consider Jira or GitHub**: These systems provide full workflow transition history

### Example Output

```csv
id,name,Todo,Doing,Done,completed
123,https://app.todoist.com/app/task/123,,,2024-01-15T10:00:00Z,
456,https://app.todoist.com/app/task/456,,,2024-01-16T09:00:00Z,2024-01-20T14:30:00Z
```

In this example:
- Task 123 is currently in "Done", created on Jan 15 (not when it moved to Done)
- Task 456 is completed, created on Jan 16, completed on Jan 20
