import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createFogMaterial } from '../effects/fogShader'
import { InteractionLayer } from './InteractionLayer'
import { generateCinematicBackground } from '../utils/backgroundGenerator'
import tonyImage from '../assets/tony.jpg'

export function FoggyGlass() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mask, setMask] = useState<THREE.CanvasTexture | null>(null)
  const [dry, setDry] = useState<THREE.CanvasTexture | null>(null)
  const [water, setWater] = useState<THREE.CanvasTexture | null>(null)
  const [touched, setTouched] = useState(false)
  const [size, setSize] = useState({ width: innerWidth, height: innerHeight })

  useEffect(() => {
    if (!canvasRef.current || !mask || !water || !dry) return
    let disposed = false
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: false })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.setSize(innerWidth, innerHeight)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    let background: THREE.Texture = generateCinematicBackground(2048, 1280)
    let blurred: THREE.Texture = background
    const material = createFogMaterial(background, mask, innerWidth, innerHeight, 2048, 1280)
    material.uniforms.uDryMask = { value: dry }
    material.uniforms.uWater = { value: water }
    material.uniforms.uBlurred = { value: blurred }
    const geometry = new THREE.PlaneGeometry(2, 2)
    scene.add(new THREE.Mesh(geometry, material))
    new THREE.TextureLoader().load(tonyImage, texture => {
      if (disposed) { texture.dispose(); return }
      background.dispose()
      background = texture
      texture.colorSpace = THREE.SRGBColorSpace
      const image = texture.image as HTMLImageElement
      // Pre-diffuse the photograph once for smooth scattering without noisy multi-tap blur.
      const diffusion = document.createElement('canvas')
      diffusion.width = image.naturalWidth
      diffusion.height = image.naturalHeight
      const context = diffusion.getContext('2d')!
      context.filter = `blur(${Math.max(7, image.naturalWidth * 0.006)}px)`
      context.drawImage(image, 0, 0, diffusion.width, diffusion.height)
      blurred = new THREE.CanvasTexture(diffusion)
      blurred.colorSpace = THREE.SRGBColorSpace
      material.uniforms.uBackground.value = background
      material.uniforms.uBlurred.value = blurred
      material.uniforms.uImageResolution.value.set(image.naturalWidth, image.naturalHeight)
    })
    let frame = 0
    const render = () => {
      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    render()
    const resize = () => {
      setSize({ width: innerWidth, height: innerHeight })
      renderer.setSize(innerWidth, innerHeight)
      material.uniforms.uResolution.value.set(innerWidth, innerHeight)
    }
    window.addEventListener('resize', resize)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      if (blurred !== background) blurred.dispose()
      background.dispose()
      renderer.dispose()
    }
  }, [mask, water, dry])

  return <main style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', background: '#b6b8bb' }}>
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    <InteractionLayer width={size.width} height={size.height} onMaskTextureReady={setMask} onWaterTextureReady={setWater} onDryTextureReady={setDry} onFirstInteraction={() => setTouched(true)} />
    <div style={{ position: 'absolute', bottom: 32, width: '100%', textAlign: 'center', pointerEvents: 'none', color: 'rgba(255,255,255,.85)', font: '12px system-ui', letterSpacing: '.16em', textShadow: '0 1px 8px #34383d', opacity: touched ? 0 : 1, transition: 'opacity .6s' }}>TOUCH THE GLASS · DRAG TO CLEAR</div>
  </main>
}

