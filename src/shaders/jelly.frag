precision mediump float;
varying vec3 vposition;
varying vec3 vnormal;
varying vec2 vtexcoord;
void main() {
  float d = dot(normalize(cameraPosition - vposition), normalize(vnormal));
  d *= d;
  gl_FragColor = vec4(vec3(1.5, 1.5, 2) * (1.0 - d) * d, 1);
}
