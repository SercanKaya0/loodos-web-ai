// Kaynak: loodos.com/works + detay sayfalarının veri paketi (2026-11-13)
// Not: Kategoriler öneri olarak düzeltildi (One App / iGoya → Enterprise, Zorlu Enerji → Utilities).
// BRIFIC rakamları kendi içinde çelişkili olduğu için gösterilmiyor.

const CDN = 'https://dcdn.loodos.com/prod/9';

export const categories = ['All', 'SuperApp', 'eCommerce', 'Loyalty', 'Enterprise', 'Utilities'];

export const works = [
  {
    slug: 'a101-superapp',
    title: 'A101 SuperApp',
    category: 'SuperApp',
    summary: "The new-generation super app and e-commerce platform behind A101's digital transformation — A101 At The Door, A101 Extra and every other advantage under one roof.",
    services: ['iOS', 'Android', 'Secure Coding', 'Responsive', 'UX Design'],
    stats: [
      { value: 7, suffix: 'M', label: 'Downloads' },
      { value: 70, suffix: 'K', label: 'Active users' },
      { value: 99.8, suffix: '%', label: 'Crash-free users' },
    ],
    image: `${CDN}/12/a101_card_horizontal_b04c840327.webp`,
  },
  {
    slug: 'vodofone-yanimda',
    title: 'Vodafone Yanımda',
    category: 'SuperApp',
    summary: 'One super app for every need — accounts, bills, shopping, events and travel. Built natively with Swift and Kotlin + Jetpack Compose to Vodafone standards.',
    services: ['iOS', 'Android', 'Secure Coding', 'UX Design'],
    stats: [
      { value: 18, suffix: 'M', label: 'Monthly active users' },
      { value: 50, suffix: 'M+', label: 'Downloads' },
      { value: 99.8, suffix: '%', label: 'Crash-free users' },
    ],
    image: `${CDN}/20/vodafone_yanimda_horizontal_card_e85249a525.webp`,
  },
  {
    slug: 'alisgidis',
    title: 'AlışGidiş',
    category: 'eCommerce',
    summary: 'A Fibabanka-backed marketplace that takes e-commerce a step further — pay with credit cards or bank loans in a single flow.',
    services: ['iOS', 'Android', 'Secure Coding', 'Responsive', 'UX Design'],
    stats: [],
    image: `${CDN}/13/alis_gidis_card_horizontal_2bb29ecaee.webp`,
  },
  {
    slug: 'brific',
    title: 'BRIFIC',
    category: 'eCommerce',
    summary: 'Urban mobility, redefined. Buy an e-scooter on the web, then ride, track and control it over Bluetooth from the app.',
    services: ['iOS', 'Android', 'Web', 'BLE', 'UX Design'],
    awards: ['iF Design Award', 'German Design Award'],
    stats: [],
    image: `${CDN}/14/brific_horizontal_card_94d779731f.webp`,
  },
  {
    slug: 'sunexpress',
    title: 'SunExpress',
    category: 'eCommerce',
    summary: 'More than an app — a travel companion that puts everything a passenger needs for the flight right at their fingertips.',
    services: ['iOS', 'Android', 'Secure Coding', 'Responsive', 'UX Design'],
    stats: [],
    image: `${CDN}/18/sunexpress_horizontal_card_b065151332.webp`,
  },
  {
    slug: 'frink',
    title: 'Frink',
    category: 'eCommerce',
    summary: "Turkey's first coffee membership. One subscription, unlimited coffee at every Frink Point.",
    services: ['iOS', 'Android', 'Secure Coding', 'Responsive', 'UX Design'],
    stats: [
      { value: 304, suffix: 'K', label: 'Android downloads' },
      { value: 255, suffix: 'K', label: 'iOS downloads' },
      { value: 98.4, suffix: '%', label: 'Crash-free users' },
    ],
    image: `${CDN}/15/frink_horizontal_card_a879e5fd8f.webp`,
  },
  {
    slug: 'kahve-dunyasi',
    title: 'Kahve Dünyası',
    category: 'eCommerce',
    summary: 'A rich product range, convenient ordering and exclusive experiences — on mobile and web, anytime, anywhere.',
    services: ['iOS', 'Android', 'Secure Coding', 'Responsive', 'UX Design'],
    stats: [
      { value: 2, suffix: 'M+', label: 'iOS downloads' },
      { value: 1, suffix: 'M+', label: 'Android downloads' },
      { value: 99.8, suffix: '%', label: 'Crash-free users' },
    ],
    image: `${CDN}/16/kahve_dunyasi_horizontal_card_b57ed447ab.webp`,
  },
  {
    slug: 'kazaniyorum',
    title: 'KazanıYORUM',
    category: 'Loyalty',
    summary: "LC Waikiki's loyalty app, rebuilt from scratch with the latest native technologies and a brand-new design.",
    services: ['iOS', 'Android', 'UX Design', 'Secure Coding'],
    stats: [
      { value: 500, suffix: 'K+', label: 'Downloads' },
      { value: 99.6, suffix: '%', label: 'Crash-free users' },
    ],
    image: `${CDN}/17/kazaniyorum_horizontal_card_19ef3aa3f0.webp`,
  },
  {
    slug: 'zorlu-enerji',
    title: 'Zorlu Enerji',
    category: 'Utilities',
    summary: 'A new mobile channel that digitalizes the customer experience in the energy sector.',
    services: ['iOS', 'Android', 'Secure Coding', 'UX Design'],
    stats: [],
    image: `${CDN}/21/zorlu_enerji_horizontal_card_b65300a2c4.webp`,
  },
  {
    slug: 'igoya-online-operations',
    title: 'iGoya Online Operations',
    category: 'Enterprise',
    summary: "A field-operations app for Yıldız Holding's Goya — real-time shelf checks, alarms, issue tracking and reporting across the retail network.",
    services: ['iOS', 'Android', 'Secure Coding'],
    stats: [],
    image: `${CDN}/22/igoya_horizontal_card_102f7431f3.webp`,
  },
  {
    slug: 'vodafone-one-app',
    title: 'Vodafone One App',
    category: 'Enterprise',
    summary: 'A next-generation intranet — corporate sign-in, mobile office access and smart parking in one digital hub for employees.',
    services: ['iOS', 'Android', 'Secure Coding', 'Responsive', 'UX Design'],
    stats: [
      { value: 1.1, suffix: 'K', label: 'Daily active users' },
      { value: 99.9, suffix: '%', label: 'Crash-free users' },
    ],
    image: `${CDN}/19/vodafone_one_app_horizontal_card_0792fa3a03.webp`,
  },
];
