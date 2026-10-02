import { SpatialGrid, type SpatialItem } from '../utils/spatialGrid'
import { perlin2D } from '../utils/noise'

export interface Droplet extends SpatialItem {
  vx: number
  vy: number
  ax: number
  ay: number
  opacity: number
  life: number
  isStatic: boolean
  tension: number
  wobble: number
  wobblePhase: number
  elongation: number
  meanderOffset: number
  trailTimer: number
  hesitationTimer: number
  trailWidth: number
  type: 'ambient' | 'wipe' | 'trickle'
}

export interface DropletTrailPoint {
  x: number
  y: number
  radius: number
  opacity: number
}

export interface PhysicsConfig {
  gravity: number
  friction: number
  maxDroplets: number
  surfaceTensionThreshold: number
  meanderIntensity: number
  shedTrailInterval: number
}

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: 260, // downward gravity acceleration in px/s^2
  friction: 0.982,
  maxDroplets: 150, // Keep total droplet count organic and realistic (not thousands!)
  surfaceTensionThreshold: 6.5,
  meanderIntensity: 22,
  shedTrailInterval: 0.025, // High frequency sampling for smooth, unbroken thin trickles
}

export class DropletPhysics {
  public droplets: Droplet[] = []
  private nextId = 1
  private grid: SpatialGrid<Droplet>
  private width = window.innerWidth
  private height = window.innerHeight
  private config: PhysicsConfig
  public newTrails: DropletTrailPoint[] = []

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.grid = new SpatialGrid<Droplet>(45)
  }

  public resize(width: number, height: number) {
    const scaleX = width / (this.width || 1)
    const scaleY = height / (this.height || 1)
    this.width = width
    this.height = height

    for (const d of this.droplets) {
      d.x *= scaleX
      d.y *= scaleY
    }
  }

  /**
   * Initializes a sparse, realistic collection of droplets across the window:
   * Mostly stationary beads clinging to glass, only 1-2 occasionally sliding.
   */
  public initAmbientDroplets(count = 25) {
    this.droplets = []
    this.nextId = 1
    for (let i = 0; i < count; i++) {
      const isSliding = i < 2 // only 1-2 active sliding droplets initially
      const radius = isSliding ? 7 + Math.random() * 4 : 3.5 + Math.random() * 5

      const d: Droplet = {
        id: this.nextId++,
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius,
        vx: (Math.random() - 0.5) * 3,
        vy: isSliding ? 25 + Math.random() * 40 : 0,
        ax: 0,
        ay: 0,
        opacity: 0.95,
        life: 1.0,
        isStatic: !isSliding,
        tension: isSliding ? 0.3 : 1.0,
        wobble: isSliding ? 0.35 : 0,
        wobblePhase: Math.random() * Math.PI * 2,
        elongation: 1.0,
        meanderOffset: Math.random() * 1000,
        trailTimer: 0,
        hesitationTimer: Math.random() * 2.0,
        trailWidth: Math.max(1.8, radius * 0.3),
        type: 'ambient',
      }
      this.droplets.push(d)
    }
  }

  /**
   * Spawns a trickling droplet from touch or wipe edge that slides down naturally
   */
  public spawnTrickleDroplet(x: number, y: number, initialRadius = 7.5): Droplet | null {
    if (this.droplets.length >= this.config.maxDroplets) return null

    const radius = initialRadius + Math.random() * 2.5
    const droplet: Droplet = {
      id: this.nextId++,
      x,
      y,
      radius,
      vx: (Math.random() - 0.5) * 6,
      vy: 18 + Math.random() * 28, // begins gentle descent
      ax: 0,
      ay: 0,
      opacity: 0.98,
      life: 1.0,
      isStatic: false,
      tension: 0.25,
      wobble: 0.5,
      wobblePhase: Math.random() * Math.PI * 2,
      elongation: 1.12,
      meanderOffset: Math.random() * 1000,
      trailTimer: 0,
      hesitationTimer: 0.5 + Math.random() * 1.2,
      trailWidth: Math.max(2.0, radius * 0.32),
      type: 'trickle',
    }

    this.droplets.push(droplet)

    // Immediate thin trail point
    this.newTrails.push({
      x,
      y,
      radius: droplet.trailWidth,
      opacity: 0.95,
    })

    return droplet
  }

  /**
   * Spawns tiny water beads around the boundary of a wipe stroke
   */
  public spawnWipeEdgeBeads(x: number, y: number, count = 2) {
    if (this.droplets.length >= this.config.maxDroplets) return

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 12 + Math.random() * 20
      const px = x + Math.cos(angle) * dist
      const py = y + Math.sin(angle) * dist

      if (px < 0 || px > this.width || py < 0 || py > this.height) continue

      const radius = 2.0 + Math.random() * 2.5
      const droplet: Droplet = {
        id: this.nextId++,
        x: px,
        y: py,
        radius,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        opacity: 0.92,
        life: 1.0,
        isStatic: true,
        tension: 1.0,
        wobble: 0.1,
        wobblePhase: 0,
        elongation: 1.0,
        meanderOffset: Math.random() * 1000,
        trailTimer: 0,
        hesitationTimer: 5.0,
        trailWidth: 1.5,
        type: 'wipe',
      }
      this.droplets.push(droplet)
    }
  }

  public nudgeAt(x: number, y: number, radius: number, impulseX: number, impulseY: number) {
    const nearby = this.grid.query(x, y, radius + 25)
    for (const d of nearby) {
      const dx = d.x - x
      const dy = d.y - y
      const dist = Math.hypot(dx, dy)
      if (dist < radius + d.radius) {
        d.isStatic = false
        const factor = 1 - dist / (radius + d.radius)
        d.vx += impulseX * factor * 0.4 + (Math.random() - 0.5) * 8
        d.vy += Math.max(impulseY * factor * 0.4, 25)
        d.wobble = Math.min(1.0, d.wobble + 0.35)
      }
    }
  }

  public update(dt: number) {
    const delta = Math.min(dt, 0.05)
    this.newTrails = []

    // 1. Rebuild spatial grid
    this.grid.clear()
    for (const d of this.droplets) {
      this.grid.insert(d)
    }

    // 2. Realistic droplet merging
    const mergedIds = new Set<number>()

    for (let i = 0; i < this.droplets.length; i++) {
      const a = this.droplets[i]
      if (mergedIds.has(a.id)) continue

      const neighbors = this.grid.query(a.x, a.y, a.radius + 25)
      for (let j = 0; j < neighbors.length; j++) {
        const b = neighbors[j]
        if (a.id === b.id || mergedIds.has(b.id)) continue

        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        const combinedR = a.radius + b.radius

        // Merge when two droplets touch
        if (dist < combinedR * 0.88) {
          mergedIds.add(b.id)

          // Area / volume conservation
          const newRadius = Math.min(22, Math.sqrt(a.radius * a.radius + b.radius * b.radius))
          const massA = a.radius * a.radius
          const massB = b.radius * b.radius
          const totalMass = massA + massB

          a.x = (a.x * massA + b.x * massB) / totalMass
          a.y = (a.y * massA + b.y * massB) / totalMass
          a.radius = newRadius
          a.trailWidth = Math.max(2.0, newRadius * 0.32)

          // Downward momentum surge
          a.isStatic = false
          const maxVy = Math.max(a.vy, b.vy)
          a.vy = Math.max(maxVy * 1.12 + 20, 38)
          a.vx = (a.vx * massA + b.vx * massB) / totalMass
          a.wobble = 0.85
          a.wobblePhase = 0
          a.tension = Math.max(0.15, a.tension - 0.25)

          this.newTrails.push({
            x: a.x,
            y: a.y,
            radius: a.trailWidth * 1.2,
            opacity: 0.95,
          })
        }
      }
    }

    if (mergedIds.size > 0) {
      this.droplets = this.droplets.filter((d) => !mergedIds.has(d.id))
    }

    // 3. Physics integration: gravity, stick-slip, meandering, and thin trails
    for (const d of this.droplets) {
      if (!d.isStatic) {
        // Stick-slip friction / surface tension hesitation
        d.hesitationTimer -= delta
        let speedMultiplier = 1.0
        if (d.hesitationTimer <= 0) {
          if (d.hesitationTimer < -0.25) {
            d.hesitationTimer = 1.2 + Math.random() * 2.5 // pause interval
          } else {
            speedMultiplier = 0.45 // temporary hesitation
          }
        }

        // Gravity scales with mass
        const massScale = Math.pow(d.radius / 6, 1.25)
        const gravity = (this.config.gravity + massScale * 50) * speedMultiplier

        d.vy += gravity * delta
        d.vx *= Math.pow(this.config.friction, delta * 60)
        d.vy *= Math.pow(this.config.friction, delta * 60)

        // Organic lateral meandering
        const meander = perlin2D(d.x * 0.007, (d.y + d.meanderOffset) * 0.01)
        d.vx += meander * this.config.meanderIntensity * delta

        d.x += d.vx * delta
        d.y += d.vy * delta

        // Water accumulation as droplet slides through condensation
        d.radius = Math.min(22, d.radius + delta * 0.35)
        d.trailWidth = Math.max(2.0, d.radius * 0.32)

        // Elongation stretches teardrop with speed
        const speed = Math.hypot(d.vx, d.vy)
        d.elongation = 1.0 + Math.min(0.75, speed * 0.0035)

        // Wobble dampening
        if (d.wobble > 0.01) {
          d.wobblePhase += delta * 16
          d.wobble *= Math.pow(0.92, delta * 60)
        } else {
          d.wobble = 0
        }

        // Emit continuous thin wet trickle trail
        d.trailTimer += delta
        if (d.trailTimer >= this.config.shedTrailInterval) {
          d.trailTimer = 0
          this.newTrails.push({
            x: d.x,
            y: d.y - d.radius * 0.4,
            radius: d.trailWidth,
            opacity: 0.92,
          })

          // Large droplets occasionally shed a tiny stationary bead behind
          if (d.radius > 11 && Math.random() < 0.18 && this.droplets.length < this.config.maxDroplets) {
            const shedR = 1.8 + Math.random() * 1.5
            d.radius = Math.max(7.0, Math.sqrt(d.radius * d.radius - shedR * shedR))
            this.droplets.push({
              id: this.nextId++,
              x: d.x + (Math.random() - 0.5) * 3,
              y: d.y - d.radius * 1.3,
              radius: shedR,
              vx: 0,
              vy: 0,
              ax: 0,
              ay: 0,
              opacity: 0.9,
              life: 1.0,
              isStatic: true,
              tension: 1.0,
              wobble: 0.1,
              wobblePhase: 0,
              elongation: 1.0,
              meanderOffset: Math.random() * 1000,
              trailTimer: 0,
              hesitationTimer: 3.0,
              trailWidth: 1.4,
              type: 'trickle',
            })
          }
        }
      }
    }

    // 4. Remove droplets that left bottom or sides
    this.droplets = this.droplets.filter(
      (d) => d.y < this.height + 60 && d.x > -60 && d.x < this.width + 60
    )

    // 5. Occasionally release an ambient trickle from top
    if (this.droplets.filter((d) => !d.isStatic).length < 2 && Math.random() < 0.04) {
      this.spawnTrickleDroplet(Math.random() * this.width, -10, 6 + Math.random() * 3)
    }
  }
}
