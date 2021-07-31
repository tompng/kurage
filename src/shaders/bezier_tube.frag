varying float vTParameter, vBrightness;
uniform vec3 color;
void main() {
  gl_FragColor.rgb = (1.0 - 2.0 * float(gl_FrontFacing)) * vTParameter * color * vBrightness;
  gl_FragColor.a = 1.0;
}