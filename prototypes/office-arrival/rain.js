// Kameranın etrafında sonsuz yağmur: GPU'da hareket eden çizgiler, lamba altında parlayan damlalar
import * as THREE from 'three';

export function createRain(scene, lamps, count = 9000) {
  const pos = new Float32Array(count * 6);
  const end = new Float32Array(count * 2);
  const BOX = new THREE.Vector3(36, 22, 36);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * BOX.x, y = Math.random() * BOX.y, z = Math.random() * BOX.z;
    pos.set([x, y, z, x, y, z], i * 6);
    end[i * 2] = 0; end[i * 2 + 1] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const lampArr = lamps.slice(0, 6);
  while (lampArr.length < 6) lampArr.push(new THREE.Vector3(0, -999, 0));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: BOX },
      uLamps: { value: lampArr },
    },
    vertexShader: /* glsl */`
      attribute float aEnd;
      uniform float uTime; uniform vec3 uCam, uBox; uniform vec3 uLamps[6];
      varying float vA; varying vec3 vW;
      void main() {
        vec3 fall = normalize(vec3(0.12, -1.0, 0.05));
        float speed = 12.0 + fract(position.x * 13.7) * 4.0;
        vec3 p = position + fall * uTime * speed;
        vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
        vec3 w = uCam + rel - fall * aEnd * 0.5;
        vW = w;
        float lit = 0.0;
        for (int i = 0; i < 6; i++) {
          vec3 d = w - uLamps[i];
          float cone = smoothstep(0.0, -0.5, normalize(d).y);
          lit += cone * 30.0 / (1.0 + dot(d, d));
        }
        float dist = length(rel);
        vA = (0.03 + min(lit, 1.4) * 0.35) * smoothstep(18.0, 4.0, dist) * smoothstep(0.4, 1.2, dist) * (1.0 - aEnd * 0.6);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying float vA; varying vec3 vW;
      void main() {
        if (vW.y < 0.0 || vW.x < -4.5) discard;
        if (vW.x < -1.9 && vW.z < -11.2 && vW.z > -20.8 && vW.y < 4.0) discard; // saçak altı
        gl_FragColor = vec4(vec3(0.75, 0.82, 0.92) * vA, 1.0);
      }
    `,
  });
  const rain = new THREE.LineSegments(geo, mat);
  rain.frustumCulled = false;
  scene.add(rain);
  rain.update = (t, cam) => { mat.uniforms.uTime.value = t; mat.uniforms.uCam.value.copy(cam); };
  return rain;
}
