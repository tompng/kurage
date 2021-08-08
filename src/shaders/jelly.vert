precision highp float;
uniform vec3 v000, v001, v010, v011, v100, v101, v110, v111;
uniform vec3 vx000, vx001, vx010, vx011, vx100, vx101, vx110, vx111;
uniform vec3 vy000, vy001, vy010, vy011, vy100, vy101, vy110, vy111;
uniform vec3 vz000, vz001, vz010, vz011, vz100, vz101, vz110, vz111;
attribute vec3 tan1, tan2;
vec3 tangentTransform(vec3 p, vec3 delta) {
  vec3 a1 = p * p * (3.0 - 2.0 * p);
  vec3 a0 = 1.0 - a1;
  vec3 b0 = p * (1.0 - p) * (1.0 - p);
  vec3 b1 = p * p * (p - 1.0);
  vec3 da = 6.0 * p * (1.0 - p) * delta;
  vec3 db0 = (1.0 + p * (3.0 * p - 4.0)) * delta;
  vec3 db1 = p * (3.0 * p - 2.0) * delta;
  float daaa = da.x * a1.y * a1.z + a1.x * da.y * a1.z + a1.x * a1.y * da.z;
  float daxinv = da.x * (1.0 - a1.y - a1.z);
  float dayinv = da.y * (1.0 - a1.z - a1.x);
  float dazinv = da.z * (1.0 - a1.x - a1.y);
  return (
    v000 * (-daaa - daxinv - dayinv - dazinv) +
    v001 * (daaa - da.x * a1.z - da.y * a1.z + dazinv) +
    v010 * (daaa - da.x * a1.y + dayinv - a1.y * da.z) +
    v011 * (-daaa + da.y * a1.z + a1.y * da.z) +
    v100 * (daaa + daxinv - a1.x * da.y - a1.x * da.z) +
    v101 * (-daaa + da.x * a1.z + a1.x * da.z) +
    v110 * (-daaa + da.x * a1.y + a1.x * da.y) +
    v111 * daaa +
    vx000 * (+db0.x * a0.y * a0.z - b0.x * da.y * a0.z - b0.x * a0.y * da.z)+
    vx001 * (+db0.x * a0.y * a1.z - b0.x * da.y * a1.z + b0.x * a0.y * da.z)+
    vx010 * (+db0.x * a1.y * a0.z + b0.x * da.y * a0.z - b0.x * a1.y * da.z)+
    vx011 * (+db0.x * a1.y * a1.z + b0.x * da.y * a1.z + b0.x * a1.y * da.z)+
    vx100 * (+db1.x * a0.y * a0.z - b1.x * da.y * a0.z - b1.x * a0.y * da.z)+
    vx101 * (+db1.x * a0.y * a1.z - b1.x * da.y * a1.z + b1.x * a0.y * da.z)+
    vx110 * (+db1.x * a1.y * a0.z + b1.x * da.y * a0.z - b1.x * a1.y * da.z)+
    vx111 * (+db1.x * a1.y * a1.z + b1.x * da.y * a1.z + b1.x * a1.y * da.z)+
    vy000 * (-da.x * b0.y * a0.z + a0.x * db0.y * a0.z - a0.x * b0.y * da.z)+
    vy001 * (-da.x * b0.y * a1.z + a0.x * db0.y * a1.z + a0.x * b0.y * da.z)+
    vy010 * (-da.x * b1.y * a0.z + a0.x * db1.y * a0.z - a0.x * b1.y * da.z)+
    vy011 * (-da.x * b1.y * a1.z + a0.x * db1.y * a1.z + a0.x * b1.y * da.z)+
    vy100 * (+da.x * b0.y * a0.z + a1.x * db0.y * a0.z - a1.x * b0.y * da.z)+
    vy101 * (+da.x * b0.y * a1.z + a1.x * db0.y * a1.z + a1.x * b0.y * da.z)+
    vy110 * (+da.x * b1.y * a0.z + a1.x * db1.y * a0.z - a1.x * b1.y * da.z)+
    vy111 * (+da.x * b1.y * a1.z + a1.x * db1.y * a1.z + a1.x * b1.y * da.z)+
    vz000 * (-da.x * a0.y * b0.z - a0.x * da.y * b0.z + a0.x * a0.y * db0.z)+
    vz001 * (-da.x * a0.y * b1.z - a0.x * da.y * b1.z + a0.x * a0.y * db1.z)+
    vz010 * (-da.x * a1.y * b0.z + a0.x * da.y * b0.z + a0.x * a1.y * db0.z)+
    vz011 * (-da.x * a1.y * b1.z + a0.x * da.y * b1.z + a0.x * a1.y * db1.z)+
    vz100 * (+da.x * a0.y * b0.z - a1.x * da.y * b0.z + a1.x * a0.y * db0.z)+
    vz101 * (+da.x * a0.y * b1.z - a1.x * da.y * b1.z + a1.x * a0.y * db1.z)+
    vz110 * (+da.x * a1.y * b0.z + a1.x * da.y * b0.z + a1.x * a1.y * db0.z)+
    vz111 * (+da.x * a1.y * b1.z + a1.x * da.y * b1.z + a1.x * a1.y * db1.z)
  );
}
vec3 transform(vec3 p) {
  vec3 a = p * p * (3.0 - 2.0 * p);
  vec3 b0 = p * (1.0 - p) * (1.0 - p);
  vec3 b1 = p * p * (p - 1.0);
  return (
    mix(
      mix(mix(v000, v001, a.z), mix(v010, v011, a.z), a.y),
      mix(mix(v100, v101, a.z), mix(v110, v111, a.z), a.y),
      a.x
    ) +
    b0.x * (mix(mix(vx000, vx010, a.y), mix(vx001, vx011, a.y), a.z)) +
    b1.x * (mix(mix(vx100, vx110, a.y), mix(vx101, vx111, a.y), a.z)) +
    b0.y * (mix(mix(vy000, vy001, a.z), mix(vy100, vy101, a.z), a.x)) +
    b1.y * (mix(mix(vy010, vy011, a.z), mix(vy110, vy111, a.z), a.x)) +
    b0.z * (mix(mix(vz000, vz100, a.x), mix(vz010, vz110, a.x), a.y)) +
    b1.z * (mix(mix(vz001, vz101, a.x), mix(vz011, vz111, a.x), a.y))
  );
}

varying vec3 vposition;
varying vec3 vnormal;
varying vec2 vtexcoord;

void main() {
  vposition = transform(position);
  vec3 ta = tangentTransform(position, tan1);
  vec3 tb = tangentTransform(position, tan2);
  gl_Position = projectionMatrix * (viewMatrix * vec4(vposition, 1));
  vnormal = normalize(cross(ta, tb));
  vtexcoord = uv.xy;
}
