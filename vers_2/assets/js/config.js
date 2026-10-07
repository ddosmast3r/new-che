/* ===== НАСТРОЙКИ САЙТА =====
   Данные взяты с cheshashlik.ru. Подставляются во все места страницы. */
window.SITE = {
  url: 'https://cheshashlik.ru',
  // Публичный код из Яндекс Вебмастера → Права доступа → Метатег.
  // После заполнения выполнить: node scripts/build-seo.mjs
  yandexVerification: '',
  phone: '+7 962 499-00-44',
  phoneRaw: '+79624990044',

  address: 'Пятигорск, проспект Кирова, 27А',
  addressShort: 'пр. Кирова, 27А',
  hoursText: 'Ежедневно с 11:00 до 00:00',
  open: 11,   // час открытия (по Москве)
  close: 24,  // час закрытия (24 = полночь)

  // Мессенджеры — заказ и бронь
  whatsapp: '79624990044',
  telegram: 'https://t.me/che_shashlik',
  max: 'https://max.ru/u/f9LHodD0cOJk5PfOJ17g-RiKk7h7qEadSUoC2X9kvgjHrePDrhTh9YJaDyo',
  instagram: 'che_shashlik.26',

  // Карта
  lat: 44.036037,
  lng: 43.078323,
  yandexOrg: 'https://yandex.ru/maps/org/chyo_shashlyk_/30239245640/',
  yandexReviews: 'https://yandex.ru/maps/org/chyo_shashlyk_/30239245640/reviews/',
  yandexRating: '4,9',
  twoGis: 'https://2gis.ru/pyatigorsk/firm/70000001109313094',
  twoGisReviews: 'https://2gis.ru/pyatigorsk/firm/70000001109313094/tab/reviews',
  twoGisRating: '4,4',

  legal: 'ИП Егоян Лиана Давидовна · ИНН 263217153001 · ОГРНИП 326265100107094',

  // Яндекс Метрика — те же счётчики, что на прежнем cheshashlik.ru.
  // Основной (именные цели) и счётчик Яндекс Бизнеса (make-call / make-route).
  // Загружаются только после согласия посетителя в плашке про cookie.
  metrikaId: 110450622,
  metrikaBizId: 105239781,
};
