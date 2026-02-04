import { Command } from 'commander'
import { registerCycleTimeCommand } from './cycle-time/index.js'
import { registerDataCommand } from './data/index.js'

const packageJson = { version: '0.1.0' }

const program = new Command()
program.name('oselvar-metrics').version(packageJson.version).description('Oselvar Metrics CLI')

registerDataCommand(program)
registerCycleTimeCommand(program)

program.parse(process.argv)
