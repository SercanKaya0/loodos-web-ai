// Loodos turkuazı kadife perde (works-immersive/stage.js'teki perdenin aynısı, oda ölçüsünde)
import * as THREE from 'three';

const CURTAIN_GLSL = /* glsl */ `
  uniform float uLift;
  uniform float uTime;
  uniform float uHeight;
  uniform float uWidth;
  uniform float uScallop;
  uniform float uSwags;
  varying vec2 vCurtainUv;
  vec3 curtainDisplace(vec3 pos, vec2 uv) {
    vec3 p = pos;
    float down = 1.0 - uv.y;
    float motion = sin(uLift * 3.14159);
    float pleat = sin(p.x * 5.2 + sin(p.y * 0.5 + uTime * 0.6) * 0.35);
    float amp = 0.06 + 0.16 * uLift * down + 0.04 * motion;
    p.z += pleat * amp;
    float swag = 0.5 - 0.5 * cos(uv.x * 6.28318 * uSwags);
    p.y += uLift * uHeight * 1.05;
    p.y += swag * (uScallop * 0.12 + uLift * 0.9) * down * down;
    p.z += sin(uv.x * 9.0 + uTime * 1.7) * 0.03 * motion * down;
    p.z += sin(uv.y * 3.14159) * 0.25 * motion;
    return p;
  }
`;

function velvet(uniforms, color, sheenColor) {
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.82, sheen: 1, sheenRoughness: 0.42, sheenColor, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + CURTAIN_GLSL)
      .replace('#include <beginnormal_vertex>', `
        vec3 cp0 = curtainDisplace(position, uv);
        float ce = 0.02;
        vec3 cpx = curtainDisplace(position + vec3(ce, 0.0, 0.0), uv + vec2(ce / uWidth, 0.0));
        vec3 cpy = curtainDisplace(position + vec3(0.0, ce, 0.0), uv + vec2(0.0, ce / uHeight));
        vec3 objectNormal = normalize(cross(cpx - cp0, cpy - cp0));
        vCurtainUv = uv;
      `)
      .replace('#include <begin_vertex>', 'vec3 transformed = cp0;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCurtainUv;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float trimM = smoothstep(0.03, 0.025, vCurtainUv.y) * smoothstep(0.0, 0.005, vCurtainUv.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.55, 0.2), trimM);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.78, 0.4) * trimM * 0.25;`);
  };
  return mat;
}

export function createCurtain(width, height) {
  const group = new THREE.Group();
  const u = (scallop, swags, h) => ({
    uLift: { value: 0 }, uTime: { value: 0 }, uHeight: { value: h }, uWidth: { value: width },
    uScallop: { value: scallop }, uSwags: { value: swags },
  });
  const cu = u(0, 4, height);
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 160, 50), velvet(cu, '#0a5c63', '#5fd3dc'));
  curtain.position.y = height / 2;
  curtain.castShadow = true; curtain.receiveShadow = true;
  group.add(curtain);
  const ph = 0.42;
  const pu = u(1, 6, ph);
  const pelmet = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.1, ph, 160, 6), velvet(pu, '#0a5d63', '#5fd3dc'));
  pelmet.position.set(0, height - ph / 2 + 0.02, 0.18);
  group.add(pelmet);
  return {
    group,
    set lift(v) { cu.uLift.value = v; },
    get lift() { return cu.uLift.value; },
    update(t) { cu.uTime.value = t; pu.uTime.value = t; },
  };
}
