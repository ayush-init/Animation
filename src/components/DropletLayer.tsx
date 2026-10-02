import * as THREE from 'three'
import dropletVert from '../shaders/droplet.vert'
import dropletFrag from '../shaders/droplet.frag'
import type { Droplet } from '../effects/dropletPhysics'

export interface DropletLayerProps {
  maxDroplets?: number
  backgroundTexture: THREE.Texture | null
  width: number
  height: number
  imgWidth?: number
  imgHeight?: number
}

export class DropletLayerRenderer {
  public mesh: THREE.InstancedMesh
  private geometry: THREE.InstancedBufferGeometry
  private material: THREE.ShaderMaterial
  private maxCount: number

  private posArray: Float32Array
  private radiusArray: Float32Array
  private velArray: Float32Array
  private wobbleArray: Float32Array
  private opacityArray: Float32Array

  private posAttr: THREE.InstancedBufferAttribute
  private radiusAttr: THREE.InstancedBufferAttribute
  private velAttr: THREE.InstancedBufferAttribute
  private wobbleAttr: THREE.InstancedBufferAttribute
  private opacityAttr: THREE.InstancedBufferAttribute

  constructor(
    maxCount = 300,
    backgroundTexture: THREE.Texture | null,
    width: number,
    height: number,
    imgWidth = 1920,
    imgHeight = 1080
  ) {
    this.maxCount = maxCount

    // Create base quad geometry [-1, 1]
    const baseGeo = new THREE.PlaneGeometry(2, 2)
    this.geometry = new THREE.InstancedBufferGeometry()
    this.geometry.index = baseGeo.index
    this.geometry.attributes.position = baseGeo.attributes.position
    this.geometry.attributes.uv = baseGeo.attributes.uv

    // Allocate typed arrays for instanced droplet attributes
    this.posArray = new Float32Array(maxCount * 2)
    this.radiusArray = new Float32Array(maxCount)
    this.velArray = new Float32Array(maxCount * 2)
    this.wobbleArray = new Float32Array(maxCount * 2)
    this.opacityArray = new Float32Array(maxCount)

    this.posAttr = new THREE.InstancedBufferAttribute(this.posArray, 2)
    this.posAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('aPosition', this.posAttr)

    this.radiusAttr = new THREE.InstancedBufferAttribute(this.radiusArray, 1)
    this.radiusAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('aRadius', this.radiusAttr)

    this.velAttr = new THREE.InstancedBufferAttribute(this.velArray, 2)
    this.velAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('aVelocity', this.velAttr)

    this.wobbleAttr = new THREE.InstancedBufferAttribute(this.wobbleArray, 2)
    this.wobbleAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('aWobble', this.wobbleAttr)

    this.opacityAttr = new THREE.InstancedBufferAttribute(this.opacityArray, 1)
    this.opacityAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('aOpacity', this.opacityAttr)

    this.geometry.instanceCount = 0

    this.material = new THREE.ShaderMaterial({
      vertexShader: dropletVert,
      fragmentShader: dropletFrag,
      uniforms: {
        uBackground: { value: backgroundTexture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uImageResolution: { value: new THREE.Vector2(imgWidth, imgHeight) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxCount)
    this.mesh.count = 0
    this.mesh.frustumCulled = false
  }

  public setBackgroundTexture(tex: THREE.Texture | null) {
    this.material.uniforms.uBackground.value = tex
  }

  public setImageResolution(w: number, h: number) {
    this.material.uniforms.uImageResolution.value.set(w, h)
  }

  public resize(width: number, height: number) {
    this.material.uniforms.uResolution.value.set(width, height)
  }

  public updateDroplets(droplets: Droplet[]) {
    const count = Math.min(droplets.length, this.maxCount)
    this.geometry.instanceCount = count
    this.mesh.count = count

    for (let i = 0; i < count; i++) {
      const d = droplets[i]
      const i2 = i * 2

      this.posArray[i2] = d.x
      this.posArray[i2 + 1] = d.y

      this.radiusArray[i] = d.radius

      this.velArray[i2] = d.vx
      this.velArray[i2 + 1] = d.vy

      this.wobbleArray[i2] = d.wobble
      this.wobbleArray[i2 + 1] = d.wobblePhase

      this.opacityArray[i] = d.opacity
    }

    this.posAttr.needsUpdate = true
    this.radiusAttr.needsUpdate = true
    this.velAttr.needsUpdate = true
    this.wobbleAttr.needsUpdate = true
    this.opacityAttr.needsUpdate = true
  }

  public dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
