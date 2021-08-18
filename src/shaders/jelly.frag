precision mediump float;
uniform sampler2D map;
varying vec3 vposition;
varying vec3 vnormal;
varying vec2 vtexcoord;
void main() {
  float d = dot(normalize(cameraPosition - vposition), normalize(vnormal));
  float brightness = abs(d) * (0.3 + 0.7 * float(gl_FrontFacing));
  gl_FragColor = vec4(texture2D(map, vtexcoord).rgb * brightness, 1);
}
