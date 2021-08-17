precision mediump float;
uniform sampler2D map;
varying vec3 vposition;
varying vec3 vnormal;
varying vec2 vtexcoord;
void main() {
  float d = dot(normalize(cameraPosition - vposition), normalize(vnormal));
  d *= d;
  gl_FragColor = vec4(texture2D(map, vtexcoord).rgb * (1.0 - d) * d * (0.4 + 1.6 * float(gl_FrontFacing)), 1);
}
