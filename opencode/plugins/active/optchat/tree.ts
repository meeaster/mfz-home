// Pure tree and view arithmetic. A node (l, i) covers the 2^l messages from i·2^l on.

export type Entry = readonly [level: number, index: number]

export const first = ([level, index]: Entry): number => index * 2 ** level

export const span = ([level]: Entry): number => 2 ** level

export const last = (entry: Entry): number => first(entry) + span(entry) - 1

export const key = ([level, index]: Entry): string => `${level}:${index}`

export const label = (entry: Entry): string => `${first(entry)}+${span(entry)}`

export const parent = ([level, index]: Entry): Entry => [level + 1, Math.floor(index / 2)]

export const sibling = ([level, index]: Entry): Entry => [level, index % 2 === 0 ? index + 1 : index - 1]

export const children = ([level, index]: Entry): readonly [Entry, Entry] => [
  [level - 1, index * 2],
  [level - 1, index * 2 + 1],
]

/** Parses a zoom target `id+n`; n must be a power of two and id a multiple of n. */
export const fromLabel = (id: number, n: number): Entry | undefined => {
  if (!Number.isInteger(id) || !Number.isInteger(n) || id < 0 || n < 1) return undefined

  const level = Math.log2(n)

  if (!Number.isInteger(level) || id % n !== 0) return undefined

  return [level, id / n]
}

export interface ShrinkInput {
  readonly view: readonly Entry[]
  readonly total: number
  readonly isBuilt: (entry: Entry) => boolean
  readonly done: (view: readonly Entry[]) => boolean
}

/**
 * Merges the most due sibling pair whose parent is built, oldest first among ties,
 * until `done` holds or no pair can merge. due = (T - last) / 2^l.
 */
export const shrink = ({ view, total, isBuilt, done }: ShrinkInput): Entry[] => {
  const next = [...view]

  while (!done(next)) {
    let best: { position: number; due: number } | undefined

    for (let position = 0; position + 1 < next.length; position++) {
      const a = next[position]
      const b = next[position + 1]

      if (a === undefined || b === undefined) continue

      const pairs = a[0] === b[0] && a[1] % 2 === 0 && b[1] === a[1] + 1

      if (!pairs || !isBuilt(parent(a))) continue

      const due = (total - last(b)) / span(b)

      if (best === undefined || due > best.due) best = { position, due }
    }

    if (best === undefined) break

    const merged = next[best.position]

    if (merged === undefined) break

    next.splice(best.position, 2, parent(merged))
  }

  return next
}
