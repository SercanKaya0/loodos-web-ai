// Son işlem zinciri: MSAA sahne → bloom → tone mapping → "film" pass
// Film pass: renk kayması, bulanıklık (uyanma), renk ayarı, vinyet, gren, göz kapakları
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    aspect: { value: 16 / 9 },
    grain: { value: 0.05 },
    vignette: { value: 1.0 },
    ca: { value: 0.0025 },
    lid: { value: 0 },     // 0 kapalı, 1 tam açık
    blur: { value: 1 },    // 0 net, 1 çok bulanık
    desat: { value: 0.12 },
    fade: { value: 1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time, aspect, grain, vignette, ca, lid, blur, desat, fade;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    vec3 sampleCA(vec2 uv, vec2 d, float c) {
      return vec3(
        texture2D(tDiffuse, uv + d * c).r,
        texture2D(tDiffuse, uv).g,
        texture2D(tDiffuse, uv - d * c).b
      );
    }

    void main() {
      vec2 d = vUv - 0.5;
      float r = dot(d, d);
      float c = ca * (0.6 + r * 3.0) * (1.0 + blur * 3.0);

      // Uyanma bulanıklığı: altın spiral örnekleme
      vec3 col = sampleCA(vUv, d, c);
      if (blur > 0.01) {
        float rad = blur * 0.022;
        vec3 acc = col; float w = 1.0;
        for (int i = 1; i < 14; i++) {
          float fi = float(i);
          float a = fi * 2.39996;
          vec2 o = vec2(cos(a), sin(a) * aspect) * rad * sqrt(fi / 13.0);
          acc += sampleCA(vUv + o, d, c); w += 1.0;
        }
        col = acc / w;
      }

      float l = dot(col, vec3(0.299, 0.587, 0.114));
      // Renk ayarı: soğuk camgöbeği gölgeler, sıcak ışıklar
      col = mix(col * vec3(0.86, 1.0, 1.1), col * vec3(1.08, 1.0, 0.9), smoothstep(0.04, 0.55, l));
      col = mix(col, vec3(l), desat);

      // Vinyet
      float v = 1.0 - smoothstep(0.1, 0.8, r * vignette);
      col *= mix(0.3, 1.0, v);

      // Gren (karanlıkta daha belirgin)
      float n = hash(vUv * vec2(1920.0, 1080.0) + fract(time * 7.13) * 100.0) - 0.5;
      col += n * grain * (1.25 - l);

      // Göz kapakları: kavisli üst/alt kapak, kapalıyken ışığın kapaktan sızan kırmızımsı tonu
      vec2 p = d; p.x *= aspect;
      float curve = max(0.0, 1.0 - 0.75 * p.x * p.x);
      float o = lid;
      float top = mix(-0.03, 0.64, o) * curve;
      float bot = mix(-0.03, 0.6, o) * curve;
      float soft = 0.025 + 0.09 * (1.0 - o);
      float mask = smoothstep(top, top - soft, p.y) * smoothstep(-bot, -bot + soft, p.y);
      mask = mix(mask, 1.0, smoothstep(0.88, 1.0, o));
      vec3 lidCol = vec3(0.07, 0.014, 0.01) * (0.4 + l * 2.0);
      col = mix(lidCol, col, mask);
      col *= fade;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.7, 0.55, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  return {
    film: film.uniforms,
    bloom,
    setSize(w, h) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      film.uniforms.aspect.value = w / h;
    },
    render(t) {
      film.uniforms.time.value = t;
      composer.render();
    },
  };
}
