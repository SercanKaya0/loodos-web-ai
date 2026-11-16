// Kahve Dünyası'ndan sonraki uygulama durakları.
// Metinler loodos.com/works sayfalarındaki bilgilere dayanır; ekranlar aynı sayfalardaki tanıtım görsellerinden kırpıldı.
// Her durak: env (mekân tipi), a (giriş cümlesi, ilk ekran), b (ikinci ekran cümlesi).
export const STOPS = [
  {
    id: 'frink', title: 'Frink', color: '#4a3aff', env: 'cafe', place: 'Frink Point',
    screens: ['frink_1', 'frink_2'],
    a: "Kahveyle devam edelim. Frink, Türkiye'nin ilk kahve üyeliği: tek abonelikle tüm Frink Point'lerde sınırsız kahve.",
    b: 'Ücretsiz denemeyle başlıyor, kahvenizi uygulamadan sipariş ediyorsunuz. Beş yüz elli bini aşkın indirme.',
  },
  {
    id: 'a101', title: 'A101 SuperApp', color: '#00a8c6', env: 'market', place: 'A101',
    screens: ['a101_1', 'a101_2'],
    a: "Şimdi markete uğruyoruz. A101 SuperApp, A101'in dijital dönüşümünün arkasındaki yeni nesil süper uygulama.",
    b: 'A101 Kapıda, A101 Ekstra ve tüm avantajlar tek çatı altında. Yedi milyon indirme, yüzde doksan dokuz virgül sekiz çökmesiz kullanıcı.',
  },
  {
    id: 'igoya', title: 'iGoya', color: '#3a2d6e', env: 'aisle', place: 'Mağaza reyonu',
    screens: ['igoya_1', 'igoya_2'],
    a: "Reyonlara geçelim. iGoya, Yıldız Holding'in Goya'sı için geliştirdiğimiz saha operasyon uygulaması.",
    b: 'Raf kontrolleri, alarmlar, sorun takibi ve raporlama; tüm perakende ağında, anlık olarak.',
  },
  {
    id: 'kazaniyorum', title: 'KazanıYORUM', color: '#0342a7', env: 'fashion', place: 'Giyim mağazası',
    screens: ['kazaniyorum_1', 'kazaniyorum_2'],
    a: "KazanıYORUM, LC Waikiki'nin sadakat uygulaması. En güncel native teknolojilerle ve yepyeni bir tasarımla sıfırdan geliştirdik.",
    b: 'Anketlerle müşterinin sesi doğrudan markaya ulaşıyor. Beş yüz binin üzerinde indirme.',
  },
  {
    id: 'alisgidis', title: 'AlışGidiş', color: '#c8f03c', env: 'home', place: 'Evde',
    screens: ['alisgidis_1', 'alisgidis_2'],
    a: 'Eve geçelim. AlışGidiş, Fibabanka destekli, e-ticareti bir adım öteye taşıyan bir pazar yeri.',
    b: 'Kredi kartıyla ya da banka kredisiyle, tek bir akışta ödeme yapabiliyorsunuz.',
  },
  {
    id: 'zorlu', title: 'Zorlu Enerji', color: '#d0103a', env: 'home2', place: 'Evde',
    screens: ['zorlu_1', 'zorlu_2'],
    a: 'Evdeyken faturalar da aklımıza geliyor. Zorlu Enerji, enerji sektöründe müşteri deneyimini dijitalleştiren yeni bir mobil kanal.',
    b: 'Faturanızı görüyor, ödüyor ve tüketiminizi önceki aylarla karşılaştırıyorsunuz.',
  },
  {
    id: 'vodafone', title: 'Vodafone Yanımda', color: '#e60000', env: 'telco', place: 'Vodafone mağazası',
    screens: ['vodafone_1', 'vodafone_1'],
    a: 'Vodafone Yanımda: hesaplar, faturalar, alışveriş, etkinlikler ve seyahat; her ihtiyaç için tek bir süper uygulama.',
    b: 'Swift ve Kotlin ile tamamen native geliştirildi. Ayda on sekiz milyon aktif kullanıcı, elli milyonu aşkın indirme.',
  },
  {
    id: 'brific', title: 'BRIFIC', color: '#ff5a1f', env: 'street', place: 'Maslak',
    screens: ['brific_1', 'brific_2'],
    a: "Biraz dışarı çıkalım. BRIFIC, şehir içi ulaşımı yeniden tanımlıyor: e-scooter'ı web'den alıyorsunuz,",
    b: "uygulamadan Bluetooth ile sürüyor, takip ediyor ve kontrol ediyorsunuz. iF ve German Design ödüllü bir tasarım.",
  },
  {
    id: 'sunexpress', title: 'SunExpress', color: '#1b4777', env: 'gate', place: 'Havalimanı',
    screens: ['sunexpress_1', 'sunexpress_2'],
    a: 'Ve havalimanındayız. SunExpress uygulaması bir uygulamadan fazlası; yolcunun seyahat arkadaşı.',
    b: 'Uçuş aramaktan biniş kartına, yolcunun ihtiyaç duyduğu her şey parmaklarının ucunda.',
  },
  {
    id: 'oneapp', title: 'Vodafone One App', color: '#e60000', env: 'parking', place: 'Otopark',
    screens: ['oneapp_1', 'oneapp_2'],
    a: 'Son durağımız ofise dönüş. Vodafone One App, çalışanlar için yeni nesil bir intranet.',
    b: 'Kurumsal giriş, mobil ofis erişimi ve akıllı otopark tek bir dijital merkezde. Her gün bin yüzü aşkın aktif kullanıcı.',
  },
];
export const FINALE = {
  id: 'finale',
  text: "Ve bunlar, Loodos'ta geliştirdiğimiz uygulamalardan yalnızca birkaçı. Sıradaki hikâyeyi birlikte yazmak için sizi bekliyoruz.",
};
// Ses dosyası adları: <id>_a, <id>_b, finale
export const VOICE_IDS = [...STOPS.flatMap((s) => [`${s.id}_a`, `${s.id}_b`]), 'finale'];
export const lineText = (vid) => vid === 'finale' ? FINALE.text : STOPS.find((s) => vid.startsWith(s.id + '_'))[vid.endsWith('_a') ? 'a' : 'b'];
