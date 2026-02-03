import type { CycleTimeItem } from './calculate'

export type DateFormat = 'iso' | 'unix' | 'decimal'

/**
 * Formats cycle time data for YouPlot scatter plots.
 * Tab-separated with header: date, cycle_time, id
 *
 * Usage: ... | uplot scatter -H
 */
export function formatYouplot(items: CycleTimeItem[], dateFormat: DateFormat = 'iso'): string {
  const lines = ['date\tcycle_time']

  for (const item of items) {
    const dateStr = formatDate(item.completionDate, dateFormat)
    lines.push(`${dateStr}\t${item.cycleTimeDays.toFixed(2)}`)
  }

  return lines.join('\n')
}

/**
 * Formats cycle time data for gnuplot.
 * Outputs data section followed by a gnuplot script that generates an SVG scatter plot.
 */
export function formatGnuplot(items: CycleTimeItem[], dateFormat: DateFormat = 'iso'): string {
  const dataLines: string[] = ['# date\tcycle_time\tid']

  for (const item of items) {
    const dateStr = formatDate(item.completionDate, dateFormat)
    dataLines.push(`${dateStr}\t${item.cycleTimeDays.toFixed(2)}\t${item.id}`)
  }

  const script = `
# Gnuplot script for cycle time scatter plot
# Usage: gnuplot -e "datafile='cycle-time.dat'" cycle-time.gp

set terminal svg size 800,600 enhanced font 'Arial,12'
set output 'cycle-time.svg'

set title 'Cycle Time Distribution'
set xlabel 'Completion Date'
set ylabel 'Cycle Time (days)'

set xdata time
set timefmt '${dateFormat === 'unix' ? '%s' : '%Y-%m-%d'}'
set format x '%Y-%m-%d'
set xtics rotate by -45

set grid
set style fill solid 0.5
set pointsize 1.5

plot '-' using 1:2 with points pt 7 lc rgb '#3498db' title 'Work Items'
${dataLines.join('\n')}
e
`.trim()

  return script
}

function formatDate(date: Date, format: DateFormat): string {
  if (format === 'unix') {
    return Math.floor(date.getTime() / 1000).toString()
  }
  if (format === 'decimal') {
    // Year as decimal (e.g., 2022.5 for mid-2022)
    const year = date.getUTCFullYear()
    const startOfYear = Date.UTC(year, 0, 1)
    const endOfYear = Date.UTC(year + 1, 0, 1)
    const fraction = (date.getTime() - startOfYear) / (endOfYear - startOfYear)
    return (year + fraction).toFixed(3)
  }
  // ISO format: YYYY-MM-DD
  return date.toISOString().split('T')[0]
}
