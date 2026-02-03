import { readFileSync } from 'node:fs'
import type { Command } from 'commander'
import { calculateCycleTimes } from './calculate'
import { type DateFormat, formatGnuplot, formatYouplot } from './formatters'

export function registerCycleTimeCommand(program: Command): void {
  program
    .command('cycle-time')
    .description('Calculate cycle times between two stages from CSV data')
    .requiredOption('--from <stage>', 'Start stage column name')
    .requiredOption('--to <stage>', 'End stage column name')
    .option('--input <file>', 'Input CSV file (default: stdin)')
    .option('--format <format>', 'Output format: "youplot" or "gnuplot"', 'youplot')
    .option('--date-format <fmt>', 'Date format: "iso" or "unix"', 'iso')
    .action(async (options) => {
      const csvString = options.input ? readFileSync(options.input, 'utf-8') : await readStdin()

      const items = calculateCycleTimes(csvString, {
        fromStage: options.from,
        toStage: options.to,
      })

      const dateFormat = options.dateFormat as DateFormat

      const output = options.format === 'gnuplot' ? formatGnuplot(items, dateFormat) : formatYouplot(items, dateFormat)

      process.stdout.write(`${output}\n`)
    })
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf-8')
}
