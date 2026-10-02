import assert from 'node:assert/strict'
import { createRunoff, advanceRunoff } from '../src/effects/runoffMotion.ts'

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
for (const hz of [30, 60, 120]) {
  const random = seeded(42)
  const drop = createRunoff(200, 50, random)
  const initialDistance = drop.remaining
  let pauses = 0, left = false, right = false
  for (let frame = 0; frame < hz * 20 && drop.remaining > 0; frame++) {
    const x = drop.x, y = drop.y
    advanceRunoff(drop, 1 / hz, random)
    assert.ok(Number.isFinite(drop.x) && Number.isFinite(drop.y))
    assert.ok(drop.y >= y, 'Gravity must not move water upward')
    if (drop.y === y) pauses++
    if (drop.x < x - .01) left = true
    if (drop.x > x + .01) right = true
  }
  assert.ok(pauses > 0, 'Water should stick before sliding')
  assert.ok(left && right, 'Runoff should bend in both directions')
  assert.equal(drop.remaining, 0)
  assert.ok(Math.abs(drop.y - 50 - initialDistance) < .00001)
}
console.log('Runoff checks passed at 30, 60 and 120 updates per second.')
