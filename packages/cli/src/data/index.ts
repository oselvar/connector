import type { Command } from 'commander'
import { registerGithubCommand } from './github.js'
import { registerJiraCommand } from './jira.js'
import { registerTodoistCommand } from './todoist.js'

export function registerDataCommand(program: Command): void {
  const dataCommand = program.command('data').description('Fetch work item data from various sources')

  registerGithubCommand(dataCommand)
  registerJiraCommand(dataCommand)
  registerTodoistCommand(dataCommand)
}
