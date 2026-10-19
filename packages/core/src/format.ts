/** "6.2 days", "14 days", "5 hours" */
export function formatDuration(days: number): string {
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24))
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  const n = days < 10 ? Math.round(days * 10) / 10 : Math.round(days)
  return n === 1 ? '1 day' : `${n} days`
}

/** "1 issue", "3 issues" */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`
}
