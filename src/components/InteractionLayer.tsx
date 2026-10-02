import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = {
  width: number
  height: number
  onMaskTextureReady: (texture: THREE.CanvasTexture) => void
  onDryTextureReady: (texture: THREE.CanvasTexture) => void
  onWaterTextureReady: (texture: THREE.CanvasTexture) => void
  onFirstInteraction?: () => void
}
type Runoff = { x: number; y: number; startY: number; speed: number; radius: number; remaining: number; phase: number }

export function InteractionLayer({ width, height, onMaskTextureReady, onWaterTextureReady, onDryTextureReady, onFirstInteraction }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const texture = useRef<THREE.CanvasTexture | null>(null)
  const dryCanvas = useRef<HTMLCanvasElement | null>(null)
  const dryTexture = useRef<THREE.CanvasTexture | null>(null)
  const waterCanvas = useRef<HTMLCanvasElement | null>(null)
  const trailCanvas = useRef<HTMLCanvasElement | null>(null)
  const waterTexture = useRef<THREE.CanvasTexture | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const runoff = useRef<Runoff[]>([])
  const distance = useRef(0)

  useEffect(() => {
    const surface = canvas.current!
    surface.width = width
    surface.height = height
    const ctx = surface.getContext('2d')!
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)
    runoff.current = []
    const tex = new THREE.CanvasTexture(surface)
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    texture.current = tex
    onMaskTextureReady(tex)
    const dry = document.createElement('canvas')
    dry.width = width
    dry.height = height
    dryCanvas.current = dry
    const dryTex = new THREE.CanvasTexture(dry)
    dryTex.minFilter = dryTex.magFilter = THREE.LinearFilter
    dryTex.generateMipmaps = false
    dryTexture.current = dryTex
    onDryTextureReady(dryTex)
    const water = document.createElement('canvas')
    const trails = document.createElement('canvas')
    water.width = trails.width = width
    water.height = trails.height = height
    waterCanvas.current = water
    trailCanvas.current = trails
    const waterTex = new THREE.CanvasTexture(water)
    waterTex.minFilter = waterTex.magFilter = THREE.LinearFilter
    waterTex.generateMipmaps = false
    waterTexture.current = waterTex
    onWaterTextureReady(waterTex)
    return () => { tex.dispose(); waterTex.dispose(); dryTex.dispose() }
  }, [width, height, onMaskTextureReady, onWaterTextureReady, onDryTextureReady])

  // A nearly sharp, irregular liquid boundary, rather than a soft airbrush eraser.
  const stamp = (x: number, y: number, radius: number) => {
    // Keep fingertip-dried glass distinct from channels cleared by flowing water.
    for (const surface of [canvas.current!, dryCanvas.current!]) {
      const ctx = surface.getContext('2d')!
      ctx.save()
      ctx.globalCompositeOperation = 'lighten'
      ctx.translate(x, y)
      ctx.scale(1, 1.08)
      const gradient = ctx.createRadialGradient(0, 0, radius * .83, 0, 0, radius)
      gradient.addColorStop(0, 'white')
      gradient.addColorStop(.48, '#fafafa')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * Math.PI * 2
        const r = radius * (1 + .025 * Math.sin(a * 5 + x * .015) + .017 * Math.cos(a * 9 + y * .01))
        const px = Math.cos(a) * r, py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    // A wipe physically removes moving beads too, so they cannot redraw themselves.
    runoff.current = runoff.current.filter(drop =>
      Math.hypot(drop.x - x, (drop.y - y) / 1.08) > radius + drop.radius)
    if (dryTexture.current) dryTexture.current.needsUpdate = true
  }

  const clear = (x: number, y: number, first: boolean) => {
    const radius = 25
    const previous = last.current ?? { x, y }
    const length = Math.hypot(x - previous.x, y - previous.y)
    const steps = Math.max(1, Math.ceil(length / 4))
    for (let i = 1; i <= steps; i++) stamp(previous.x + (x - previous.x) * i / steps, previous.y + (y - previous.y) * i / steps, radius)
    distance.current += length
    if (first || distance.current > radius * 3.5) {
      distance.current = 0
      // Only collect moisture from still-fogged glass. Repeated clicks in a clear
      // patch must not manufacture new water.
      const ctx = canvas.current!.getContext('2d')!
      for (const offset of [-.36, .48]) {
        const px = x + radius * offset
        const py = y + radius * Math.sqrt(1 - offset * offset) * 1.05
        if (px < 0 || px >= width || py < 0 || py >= height) continue
        const wet = ctx.getImageData(Math.floor(px), Math.floor(py + 3), 1, 1).data[0]
        if (wet > 180 || runoff.current.length >= 70) continue
        runoff.current.push({ x: px, y: py + 6, startY: py, speed: 4 + Math.random() * 10, radius: 3.3 + Math.random() * 1.9, remaining: 110 + Math.random() * 230, phase: Math.random() * 6.28 })
      }
    }
    last.current = { x, y }
    texture.current!.needsUpdate = true
  }

  useEffect(() => {
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, .05)
      previous = now
      const ctx = canvas.current?.getContext('2d')
      const water = waterCanvas.current?.getContext('2d')
      const trails = trailCanvas.current?.getContext('2d')
      if (ctx && water && trails) {
        const dry = dryCanvas.current!.getContext('2d')!
        // Water entering an already dried patch is removed instead of crossing it.
        runoff.current = runoff.current.filter(drop => {
          const x = Math.max(0, Math.min(width - 1, Math.floor(drop.x)))
          const y = Math.max(0, Math.min(height - 1, Math.floor(drop.y)))
          return dry.getImageData(x, y, 1, 1).data[3] < 100
        })
        ctx.save()
        ctx.globalCompositeOperation = 'lighten'
        ctx.lineCap = 'round'
        for (const drop of runoff.current) {
          const oldX = drop.x, oldY = drop.y
          // Surface tension produces a brief stick/slip motion before gravity wins.
          const slip = .45 + .55 * Math.pow(Math.sin(now * .0016 + drop.phase), 2)
          drop.speed = Math.min(115, drop.speed + dt * 19)
          const travel = Math.min(drop.remaining, drop.speed * dt * slip)
          drop.y += travel
          drop.x += Math.sin((drop.y - drop.startY) * .035 + drop.phase) * travel * .065
          drop.remaining -= travel
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = drop.radius * .92
          ctx.beginPath()
          ctx.moveTo(oldX, oldY)
          ctx.lineTo(drop.x, drop.y)
          ctx.stroke()
          // Retain a narrow film of water in the wake, separate from the clearing mask.
          trails.save()
          trails.lineCap = 'round'
          trails.strokeStyle = 'rgba(255,255,255,.24)'
          trails.lineWidth = drop.radius * .80
          trails.shadowColor = 'rgba(255,255,255,.35)'
          trails.shadowBlur = 1.5
          trails.beginPath()
          trails.moveTo(oldX, oldY)
          trails.lineTo(drop.x, drop.y)
          trails.stroke()
          trails.restore()
        }
        ctx.restore()
        // Erase old trails and settled droplets wherever the user has wiped.
        trails.save()
        trails.globalCompositeOperation = 'destination-out'
        trails.drawImage(dryCanvas.current!, 0, 0)
        trails.restore()
        water.clearRect(0, 0, width, height)
        water.drawImage(trailCanvas.current!, 0, 0)
        for (const drop of runoff.current) {
          water.save()
          water.translate(drop.x, drop.y)
          water.scale(1, 1.2 + drop.speed / 230)
          const dome = water.createRadialGradient(0, 0, 0, 0, 0, drop.radius)
          dome.addColorStop(0, 'white')
          dome.addColorStop(.45, '#d9d9d9')
          dome.addColorStop(.8, '#808080')
          dome.addColorStop(1, 'rgba(0,0,0,0)')
          water.fillStyle = dome
          water.beginPath()
          water.arc(0, 0, drop.radius, 0, Math.PI * 2)
          water.fill()
          water.restore()
        }
        water.save()
        water.globalCompositeOperation = 'destination-out'
        water.drawImage(dryCanvas.current!, 0, 0)
        water.restore()
        if (waterTexture.current) waterTexture.current.needsUpdate = true
        for (const drop of runoff.current) {
          if (drop.remaining <= 0) {
            trails.drawImage(waterCanvas.current!, Math.floor(drop.x - 7), Math.floor(drop.y - 10), 14, 20, Math.floor(drop.x - 7), Math.floor(drop.y - 10), 14, 20)
          }
        }
        runoff.current = runoff.current.filter(d => d.remaining > 0 && d.y < height + 8)
        if (texture.current) texture.current.needsUpdate = true
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [width, height])

  return <div aria-label="Fogged glass. Press and drag to clear condensation." style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none', cursor: 'crosshair' }}
    onPointerDown={e => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      last.current = null
      onFirstInteraction?.()
      clear(e.clientX, e.clientY, true)
    }}
    onPointerMove={e => { if (last.current && e.currentTarget.hasPointerCapture(e.pointerId)) clear(e.clientX, e.clientY, false) }}
    onPointerUp={e => { last.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
    onPointerCancel={() => { last.current = null }}
    onLostPointerCapture={() => { last.current = null }}>
    <canvas ref={canvas} style={{ display: 'none' }} />
  </div>
}


