import * as THREE from 'three'
import fogVert from '../shaders/fog.vert'
import fogFrag from '../shaders/fog.frag'

export interface FogUniforms {
  uBackground: { value: THREE.Texture | null }
  uMask: { value: THREE.Texture | null }
  uResolution: { value: THREE.Vector2 }
  uImageResolution: { value: THREE.Vector2 }
  uTime: { value: number }
}

export function createFogMaterial(
  backgroundTexture: THREE.Texture | null,
  maskTexture: THREE.Texture | null,
  width: number,
  height: number,
  imgWidth = 1920,
  imgHeight = 1080
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: fogVert,
    fragmentShader: fogFrag,
    uniforms: {
      uBackground: { value: backgroundTexture },
      uMask: { value: maskTexture },
      uResolution: { value: new THREE.Vector2(width, height) },
      uImageResolution: { value: new THREE.Vector2(imgWidth, imgHeight) },
      uTime: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  })
}
