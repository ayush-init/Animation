// Droplet Instanced Vertex Shader
attribute vec2 aPosition;      // Center position in pixel space (0,0 is top-left)
attribute float aRadius;       // Radius in pixels
attribute vec2 aVelocity;      // Velocity in px/s
attribute vec2 aWobble;        // (amplitude, phase)
attribute float aOpacity;      // Opacity

uniform vec2 uResolution;      // Screen resolution in pixels

varying vec2 vLocalPos;        // Normalized local coordinate [-1, 1]
varying vec2 vScreenUv;        // Screen space UV
varying float vRadius;
varying vec2 vVelocity;
varying vec2 vWobble;
varying float vOpacity;

void main() {
  vLocalPos = position.xy; // position is [-1, 1] quad
  vRadius = aRadius;
  vVelocity = aVelocity;
  vWobble = aWobble;
  vOpacity = aOpacity;

  // Elongation calculation based on downward velocity
  float speed = length(aVelocity);
  float stretch = 1.0 + clamp(speed * 0.0035, 0.0, 0.65);

  // Slightly teardrop / stretch the quad along the velocity direction
  vec2 localScaled = position.xy;
  if (speed > 10.0) {
    vec2 dir = aVelocity / speed;
    vec2 perp = vec2(-dir.y, dir.x);
    // Align quad to velocity vector
    float along = dot(position.xy, vec2(0.0, 1.0));
    float across = dot(position.xy, vec2(1.0, 0.0));
    localScaled = (perp * across + dir * (along * stretch));
  } else {
    localScaled *= 1.0;
  }

  // Pixel position on screen
  vec2 pixelPos = aPosition + localScaled * (aRadius * 1.5);

  // Normalized Screen UV [0, 1] (y inverted: 0 is top)
  vScreenUv = vec2(pixelPos.x / uResolution.x, 1.0 - pixelPos.y / uResolution.y);

  // Convert pixel coords to WebGL NDC [-1, 1]
  // top-left (0,0) -> (-1, 1), bottom-right (w,h) -> (1, -1)
  vec2 ndc = vec2((pixelPos.x / uResolution.x) * 2.0 - 1.0, 1.0 - (pixelPos.y / uResolution.y) * 2.0);

  gl_Position = vec4(ndc, 0.0, 1.0);
}
