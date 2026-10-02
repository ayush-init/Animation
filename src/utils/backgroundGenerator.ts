import * as THREE from 'three'

/**
 * Generates a rich, warm cinematic background scene matching the reference screenshots:
 * Warm interior/lifestyle lighting with golden amber tones, architectural framing,
 * soft ambient depth, and vivid contrast that looks spectacular when wiped clean.
 */
export function generateCinematicBackground(width = 2048, height = 1280): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // 1. Base Warm Ambient Lighting (Cozy interior / warm sunset backlight)
  const baseGrad = ctx.createLinearGradient(0, 0, width, height)
  baseGrad.addColorStop(0.0, '#1c1512') // Deep rich charcoal umber
  baseGrad.addColorStop(0.25, '#4a2f1c') // Warm amber shadow
  baseGrad.addColorStop(0.5, '#b87333') // Glowing copper / warm terracotta
  baseGrad.addColorStop(0.75, '#e89e58') // Golden apricot glow
  baseGrad.addColorStop(1.0, '#fcedc0') // Bright warm backlight

  ctx.fillStyle = baseGrad
  ctx.fillRect(0, 0, width, height)

  // 2. Architectural & Window Frame Silhouettes (Creating depth and structure)
  ctx.save()
  // Distant warm room elements
  ctx.fillStyle = 'rgba(45, 26, 16, 0.65)'
  ctx.fillRect(0, height * 0.55, width * 0.45, height * 0.45)

  // Soft window pillar / divide
  ctx.fillStyle = 'rgba(25, 15, 10, 0.45)'
  ctx.fillRect(width * 0.42, 0, width * 0.08, height)
  ctx.restore()

  // 3. Cinematic Human Silhouette / Portrait Shapes (matching screenshot scene)
  ctx.save()
  // Figure 1 (Left - Warm backlit silhouette)
  ctx.fillStyle = 'rgba(38, 22, 14, 0.85)'
  ctx.beginPath()
  ctx.arc(width * 0.32, height * 0.42, width * 0.09, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(width * 0.22, height)
  ctx.quadraticCurveTo(width * 0.32, height * 0.48, width * 0.42, height)
  ctx.fill()

  // Soft skin tone & hair highlights on figure
  const rimGrad = ctx.createRadialGradient(
    width * 0.35,
    height * 0.38,
    width * 0.02,
    width * 0.32,
    height * 0.42,
    width * 0.09
  )
  rimGrad.addColorStop(0, 'rgba(255, 205, 165, 0.75)')
  rimGrad.addColorStop(0.5, 'rgba(215, 145, 105, 0.35)')
  rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = rimGrad
  ctx.beginPath()
  ctx.arc(width * 0.32, height * 0.42, width * 0.09, 0, Math.PI * 2)
  ctx.fill()

  // Figure 2 (Right - In conversation, matching screenshot composition)
  ctx.fillStyle = 'rgba(48, 28, 22, 0.82)'
  ctx.beginPath()
  ctx.arc(width * 0.58, height * 0.38, width * 0.075, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(width * 0.48, height)
  ctx.quadraticCurveTo(width * 0.58, height * 0.45, width * 0.68, height)
  ctx.fill()

  // Figure 2 Warm Edge Highlight
  const rimGrad2 = ctx.createRadialGradient(
    width * 0.60,
    height * 0.35,
    width * 0.015,
    width * 0.58,
    height * 0.38,
    width * 0.075
  )
  rimGrad2.addColorStop(0, 'rgba(255, 225, 190, 0.85)')
  rimGrad2.addColorStop(0.6, 'rgba(230, 160, 110, 0.3)')
  rimGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = rimGrad2
  ctx.beginPath()
  ctx.arc(width * 0.58, height * 0.38, width * 0.075, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 4. Luminous Warm Lighting & Bokeh Orbs (Giving cinematic depth)
  const bokehLights = [
    { x: 0.18, y: 0.22, r: 0.08, color: 'rgba(255, 195, 120, 0.45)' },
    { x: 0.75, y: 0.28, r: 0.12, color: 'rgba(255, 225, 160, 0.55)' },
    { x: 0.85, y: 0.45, r: 0.09, color: 'rgba(240, 150, 90, 0.4)' },
    { x: 0.50, y: 0.18, r: 0.15, color: 'rgba(255, 240, 200, 0.35)' },
    { x: 0.08, y: 0.68, r: 0.07, color: 'rgba(210, 110, 60, 0.35)' },
    { x: 0.92, y: 0.75, r: 0.10, color: 'rgba(255, 180, 100, 0.45)' },
  ]

  for (const b of bokehLights) {
    const cx = b.x * width
    const cy = b.y * height
    const rad = b.r * width
    const grad = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad)
    grad.addColorStop(0, b.color)
    grad.addColorStop(0.6, b.color.replace(/[\d.]+\)$/, '0.15)'))
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  // 5. Subtle Typography / Editorial Elements in the background (like the screenshot UI behind glass)
  ctx.save()
  ctx.font = `600 ${Math.floor(width * 0.016)}px -apple-system, sans-serif`
  ctx.fillStyle = 'rgba(255, 245, 230, 0.45)'
  ctx.letterSpacing = '4px'
  ctx.fillText('COMMUNITY   PRODUCING   AGENCY   GALLERY', width * 0.45, height * 0.12)
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  return texture
}
