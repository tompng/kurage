varying float vBrightness;
uniform float maxDistance;
void main() {
  vec4 vpos = viewMatrix * (modelMatrix * vec4(position, 1));
  float dist = length(vpos.xyz);
  float size = 8.0 / vpos.w; // TODO: consider resolution
  float isize = max(ceil(size), 1.0);
  float sizeRatio = size / isize;
  gl_PointSize = min(isize, 16.0);
  vBrightness = sizeRatio * sizeRatio * (1.0 - dist / maxDistance);
  gl_Position = projectionMatrix * vpos;
}
