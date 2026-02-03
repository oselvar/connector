import type { Command } from 'commander'
import { registerGithubCommand } from './github'
import { registerJiraCommand } from './jira'
import { registerTodoistCommand } from './todoist'

export function registerDataCommand(program: Command): void {
  const dataCommand = program.command('data').description('Fetch work item data from various sources')

  registerGithubCommand(dataCommand)
  registerJiraCommand(dataCommand)
  registerTodoistCommand(dataCommand)
}
