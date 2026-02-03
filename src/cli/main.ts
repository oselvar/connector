import { Command } from 'commander'
import packageJson from '../../package.json'
import { registerDataCommand } from './data'

const program = new Command()
program.name('oselvar-metrics').version(packageJson.version).description('Oselvar Metrics CLI')

registerDataCommand(program)

program.parse(process.argv)
