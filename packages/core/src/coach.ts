import { MILLISECONDS_PER_DAY as DAY, type StagedItem, percentile } from './cycleTime'
import {
  type FlowTimeline,
  finishedBetween,
  inProgressAt,
  inStageAt,
  makeFlowTimeline,
  timesInStage,
} from './flowTimeline'
import { formatDuration, plural } from './format'

/**
 * A flow coach: fixed checks on the data, based on Daniel Vacanti's Actionable Agile Metrics
 * for Predictability, each giving plain advice. Most checks compare the last 30 days with
 * the 30 days before, so they can say whether things got better or worse.
 */

export type CoachStatus = 'act' | 'watch' | 'good'
export type CoachTrend = 'better' | 'worse' | 'same'
export type CoachChart = 'cycle-time' | 'aging' | 'flow' | 'throughput' | 'wip'

export type CoachFinding = {
  id: string
  status: CoachStatus
  /** Compared with the 30 days before, or null when it doesn't apply */
  trend: CoachTrend | null
  /** The advice in one sentence, for the top of the page when this is the most important finding */
  headline: string
  title: string
  /** What the data shows, with numbers */
  seen: string
  /** Why it matters */
  why: string
  /** What to do about it */
  action: string
  /** The chart that shows it */
  chart: CoachChart
  /** The measure over recent time, oldest first, for a sparkline. Null values are gaps. */
  series: CoachSeries | null
}

export type CoachSeries = {
  values: (number | null)[]
  /** How many of the last values cover the last 30 days */
  recent: number
  caption: string
}

export type CoachInput = {
  items: readonly StagedItem[]
  stages: readonly string[]
  fromStage: string
  toStage: string
  /** The first stage where work counts as started, if the workflow has one */
  commitmentStage: string | undefined
  now: Date
  /** A short name for an item, like its issue key */
  identify: (item: StagedItem) => string
}

const MONTH = 30 * DAY
const WEEK = 7 * DAY
const SERIES_DAYS = 90

type Context = {
  input: CoachInput
  timeline: FlowTimeline
  now: number
  monthAgo: number
}

export function coach(input: CoachInput): CoachFinding[] {
  const now = input.now.getTime()
  const context: Context = {
    input,
    timeline: makeFlowTimeline(input.items, input.stages, input.fromStage, input.toStage),
    now,
    monthAgo: now - MONTH,
  }
  const checks = [
    beforeCommitment,
    nothingFinished,
    workInProgress,
    oldItems,
    waitingInStage,
    cycleTimeTrend,
    throughputTrend,
    spread,
  ]
  const findings = checks.map((check) => check(context)).filter((f): f is CoachFinding => f !== null)

  // The range comes first, since it changes how to read everything else; then most urgent first
  const rank = (f: CoachFinding) => (f.id === 'before-commitment' ? -1 : { act: 0, watch: 1, good: 2 }[f.status])
  return findings.sort((a, b) => rank(a) - rank(b))
}

/** The one sentence to lead with */
export function coachHeadline(findings: readonly CoachFinding[]): string {
  return findings.find((f) => f.status !== 'good')?.headline ?? 'Work is flowing well.'
}

/** The end of each of the last `days` days, oldest first */
function dayEnds(now: number, days = SERIES_DAYS): number[] {
  return Array.from({ length: days }, (_, i) => now - (days - 1 - i) * DAY)
}

const trendOf = (now: number, then: number, higherIsWorse = true): CoachTrend =>
  now === then ? 'same' : now > then === higherIsWorse ? 'worse' : 'better'

function beforeCommitment({ input, timeline, now }: Context): CoachFinding | null {
  const { stages, fromStage, commitmentStage } = input
  if (!commitmentStage || stages.indexOf(fromStage) >= stages.indexOf(commitmentStage)) return null

  const wip = inProgressAt(timeline, now)
  const commitment = stages.indexOf(commitmentStage)
  const waiting = wip.filter((w) => stages.indexOf(w.stage) < commitment).length
  return {
    id: 'before-commitment',
    status: 'watch',
    trend: null,
    headline: `Move the start of the range to ${commitmentStage} for advice about work that has started.`,
    title: `The range starts at ${fromStage}, before work has started`,
    seen: `${plural(waiting, 'issue', 'issues')} of the ${wip.length} counted as in progress ${waiting === 1 ? 'is' : 'are'} waiting before ${commitmentStage}.`,
    why: 'Issues there are ideas waiting to be picked, not work the team has started. Counting them makes work look like it is piling up when it may not be, and makes cycle times look longer.',
    action: `Move the left handle to ${commitmentStage} to see the work the team has committed to.`,
    chart: 'flow',
    series: null,
  }
}

function nothingFinished({ input, timeline, now }: Context): CoachFinding | null {
  const wip = inProgressAt(timeline, now).length
  if (wip === 0 || finishedBetween(timeline, now - WEEK, now).length > 0) return null

  const finished = finishedBetween(timeline, 0, now)
  const lastFinished = finished.length ? Math.max(...finished.map((f) => f.finished)) : null
  return {
    id: 'nothing-finished',
    status: 'act',
    trend: finishedBetween(timeline, now - 2 * WEEK, now - WEEK).length > 0 ? 'worse' : 'same',
    headline: 'Nothing has finished in a week. Find out what is stuck.',
    title: 'Nothing has finished in the last week',
    seen: `${plural(wip, 'issue is', 'issues are')} in progress, but none reached ${input.toStage} in the last 7 days.${
      lastFinished === null ? '' : ` The last one finished ${formatDuration((now - lastFinished) / DAY)} ago.`
    }`,
    why: 'When nothing finishes, the team gets no feedback, and everything in progress keeps getting older.',
    action: 'Look at the oldest issues on the aging chart together, and agree on one to finish first.',
    chart: 'aging',
    series: null,
  }
}

function workInProgress({ input, timeline, now, monthAgo }: Context): CoachFinding | null {
  const wipNow = inProgressAt(timeline, now).length
  const wipThen = inProgressAt(timeline, monthAgo).length
  if (wipNow === 0 && wipThen === 0) return null

  const started = timeline.items.filter(({ crossed }) => {
    const start = crossed[0]
    return start !== undefined && start >= monthAgo && start < now
  }).length
  const finished = finishedBetween(timeline, monthAgo, now).length
  const change = wipNow === wipThen ? 'the same as' : `${wipNow > wipThen ? 'up' : 'down'} from`
  const seen = `In the last 30 days, ${plural(started, 'issue', 'issues')} reached ${input.fromStage} and ${finished} reached ${input.toStage}. ${wipNow} ${wipNow === 1 ? 'is' : 'are'} in progress now, ${change} ${wipThen} a month ago.`
  const series = {
    recent: 30,
    values: dayEnds(now).map((end) => inProgressAt(timeline, end).length),
    caption: `Issues in progress: ${wipThen} a month ago, ${wipNow} today`,
  }
  const threshold = Math.max(3, wipThen * 0.25)

  if (wipNow > wipThen + threshold) {
    return {
      id: 'work-in-progress',
      status: 'act',
      trend: 'worse',
      headline: "Work is piling up. Finish what you've started before starting more.",
      title: 'More work is starting than finishing',
      seen,
      why: 'When more work is in progress, every issue waits longer for attention. Growing work in progress is the most common reason teams slow down, and it shows up in cycle times a few weeks later.',
      action:
        'Agree as a team to finish something before starting something new. Try a simple limit, like no more issues in progress than there are people on the team.',
      chart: 'flow',
      series,
    }
  }
  if (wipNow < wipThen - threshold) {
    return {
      id: 'work-in-progress',
      status: 'good',
      trend: 'better',
      headline: 'Work in progress is coming down.',
      title: 'Work in progress is coming down',
      seen,
      why: 'With less work in progress, each issue gets more attention and finishes sooner. Cycle times usually follow within a few weeks.',
      action: 'Keep finishing before starting. Watch the cycle time chart for the improvement to show.',
      chart: 'flow',
      series,
    }
  }
  return {
    id: 'work-in-progress',
    status: 'good',
    trend: 'same',
    headline: 'Work is flowing steadily.',
    title: 'Work in progress is steady',
    seen,
    why: "When about as much work finishes as starts, issues don't queue up, and past cycle times are a good guide to future ones.",
    action: 'Keep it that way: start new work when something finishes.',
    chart: 'wip',
    series,
  }
}

function oldItems({ input, timeline, now, monthAgo }: Context): CoachFinding | null {
  const p85At = (time: number) =>
    percentile(
      finishedBetween(timeline, 0, time).map((f) => f.cycleTimeDays),
      85
    )
  const overdueAt = (time: number) => {
    const p85 = p85At(time)
    return p85 === undefined ? [] : inProgressAt(timeline, time).filter((w) => w.ageDays > p85)
  }
  const p85 = p85At(now)
  if (p85 === undefined || finishedBetween(timeline, 0, now).length < 5) return null

  const wip = inProgressAt(timeline, now)
  const overdue = overdueAt(now).sort((a, b) => b.ageDays - a.ageDays)
  const overdueThen = overdueAt(monthAgo).length
  const series = {
    recent: 30,
    values: dayEnds(now).map((end) => overdueAt(end).length),
    caption: `Issues past the 85th percentile: ${overdueThen} a month ago, ${overdue.length} today`,
  }

  if (overdue.length === 0) {
    return {
      id: 'old-items',
      status: 'good',
      trend: trendOf(0, overdueThen),
      headline: 'Nothing in progress is unusually old.',
      title: 'Nothing in progress is unusually old',
      seen: `Every issue in progress is younger than 85% of finished issues were when they finished (${formatDuration(p85)}).`,
      why: 'Work that keeps moving rarely surprises anyone.',
      action: 'Keep an eye on the aging chart, and help any issue that gets close to the 85% line.',
      chart: 'aging',
      series,
    }
  }

  const oldest = overdue[0]
  const name = input.identify(oldest.item)
  return {
    id: 'old-items',
    status: overdue.length >= Math.max(3, Math.ceil(wip.length * 0.1)) ? 'act' : 'watch',
    trend: trendOf(overdue.length, overdueThen),
    headline: 'Some issues are getting old. Help them finish.',
    title: `${plural(overdue.length, 'issue is', 'issues are')} older than 85% of finished work`,
    seen: `${overdue.length === 1 ? 'It has' : 'They have'} been in progress longer than 85% of finished issues took (${formatDuration(p85)}). The oldest, ${name}, has been going for ${formatDuration(oldest.ageDays)} and is in ${oldest.stage}.`,
    why: 'The older an issue gets, the less likely it is to finish soon. Old issues are usually blocked, too big, or forgotten.',
    action: `Start each day with the oldest issues rather than the newest. Ask what is stopping ${name}, and whether it should be split up or worked on together.`,
    chart: 'aging',
    series,
  }
}

function waitingInStage({ input, timeline, now, monthAgo }: Context): CoachFinding | null {
  // Stages before work has started are lists of ideas, not queues; before-commitment covers them
  const commitment = input.commitmentStage ? input.stages.indexOf(input.commitmentStage) : -1
  const inProgressStages = timeline.stages.slice(0, -1).filter((stage) => input.stages.indexOf(stage) >= commitment)
  if (inProgressStages.length < 2) return null

  const growth = inProgressStages
    .map((stage) => {
      const count = inStageAt(timeline, stage, now)
      const then = inStageAt(timeline, stage, monthAgo)
      return { stage, count, then, growth: count - then }
    })
    .sort((a, b) => b.growth - a.growth)
  const [top, next] = growth
  // One stage clearly growing while the others stay about level
  if (top.growth < 3 || top.count < top.then * 2 || next.growth * 2 > top.growth) return null

  const median = (from: number, to: number) => {
    const times = timesInStage(timeline, top.stage, from, to)
    return times.length >= 3 ? percentile(times, 50) : undefined
  }
  const medianNow = median(monthAgo, now)
  const medianThen = median(monthAgo - MONTH, monthAgo)
  const slower =
    medianNow !== undefined &&
    medianThen !== undefined &&
    formatDuration(medianNow) !== formatDuration(medianThen) &&
    medianNow > medianThen
      ? ` Issues spend a median of ${formatDuration(medianNow)} there, up from ${formatDuration(medianThen)}.`
      : ''

  return {
    id: 'waiting-in-stage',
    status: 'watch',
    trend: 'worse',
    headline: `Work is waiting in ${top.stage}. Help clear it before starting more.`,
    title: `Work is waiting in ${top.stage}`,
    seen: `${top.stage} holds ${top.count} issues now, up from ${top.then} a month ago, while the other stages stayed about the same.${slower}`,
    why: "When one stage grows while the others don't, that is where work queues up. Speeding up anything else won't help until it clears.",
    action: `Find out why work waits in ${top.stage}: is it waiting for someone who is busy, or for something outside the team? Help clear it before picking up new work.`,
    chart: 'flow',
    series: {
      recent: 30,
      values: dayEnds(now).map((end) => inStageAt(timeline, top.stage, end)),
      caption: `Issues in ${top.stage}: ${top.then} a month ago, ${top.count} today`,
    },
  }
}

function cycleTimeTrend({ timeline, now, monthAgo }: Context): CoachFinding | null {
  const p85Between = (from: number, to: number) => {
    const times = finishedBetween(timeline, from, to).map((f) => f.cycleTimeDays)
    return times.length >= 5 ? (percentile(times, 85) as number) : null
  }
  const recent = p85Between(monthAgo, now)
  const previous = p85Between(monthAgo - MONTH, monthAgo)
  if (recent === null || previous === null) return null

  const seen = `85% of issues that finished in the last 30 days took ${formatDuration(recent)} or less. In the 30 days before, it was ${formatDuration(previous)}.`
  const series = {
    recent: 30,
    values: dayEnds(now).map((end) => p85Between(end - MONTH, end)),
    caption: `85th percentile cycle time: ${formatDuration(previous)} a month ago, ${formatDuration(recent)} today`,
  }
  const ratio = recent / previous

  if (ratio > 1.2) {
    return {
      id: 'cycle-time',
      status: 'watch',
      trend: 'worse',
      headline: 'Issues are taking longer. Bring work in progress down.',
      title: 'Issues are taking longer to finish',
      seen,
      why: "This is the number to plan with. If it keeps rising, promises made from last month's numbers will be missed.",
      action:
        'Bring work in progress down first, and help the oldest issues finish. Cycle times usually follow a few weeks later.',
      chart: 'cycle-time',
      series,
    }
  }
  if (ratio < 0.8) {
    return {
      id: 'cycle-time',
      status: 'good',
      trend: 'better',
      headline: 'Issues are finishing faster than last month.',
      title: 'Issues are finishing faster',
      seen,
      why: 'Shorter cycle times mean faster feedback and more reliable forecasts.',
      action: 'Find out what changed, and keep doing it.',
      chart: 'cycle-time',
      series,
    }
  }
  return {
    id: 'cycle-time',
    status: 'good',
    trend: 'same',
    headline: 'Cycle times are steady.',
    title: 'Cycle times are steady',
    seen,
    why: 'Steady cycle times make the 85th percentile a dependable number to plan with.',
    action: `Use it: tell people that 85% of issues finish within ${formatDuration(recent)}.`,
    chart: 'cycle-time',
    series,
  }
}

function throughputTrend({ input, timeline, now }: Context): CoachFinding | null {
  const weekly = (weeks: number) =>
    Array.from(
      { length: weeks },
      (_, w) => finishedBetween(timeline, now - (weeks - w) * WEEK, now - (weeks - 1 - w) * WEEK).length
    )
  const firstStart = Math.min(...timeline.items.map(({ crossed }) => crossed[0] ?? Number.POSITIVE_INFINITY))
  const weeks = weekly(8)
  // Needs 8 weeks of history, and the nothing-finished check covers an empty last week
  if (firstStart > now - 8 * WEEK || weeks[7] === 0) return null

  const average = (values: number[]) => values.reduce((sum, n) => sum + n, 0) / values.length
  const recent = average(weeks.slice(4))
  const previous = average(weeks.slice(0, 4))
  const mean = average(weeks)
  const spreadRatio = Math.sqrt(average(weeks.map((n) => (n - mean) ** 2))) / (mean || 1)
  const round = (n: number) => Math.round(n * 10) / 10
  const series = {
    recent: 4,
    values: weekly(13),
    caption: `Issues finished per week: ${round(previous)} a month ago, ${round(recent)} lately`,
  }
  const base = { id: 'throughput', chart: 'throughput' as const, series }

  if (recent < previous * 0.75) {
    return {
      ...base,
      status: 'watch',
      trend: 'worse',
      headline: 'The team is finishing less work than before.',
      title: 'The team is finishing less work',
      seen: `${round(recent)} issues reached ${input.toStage} per week in the last 4 weeks, down from ${round(previous)} in the 4 weeks before.`,
      why: 'Fewer finished issues per week means everything waiting takes longer, even if nothing else changes.',
      action:
        'Check whether people were away, or whether work got bigger or more blocked. Splitting work smaller is the most reliable way to finish more often.',
    }
  }
  if (recent > previous * 1.25) {
    return {
      ...base,
      status: 'good',
      trend: 'better',
      headline: 'The team is finishing more work than before.',
      title: 'The team is finishing more work',
      seen: `${round(recent)} issues reached ${input.toStage} per week in the last 4 weeks, up from ${round(previous)} in the 4 weeks before.`,
      why: 'Finishing more often means faster feedback and shorter waits.',
      action: "Make sure it isn't from rushing reviews or skipping steps, then keep going.",
    }
  }
  if (spreadRatio < 0.5) {
    return {
      ...base,
      status: 'good',
      trend: 'same',
      headline: 'The team finishes work at a steady pace.',
      title: 'The team finishes work at a steady pace',
      seen: `Between ${Math.min(...weeks)} and ${Math.max(...weeks)} issues reached ${input.toStage} every week for the last 8 weeks.`,
      why: 'A steady pace lets the team make reliable forecasts about how much will be done by a date.',
      action: "Use the forecast tab to answer 'how much by when' questions with this pace.",
    }
  }
  return {
    ...base,
    status: 'watch',
    trend: 'same',
    headline: 'The pace of finishing work is uneven.',
    title: 'The pace of finishing work is uneven',
    seen: `Between ${Math.min(...weeks)} and ${Math.max(...weeks)} issues reached ${input.toStage} per week over the last 8 weeks.`,
    why: 'An uneven pace makes forecasts less certain. It usually means work arrives in big batches, or some issues are much bigger than others.',
    action: 'Split work into smaller issues, and finish them one at a time rather than in batches.',
  }
}

function spread({ timeline, now }: Context): CoachFinding | null {
  const times = finishedBetween(timeline, 0, now).map((f) => f.cycleTimeDays)
  if (times.length < 20) return null
  const p50 = percentile(times, 50) as number
  const p95 = percentile(times, 95) as number
  if (p95 < p50 * 6) return null

  return {
    id: 'spread',
    status: 'watch',
    trend: null,
    headline: 'Some issues take far longer than the rest.',
    title: 'Some issues take far longer than the rest',
    seen: `Half of finished issues took ${formatDuration(p50)} or less, but 1 in 20 took longer than ${formatDuration(p95)}.`,
    why: 'When a few issues take much longer than the rest, forecasts get less certain. The slow ones are usually too big, or got blocked.',
    action:
      'Look at the slowest issues on the cycle time chart. Split work that looks big before starting it, and make blocked work visible.',
    chart: 'cycle-time',
    series: null,
  }
}
