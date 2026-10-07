// Generate crawlable HTML from the same data used by the interactive site.
// No dependencies; generated files are committed and served without Node.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../vers_2/', import.meta.url));
const context = { window: {} };
for (const file of ['config.js', 'menu-data.js']) {
  runInNewContext(readFileSync(`${root}assets/js/${file}`, 'utf8'), context);
}
const { SITE: site, MENU: menu, MENU_IMG: imagePath } = context.window;
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (value) => value == null
  ? '<span class="price--ask">цену уточняйте</span>'
  : `<span class="price">${esc(String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' '))} <small>руб.</small></span>`;
const row = (item) => `<div class="row"><span class="row__name">${esc(item.name)}</span><span class="w">${esc(item.w || '')}</span>${money(item.price)}${item.desc ? `<span class="row__desc">${esc(item.desc)}</span>` : ''}</div>`;
const card = (item, seal = true) => `<article class="dish">
  <button type="button" class="window window--zoom" data-photo="${esc(item.img)}" aria-label="Открыть фото: ${esc(item.name)}"><img src="${imagePath}${esc(item.img)}-640.webp" srcset="${imagePath}${esc(item.img)}-320.webp 320w, ${imagePath}${esc(item.img)}-640.webp 640w" sizes="(max-width: 560px) 116px, (max-width: 860px) calc(100vw - 80px), 400px" alt="${esc(item.name)}" width="667" height="667" loading="lazy" decoding="async">${seal && item.chef ? '<span class="seal">Шеф советует</span>' : ''}</button>
  <h4 class="dish__name">${esc(item.name)}</h4>
  ${item.desc ? `<p class="dish__desc">${esc(item.desc)}</p>` : ''}
  <div class="dish__foot"><span class="w">${esc(item.w || '')}</span>${money(item.price)}</div>
</article>`;

// «Выбор шефа» открыт первым; плашка внутри него не нужна.
const categories = [menu.chef, ...menu.kitchen];
const sections = categories.map((category, index) => {
  const cards = category.items.filter((item) => item.img);
  const rows = category.items.filter((item) => !item.img);
  const grid = `<div class="grid">${cards.map((item) => card(item, category !== menu.chef)).join('\n')}</div>`;
  const list = `<div class="list list--extra">${rows.map(row).join('\n')}</div>`;
  const contents = category.list ? `<div class="list">${category.items.map(row).join('\n')}</div>`
    : !rows.length ? grid : cards.length <= 2 ? `<div class="cat__split">${grid}${list}</div>` : grid + list;
  return `<section class="cat${index === 0 ? ' is-active' : ''}" id="menu-${category.id}" data-category="${category.id}" aria-labelledby="title-${category.id}">
  <div class="cat__head"><h3 class="cat__title" id="title-${category.id}">${esc(category.title)}</h3>${category.note ? `<p class="cat__note">${esc(category.note)}</p>` : ''}</div>
  ${contents}
  <div class="cat__cta"><span>Заказать домой</span><a class="b b--fill b--sm" data-phone-link href="tel:${site.phoneRaw}"><svg><use href="#i-phone" /></svg>Позвонить</a><a class="b b--sm" href="/#order" data-open-contacts><svg><use href="#i-chat" /></svg>Написать</a></div>
</section>`;
}).join('\n');
const navigation = [
  `<a href="#menu-${menu.chef.id}" class="menu__chef is-on" aria-current="true" data-cat="${menu.chef.id}">${esc(menu.chef.title)}</a>`,
  ...menu.kitchen.map((category, index) => `<a href="#menu-${category.id}" class="" data-cat="${category.id}"><span>${String(index + 1).padStart(2, '0')}</span>${esc(category.title)}</a>`),
].join('\n');

let html = readFileSync(`${root}index.html`, 'utf8');
function block(name, content) {
  const pattern = new RegExp(`<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->`);
  if (!pattern.test(html)) throw new Error(`Missing generated block: ${name}`);
  html = html.replace(pattern, () => `<!-- ${name}:start -->\n${content}\n<!-- ${name}:end -->`);
}
block('menu-nav', navigation);
block('menu-body', sections);
if (site.yandexVerification && !/^[a-f\d]{16}$/i.test(site.yandexVerification)) {
  throw new Error('Expected a 16-character public Yandex verification code');
}
block('verification', site.yandexVerification ? `<meta name="yandex-verification" content="${site.yandexVerification}" />` : '');

// Update fallback text and links, preserving the surrounding hand-edited layout.
const texts = {
  'data-phone-text': site.phone, 'data-address': site.address,
  'data-address-short': site.addressShort,
  'data-legal': site.legal, 'data-instagram': `Instagram @${site.instagram}`,
};
for (const [attribute, value] of Object.entries(texts)) {
  html = html.replace(new RegExp(`(<([a-z]+)\\b[^>]*\\b${attribute}(?=[\\s>])[^>]*>)[^<]*(</\\2\\s*>)`, 'g'), (_, open, tag, close) => open + esc(value) + close);
}
const links = {
  'data-phone-link': `tel:${site.phoneRaw}`,
  'data-wa': `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Здравствуйте!')}`,
  'data-tg': site.telegram, 'data-max': site.max,
  'data-yandex': site.yandexOrg, 'data-2gis': site.twoGis,
  'data-yandex-reviews': site.yandexReviews, 'data-2gis-reviews': site.twoGisReviews,
  'data-instagram': `https://instagram.com/${site.instagram}`,
  'data-route': `https://yandex.ru/maps/?rtext=~${site.lat},${site.lng}&rtt=auto`,
};
for (const [attribute, value] of Object.entries(links)) {
  html = html.replace(new RegExp(`<a\\b[^>]*\\b${attribute}(?=[=\\s>])[^>]*>`, 'g'), (tag) => {
    const clean = tag.replace(/\s+href="[^"]*"/, '');
    return clean.replace(/^<a/, `<a href="${esc(value)}"`);
  });
}
html = html.replace(/<img\b[^>]*\bdata-static-map\b[^>]*>/g, (tag) => {
  const src = `https://static-maps.yandex.ru/1.x/?ll=${site.lng},${site.lat}&z=16&size=650,450&l=map&pt=${site.lng},${site.lat},pm2rdl&lang=ru_RU`;
  return tag.replace(/\s+src="[^"]*"/, '').replace('<img', `<img src="${esc(src)}"`);
});

const restaurant = {
  '@context': 'https://schema.org', '@type': 'Restaurant', '@id': `${site.url}/#restaurant`,
  name: 'Чё? Шашлык', url: `${site.url}/`, image: `${site.url}/assets/img/hero/hero-1.jpg`,
  logo: `${site.url}/assets/brand/logo-full-dark.png`, servesCuisine: ['Кавказская кухня'],
  priceRange: '₽₽', telephone: site.phoneRaw, acceptsReservations: true,
  address: { '@type': 'PostalAddress', streetAddress: 'проспект Кирова, 27А', addressLocality: 'Пятигорск', addressRegion: 'Ставропольский край', addressCountry: 'RU' },
  geo: { '@type': 'GeoCoordinates', latitude: site.lat, longitude: site.lng },
  hasMap: site.yandexOrg,
  sameAs: [site.yandexOrg, site.twoGis, site.telegram],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '11:00', closes: '00:00',
  },
  hasMenu: {
    '@type': 'Menu', '@id': `${site.url}/#menu`, name: 'Меню ресторана «Чё? Шашлык»', url: `${site.url}/#menu`, inLanguage: 'ru',
    hasMenuSection: menu.kitchen.map((category) => ({
      '@type': 'MenuSection', name: category.title, url: `${site.url}/#menu-${category.id}`,
      hasMenuItem: category.items.map((item) => ({
        '@type': 'MenuItem', name: item.name,
        ...(item.desc ? { description: item.desc } : {}),
        ...(item.img ? { image: `${site.url}${imagePath}${item.img}.jpg` } : {}),
        ...(item.price != null ? { offers: { '@type': 'Offer', price: item.price, priceCurrency: 'RUB' } } : {}),
      })),
    })),
  },
};
html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => `<script type="application/ld+json">\n${JSON.stringify(restaurant).replace(/</g, '\\u003c')}\n    </script>`);

if (process.argv.includes('--check')) {
  if (html !== readFileSync(`${root}index.html`, 'utf8')) {
    console.error('Generated HTML is stale. Run node scripts/build-seo.mjs');
    process.exitCode = 1;
  } else console.log('Static menu, contacts and Schema.org match the source data.');
} else {
  writeFileSync(`${root}index.html`, html);
  console.log(`Generated ${menu.kitchen.length} categories and ${menu.kitchen.reduce((sum, cat) => sum + cat.items.length, 0)} menu items.`);
}
