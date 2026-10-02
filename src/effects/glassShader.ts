import * as THREE from 'three'
import glassVert from '../shaders/glass.vert'
import glassFrag from '../shaders/glass.frag'

export interface GlassUniforms {
  uResolution: { value: THREE.Vector2 }
  uTime: { value: number }
}

export function createGlassMaterial(width: number, height: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: glassVert,
    fragmentShader: glassFrag,
    uniforms: {
      uResolution: { value: new THREE.Vector2(width, height) },
      uTime: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  })
}
