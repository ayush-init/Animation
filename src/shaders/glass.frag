uniform vec2 uResolution;
uniform float uTime;

varying vec2 vUv;

// Hash functions
float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453123);
}

// Bokeh disc with optical aperture edge ring (chromatic aberration)
vec3 bokehDisc(vec2 uv, vec2 center, float radius, vec3 color) {
  vec2 d = uv - center;
  float dist = length(d);
  if (dist > radius * 1.3) return vec3(0.0);

  // Soft circle with brighter rim (optical circle of confusion)
  float normDist = dist / radius;
  float intensity = smoothstep(1.0, 0.7, normDist);
  float rim = smoothstep(0.65, 0.98, normDist) * 0.4;
  intensity += rim;

  return color * intensity;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;

  // Sky / distant ambient gradient (deep moody midnight blue to charcoal rainy haze)
  vec3 skyTop = vec3(0.04, 0.06, 0.11);
  vec3 skyBottom = vec3(0.07, 0.08, 0.10);
  vec3 col = mix(skyBottom, skyTop, uv.y);

  // Distant wet street horizon glow (subtle warm orange/amber haze at lower third)
  float streetGlow = exp(-pow((uv.y - 0.28) * 3.5, 2.0)) * 0.35;
  col += vec3(0.25, 0.15, 0.07) * streetGlow;

  // Wet pavement ground reflection
  if (uv.y < 0.25) {
    float groundGrad = (0.25 - uv.y) / 0.25;
    col = mix(col, vec3(0.03, 0.04, 0.05), groundGrad * 0.7);
    // Road wet streaks
    float wetStreaks = sin(uv.x * 60.0 + sin(uv.y * 30.0)) * 0.02 * groundGrad;
    col += vec3(0.12, 0.14, 0.16) * wetStreaks;
  }

  // City buildings silhouette
  float buildingY = 0.32 + sin(floor(uv.x * 12.0) * 45.1) * 0.12;
  if (uv.y < buildingY) {
    col *= 0.65; // Silhouette darkening
  }

  // Bokeh lights generation (distant streetlights, traffic, neon signs)
  // Layer 1: Distant smaller bokeh (golden streetlamps & building windows)
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    vec2 seed = vec2(fi * 17.3, fi * 31.7);
    vec2 rnd = hash2(seed);

    vec2 bPos = vec2(rnd.x, 0.2 + rnd.y * 0.35) * aspect - aspect * 0.5;
    float bRadius = 0.04 + rnd.x * 0.03;

    // Amber / warm golden streetlights with occasional red taillights
    vec3 bCol = vec3(1.0, 0.65, 0.25) * 1.3;
    if (rnd.y > 0.7) {
      bCol = vec3(1.0, 0.25, 0.15) * 1.2; // Red taillight
    } else if (rnd.y < 0.2) {
      bCol = vec3(0.35, 0.75, 1.0) * 1.1; // Cool neon cyan
    }

    // Subtle gentle shimmer / breathing
    float shimmer = 0.85 + 0.15 * sin(uTime * 1.5 + fi * 2.0);
    col += bokehDisc(p, bPos, bRadius, bCol * shimmer * 0.45);
  }

  // Layer 2: Medium/large foreground bokeh discs (warm streetlights right outside window)
  for (int j = 0; j < 8; j++) {
    float fj = float(j);
    vec2 seed2 = vec2(fj * 53.1 + 10.0, fj * 79.3 + 5.0);
    vec2 rnd2 = hash2(seed2);

    // Drifting traffic or streetlamps
    float drift = sin(uTime * 0.1 + fj) * 0.03;
    vec2 bPos2 = vec2(rnd2.x + drift, 0.22 + rnd2.y * 0.32) * aspect - aspect * 0.5;
    float bRadius2 = 0.07 + rnd2.y * 0.07;

    vec3 bCol2 = vec3(1.0, 0.72, 0.32) * 1.4;
    if (j == 2 || j == 6) {
      bCol2 = vec3(0.95, 0.2, 0.15) * 1.3;
    } else if (j == 4) {
      bCol2 = vec3(0.4, 0.85, 0.95) * 1.2;
    }

    col += bokehDisc(p, bPos2, bRadius2, bCol2 * 0.4);
  }

  // Glass surface micro-scratches and faint grain
  float grain = hash1(uv * uResolution + fract(uTime)) * 0.02;
  col += grain;

  // Vignette around window borders
  float vignette = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y) * 16.0;
  vignette = clamp(pow(vignette, 0.28), 0.0, 1.0);
  col *= mix(0.68, 1.0, vignette);

  gl_FragColor = vec4(col, 1.0);
}
