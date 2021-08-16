varying float vTParameter, vBrightness;
#ifdef VARYING_COLOR
  varying vec3 vColor, vDColor;
#else
  uniform vec3 color;
#endif

void main() {
#ifdef VARYING_COLOR
  vec3 color = vColor + vTParameter * 0.5 * vDColor;
#endif
  gl_FragColor.rgb = (2.0 * float(gl_FrontFacing) - 1.0) * vTParameter * vBrightness * color;
  gl_FragColor.a = 1.0;
}
