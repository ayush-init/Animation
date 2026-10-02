uniform sampler2D uBackground;
uniform vec2 uResolution;
uniform vec2 uImageResolution;

varying vec2 vLocalPos;
varying vec2 vScreenUv;
varying float vRadius;
varying vec2 vVelocity;
varying vec2 vWobble;
varying float vOpacity;

// Calculate UV with 'cover' aspect ratio matching the background
vec2 getCoverUv(vec2 uv) {
  float screenAspect = uResolution.x / uResolution.y;
  float imageAspect = uImageResolution.x / uImageResolution.y;
  vec2 newUv = uv;
  if (screenAspect > imageAspect) {
    float scale = imageAspect / screenAspect;
    newUv.y = (uv.y - 0.5) * scale + 0.5;
  } else {
    float scale = screenAspect / imageAspect;
    newUv.x = (uv.x - 0.5) * scale + 0.5;
  }
  return newUv;
}

void main() {
  vec2 p = vLocalPos;

  // Realistic teardrop elongation for sliding droplets:
  // Top is narrower, bottom is bulbous and heavy with water
  float speed = length(vVelocity);
  if (speed > 8.0) {
    p.x *= 1.0 - p.y * clamp(speed * 0.0025, 0.0, 0.35);
  }

  // Organic shape deformation (not a perfect mechanical circle)
  float angle = atan(p.y, p.x);
  float wobbleAmp = vWobble.x;
  float wobblePhase = vWobble.y;
  float organicWobble = sin(angle * 3.0 + wobblePhase) * wobbleAmp * 0.09
                      + cos(angle * 5.0) * 0.04;

  float r = length(p) + organicWobble;

  // Discard fragments outside the droplet body
  if (r > 1.0) {
    discard;
  }

  // Soft, smooth anti-aliased edge
  float edgeAlpha = smoothstep(1.0, 0.91, r) * vOpacity;

  // 3D Meniscus Dome Normal Vector
  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 N = normalize(vec3(-p.x, -p.y, z * 1.25));

  // Realistic Background Refraction & Magnification:
  // Water droplet acts as a mini convex lens, magnifying the image behind it
  float refractOffset = 0.022 + (vRadius / 25.0) * 0.018;
  vec2 refractUv = getCoverUv(vScreenUv - N.xy * refractOffset);
  refractUv = clamp(refractUv, vec2(0.002), vec2(0.998));

  // Sample clear, sharp background through the droplet lens
  vec4 refractedColor = texture2D(uBackground, refractUv);

  // Subtle dark meniscus contact shadow around the perimeter (internal reflection)
  float darkRim = smoothstep(0.70, 0.98, r) * 0.28;

  // Lower internal caustic glow (light focused near the bottom curve of the drop)
  float caustic = smoothstep(0.55, 0.92, r) * smoothstep(-0.25, 0.85, p.y) * 0.45;
  vec3 causticColor = refractedColor.rgb * (1.0 + caustic * 0.8);

  // Smooth, elegant specular highlight glint (curved reflection of light source)
  vec3 lightDir = normalize(vec3(-0.35, -0.72, 0.65));
  float spec = pow(max(0.0, dot(N, lightDir)), 32.0) * 1.15;

  // Secondary soft diffuse glint
  vec3 lightDir2 = normalize(vec3(0.3, -0.6, 0.7));
  float spec2 = pow(max(0.0, dot(N, lightDir2)), 16.0) * 0.25;

  // Composite physical droplet color (neutral water taking background lighting)
  vec3 finalColor = mix(refractedColor.rgb * (1.0 - darkRim), causticColor, caustic * 0.5);
  finalColor += vec3(spec + spec2);

  gl_FragColor = vec4(finalColor, edgeAlpha);
}
