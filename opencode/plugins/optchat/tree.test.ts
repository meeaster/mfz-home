import { expect, test } from "vitest"
import { first, shrink, type Entry } from "./tree.js"

interface States {
  readonly keep: 0 | 1
  readonly state: number
  readonly older: States | null
}

// Taelin's rollback push with `life` fixed at 0.
const push = (state: number, states: States | null): States => {
  if (states === null) return { keep: 0, state, older: null }

  if (states.keep === 0) return { ...states, keep: 1 }

  return { keep: 0, state, older: push(states.state, states.older) }
}

const starts = (states: States | null): number[] => {
  const result: number[] = []

  for (let cursor = states; cursor !== null; cursor = cursor.older) result.unshift(cursor.state)

  return result
}

test("most-due merging with push's length as budget reproduces push", () => {
  let states: States | null = null
  let view: Entry[] = []
  const mismatches: number[] = []

  for (let t = 0; t <= 20_000; t++) {
    states = push(t, states)

    const budget = starts(states).length

    view = shrink({
      view: [...view, [0, t]],
      total: t + 1,
      isBuilt: () => true,
      done: (candidate) => candidate.length <= budget,
    })

    if (view.map(first).join() !== starts(states).join()) mismatches.push(t)
  }

  expect(mismatches).toEqual([])
})
