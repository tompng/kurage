varying float vBrightness;
void main() {
  vec2 xy = gl_PointCoord * 2.0 - 1.0;
  float v = 1.0 - dot(xy, xy);
  if (v < 0.0 || vBrightness < 0.0) discard;
  gl_FragColor = vec4(vec3(v * v * vBrightness * 0.2), 1.0);
}
