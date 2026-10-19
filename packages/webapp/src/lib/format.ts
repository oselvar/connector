/** "6.2 days", "14 days", "5 hours" */
export function formatDuration(days: number): string {
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24))
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  const n = days < 10 ? Math.round(days * 10) / 10 : Math.round(days)
  return n === 1 ? '1 day' : `${n} days`
}

/** "6.2d", "14d", "5h", "20m" */
export function formatShortDuration(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 24 * 60))}m`
  if (days < 1) return `${Math.round(days * 24)}h`
  return `${days < 10 ? Math.round(days * 10) / 10 : Math.round(days)}d`
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' })

/** "12 Mar 2026" */
export function formatDate(date: Date): string {
  return dateFormat.format(date)
}

/** "Mar 2026" */
export function formatMonth(date: Date): string {
  return monthFormat.format(date)
}

/** The issue identifier (ENG-123) from a Linear issue URL, or the URL if it has none */
export function issueIdentifier(url: string): string {
  return url.match(/\/issue\/([A-Za-z0-9]+-\d+)/)?.[1] ?? url
}
