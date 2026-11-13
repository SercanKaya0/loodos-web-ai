# Works — Immersive prototip

Kaydırınca kamera karanlık, partiküllü bir boşlukta projeler arasında ileri uçar.

## Çalıştırma (canlı yenileme)
```bash
cd ~/Desktop/loodos-web-ai/prototypes/works-immersive
npx live-server --port=5173
```
→ http://127.0.0.1:5173 — dosya kaydedilince tarayıcı kendini yeniler.

## Yapı
- `data.js` — 11 proje (metin, kategori, rakam, görsel URL)
- `main.js` — Three.js sahnesi, shader'lar, scroll→kamera eşlemesi, GSAP metin animasyonları
- `style.css` — tipografi, header/filtre/rail, mobil ve fallback

## Teknikler
- **Three.js** (CDN, build yok): panel başına ShaderMaterial
  - kaydırma hızına göre yastık bükülmesi + RGB kayması
  - odak dışı paneller gri/soluk, odaktaki renkli; yuvarlak köşe SDF
- **Lenis** smooth scroll, **GSAP** harf harf başlık + sayaç animasyonları
- Scroll konumu "durak"lara (intro → 11 proje → outro) eşlenir, duraklarda kamera bekler
- Filtre: eşleşmeyen projeler kararır, ilk eşleşene uçar
- Odaktaki panele hover → "View" imleci, tıklayınca case study
- `prefers-reduced-motion` veya WebGL yoksa düz liste düzenine düşer
