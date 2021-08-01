uniform float radius;
varying float vTParameter, vBrightness;
void main() {
  float t = position.z;
  float u = 1.0 - t;
  vec4 bez = vec4(
    u * u * u,
    3.0 * u * u * t,
    3.0 * u * t * t,
    t * t * t
  );
  vec3 globalPosition = (instanceMatrix * bez).xyz;
  vec3 cameraPosition = (viewMatrix * vec4(globalPosition, 1)).xyz;
  vec3 radialPosition = vec3(position.xy * radius, 0);
  gl_Position = projectionMatrix * vec4(cameraPosition + radialPosition, 1);
  float dist = -(viewMatrix * vec4((instanceMatrix * vec4(0.125, 0.375, 0.375, 0.125)).xyz, 1)).z;
  vBrightness = pow(0.8, dist);
  vTParameter = t;
}
