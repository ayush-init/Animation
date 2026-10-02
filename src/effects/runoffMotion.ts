export type Runoff = {
  x: number; y: number; speed: number; radius: number; remaining: number
  phase: number; vx: number; steering: number; turnIn: number; pinnedFor: number; pinIn: number
}

export function createRunoff(x: number, y: number, random = Math.random): Runoff {
  return {
    x, y, speed: 8 + random() * 10, radius: 5.5 + random() * 2.5,
    remaining: 160 + random() * 320, phase: random() * Math.PI * 2,
    vx: 0, steering: (random() - .5) * .9, turnIn: .15 + random() * .3,
    pinnedFor: .12 + random() * .3, pinIn: .6 + random() * 1.6,
  }
}

// Surface imperfections change the downhill direction. Motion has inertia,
// short adhesion pauses, and release bursts rather than a repeating sine wave.
export function advanceRunoff(drop: Runoff, elapsed: number, random = Math.random) {
  const dt = Math.max(0, Math.min(elapsed, .05))
  if (drop.pinnedFor > 0) {
    drop.pinnedFor = Math.max(0, drop.pinnedFor - dt)
    drop.speed *= Math.exp(-dt * 6)
    drop.vx *= Math.exp(-dt * 10)
    return
  }
  drop.pinIn -= dt
  if (drop.pinIn <= 0) {
    drop.pinnedFor = .08 + random() * .34
    drop.pinIn = .65 + random() * 1.8
    return
  }
  drop.turnIn -= dt
  if (drop.turnIn <= 0) {
    drop.steering = (random() - .5) * 1.5
    drop.turnIn = .17 + random() * .48
  }
  drop.speed = Math.min(145, drop.speed + dt * (48 + drop.radius * 3))
  const targetVx = drop.steering * drop.speed
  drop.vx += (targetVx - drop.vx) * (1 - Math.exp(-dt * 7))
  const travel = Math.min(drop.remaining, drop.speed * dt)
  drop.x += drop.vx * dt
  drop.y += travel
  drop.remaining = Math.max(0, drop.remaining - travel)
}
