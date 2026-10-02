uniform sampler2D uBackground;
uniform sampler2D uBlurred;
uniform sampler2D uMask;
uniform sampler2D uWater;
uniform sampler2D uDryMask;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
varying vec2 vUv;

vec2 hash(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i).x, hash(i+vec2(1,0)).x, f.x), mix(hash(i+vec2(0,1)).x, hash(i+1.0).x, f.x), f.y);
}
vec2 cover(vec2 uv) {
  float s = uResolution.x/uResolution.y;
  float i = uImageResolution.x/uImageResolution.y;
  return (uv-.5)*vec2(min(s/i,1.0),min(i/s,1.0))+.5;
}
// Return the local normal and lens coverage of differently sized condensation beads.
vec4 moisture(vec2 px, float cell, float scale) {
  vec2 grid = px/cell, id = floor(grid), f = fract(grid);
  vec4 result = vec4(0);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
    vec2 offset = vec2(float(x),float(y));
    vec2 random = hash(id+offset);
    vec2 p = (f-offset-.14-random*.72)*cell;
    float radius = scale*(.65+pow(random.x,2.1)*3.6);
    p.y /= 1.0+random.y*.25;
    p.x *= 1.0 + .09*sin(p.y/radius*2.0+random.y*6.28);
    float r = length(p)/radius;
    float aa = max(.10,.55/radius);
    float body = 1.0-smoothstep(1.0-aa,1.0+aa,r);
    if(body > result.z) result = vec4(p/radius,body,r);
  }
  return result;
}
vec3 lens(vec3 underneath, vec2 uv, vec4 bead, float strength) {
  float r = min(bead.w,.999);
  vec3 normal = normalize(vec3(bead.xy*.85,sqrt(max(.02,1.0-r*r))));
  vec3 refraction = texture2D(uBackground,cover(uv-normal.xy*7.0/uResolution)).rgb;
  // Water transmits the scene; only its perimeter catches a dark reflection.
  float rim = smoothstep(.62,.98,r)*.34;
  float reflection = pow(max(0.0,dot(normal,normalize(vec3(-.48,.58,.65)))),22.0);
  float lowerArc = smoothstep(.4,.85,r)*(1.0-smoothstep(.85,1.05,r))*max(0.0,-normal.y);
  vec3 water = mix(underneath,refraction,.62)*(1.0-rim);
  water += vec3(.83,.91,1.0)*reflection*.72 + lowerArc*.20;
  return mix(underneath,water,bead.z*strength);
}
float waterHeight(vec2 uv) {
  vec4 sampleValue = texture2D(uWater,uv);
  float dry = texture2D(uDryMask,uv).a;
  return sampleValue.r*sampleValue.a*(1.0-smoothstep(.05,.90,dry));
}
void main() {
  vec2 px = vUv*uResolution;
  vec2 pixel = 1.0/uResolution;
  float raw = texture2D(uMask,vUv).r;
  float clear = smoothstep(.06,.94,raw);
  vec2 slope = vec2(
    texture2D(uMask,vUv+vec2(pixel.x,0)).r-texture2D(uMask,vUv-vec2(pixel.x,0)).r,
    texture2D(uMask,vUv+vec2(0,pixel.y)).r-texture2D(uMask,vUv-vec2(0,pixel.y)).r);
  float edge = clamp(length(slope)*1.6,0.0,1.0);
  vec3 sharp = texture2D(uBackground,cover(vUv+slope*pixel*2.4)).rgb;
  vec3 soft = texture2D(uBlurred,cover(vUv)).rgb;
  float cloud = noise(px/240.0)*.65+noise(px/85.0)*.35;
  float luminance = dot(soft,vec3(.2126,.7152,.0722));
  vec3 mist = mix(vec3(luminance),soft,.88);
  mist = mix(mist,vec3(.70,.74,.76),.21+cloud*.13);
  mist += (noise(px*.8)-.5)*.018;
  mist = lens(mist,vUv,moisture(px+37.0,7.5,.37),.65);
  mist = lens(mist,vUv,moisture(px,15.5,1.0),1.0);
  vec3 color = mix(mist,sharp,clear);
  color *= 1.0-edge*.10;
  color += edge*.02+max(0.0,-slope.y)*.055;

  // A separate height field gives running water an actual curved surface,
  // rather than treating the streak as a flat hole in the mist.
  float height = waterHeight(vUv);
  vec2 gradient = vec2(
    waterHeight(vUv+vec2(pixel.x,0))-waterHeight(vUv-vec2(pixel.x,0)),
    waterHeight(vUv+vec2(0,pixel.y))-waterHeight(vUv-vec2(0,pixel.y)));
  vec3 normal = normalize(vec3(-gradient*3.2,.65));
  vec3 refracted = texture2D(uBackground,cover(vUv-normal.xy*pixel*9.0)).rgb;
  float fresnel = pow(1.0-normal.z,2.0);
  float highlight = pow(max(0.0,dot(normal,normalize(vec3(-.48,.58,.65)))),28.0);
  float glint = pow(max(0.0,dot(normal,normalize(vec3(.35,-.65,.68)))),36.0);
  vec3 water = mix(color,refracted,.72)*(1.0-fresnel*.38);
  water += highlight*.85+glint*.32;
  color = mix(color,water,smoothstep(.015,.20,height));
  gl_FragColor = vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
