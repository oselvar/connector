export function makeMapFromString(mapping: string): Map<string, string> {
  const arrays = mapping
    .split(',')
    .map((stage) => stage.trim())
    .filter((stage) => stage !== '')
    .map((stage) => stage.split(':'))

  const map = new Map()
  for (const array of arrays) {
    const to = array[array.length - 1]
    if (array.length === 1) {
      map.set(to, to)
    } else {
      for (const from of array.slice(0, array.length - 1)) {
        map.set(from, to)
      }
    }
  }
  return map
}

export function orderedMapValues<Stage extends string>(map: Map<string, Stage>): readonly Stage[] {
  return [...new Set(map.values())]
}
