/**
 * The primary representation of a Work Item for use in *analysis*.
 *
 * This type is serialisable to CSV, which is also Oselvar's basic data format for connecting
 * to external sources.
 */
export type WorkItem<Stage extends string> = Readonly<
  {
    id: string
    name?: string
  } & StageTimestamps<Stage> &
    Labels
>

type Labels = Readonly<{
  labels: string
}>

export type StageTimestamps<Stage extends string> = Partial<Record<Stage, Date | undefined | null>>

/**
 * The primary representation of a Work Item for use in *connectors*.
 *
 * It is useful when the system does not provide a set of stage/timestamp
 * pairs for each work item.
 *
 * If the system provides a list of events for the work item, the
 * `toWorkItem` function can then be used to flatten it to a set of stage/timestamp
 * pairs.
 *
 * This conversion detects when a work item has flowed backwards,
 * and treats it as if the work item had never moved foward. This way the internal
 * model always represents forward flow.
 *
 * This makes analysis calculations and results easier to interpret.
 * It also more accurately represents what *really* happened.
 *
 * * Moving backwards means acknowledging a mistake, that the forward move
 *   should not have been done.
 *
 * "We moved from doing to done. Then back to doing because we found a bug".
 * That's accounted for as if the work item never left doing. The move to done was a mistake,
 * and the way we know that is that we acknowledged a mistake.
 *
 * Many systems provide a list of events for each work items.
 */
export type HistoricWorkItem<Stage extends string> = Readonly<{
  id: string
  name: string
  labels: readonly string[]
  snapshots: readonly WorkItemSnapshot<Stage>[]
}>

export type WorkItemSnapshot<Stage extends string> = Readonly<{
  timestamp: Date
  stage: Stage
}>
