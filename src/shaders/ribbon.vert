precision mediump float;
uniform vec3 v0, v1;
uniform vec3 vx0, vy0, vz0;
uniform vec3 vx1, vy1, vz1;

attribute vec3 tan1, tan2;

varying vec3 vposition;
varying vec3 vnormal;
varying vec2 vtexcoord;

void main() {
  vec3 a1 = position * position * (3.0 - 2.0 * position);
  vec3 a0 = 1.0 - a1;
  vec3 b0 = position * (1.0 - position) * (1.0 - position);
  vec3 b1 = position * position * (position - 1.0);
  vec3 da_s = 6.0 * position * (1.0 - position) * tan1;
  vec3 db0_s = (1.0 + position * (3.0 * position - 4.0)) * tan1;
  vec3 db1_s = position * (3.0 * position - 2.0) * tan1;
  vec2 ab_s = ((a1.xy - a0.xy) / 2.0 + b0.xy + b1.xy) * da_s.z;
  vec2 db_s = db0_s.xy + db1_s.xy + da_s.xy;
  vec3 tan_s = (
    (v1 - v0) * da_s.z +
    vx0 * (a0.z * db_s.x - ab_s.x) +
    vy0 * (a0.z * db_s.y - ab_s.y) +
    vx1 * (a1.z * db_s.x + ab_s.x) +
    vy1 * (a1.z * db_s.y + ab_s.y) +
    vz0 * db0_s.z + vz1 * db1_s.z
  );
  vec3 da_t = 6.0 * position * (1.0 - position) * tan2;
  vec3 db0_t = (1.0 + position * (3.0 * position - 4.0)) * tan2;
  vec3 db1_t = position * (3.0 * position - 2.0) * tan2;
  vec2 ab_t = ((a1.xy - a0.xy) / 2.0 + b0.xy + b1.xy) * da_t.z;
  vec2 db_t = db0_t.xy + db1_t.xy + da_t.xy;
  vec3 tan_t = (
    (v1 - v0) * da_t.z +
    vx0 * (a0.z * db_t.x - ab_t.x) +
    vy0 * (a0.z * db_t.y - ab_t.y) +
    vx1 * (a1.z * db_t.x + ab_t.x) +
    vy1 * (a1.z * db_t.y + ab_t.y) +
    vz0 * db0_t.z + vz1 * db1_t.z
  );
  vnormal = normalize(cross(tan_s, tan_t));
  vec2 a = a1.xy - a0.xy;
  vec2 b = b0.xy + b1.xy;
  vposition = (
    a0.z * (v0 + (vx0 * a.x + vy0 * a.y) / 2.0) +
    a1.z * (v1 + (vx1 * a.x + vy1 * a.y) / 2.0) +
    b.x * (a0.z * vx0 + a1.z * vx1) +
    b.y * (a0.z * vy0 + a1.z * vy1) +
    b0.z * vz0 + b1.z * vz1
  );
  gl_Position = projectionMatrix * (viewMatrix * vec4(vposition, 1));
  vtexcoord = uv.xy;  
}
