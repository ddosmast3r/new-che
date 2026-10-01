(() => {
  const SITE = window.SITE || {};
  const MENU = window.MENU;
  const IMG = window.MENU_IMG;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fill = (sel, fn) => $$(sel).forEach(fn);

  /* ---------- контакты из config.js ---------- */
  const tel = 'tel:' + SITE.phoneRaw;
  const waText = {
    hello: 'Здравствуйте! Пишу с сайта «Чё? Шашлык».',
    delivery: 'Здравствуйте! Хочу заказать доставку из «Чё? Шашлык».',
    booking: 'Здравствуйте! Хочу забронировать стол в «Чё? Шашлык».',
  };
  const waLink = (kind) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(waText[kind] || waText.hello)}`;

  function applyContacts(root = document) {
    $$('[data-phone-text]', root).forEach((el) => { el.textContent = SITE.phone; });
    $$('[data-phone-link]', root).forEach((el) => { el.href = tel; });
    $$('[data-wa]', root).forEach((el) => { el.href = waLink(el.dataset.wa); });
    $$('[data-tg]', root).forEach((el) => { el.href = SITE.telegram; });
    $$('[data-max]', root).forEach((el) => { el.href = SITE.max; });
  }
  applyContacts();

  fill('[data-address]', (el) => { el.textContent = SITE.address; });
  fill('[data-address-short-full]', (el) => { el.textContent = 'Пятигорск, ' + SITE.addressShort; });
  fill('[data-instagram]', (el) => { el.href = 'https://instagram.com/' + SITE.instagram; el.textContent = 'Instagram @' + SITE.instagram; });
  fill('[data-yandex]', (el) => { el.href = SITE.yandexOrg; });
  fill('[data-2gis]', (el) => { el.href = SITE.twoGis; });
  fill('[data-yandex-reviews]', (el) => { el.href = SITE.yandexReviews; });
  fill('[data-2gis-reviews]', (el) => { el.href = SITE.twoGisReviews; });
  fill('[data-yandex-rating]', (el) => { el.textContent = SITE.yandexRating; });
  fill('[data-2gis-rating]', (el) => { el.textContent = SITE.twoGisRating; });
  fill('[data-route]', (el) => { el.href = `https://yandex.ru/maps/?rtext=~${SITE.lat},${SITE.lng}&rtt=auto`; });
  fill('[data-legal]', (el) => { el.textContent = SITE.legal; });
  fill('[data-year]', (el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- открыто / закрыто (время Москвы) ---------- */
  function renderStatus() {
    const now = new Date();
    const msk = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
    const h = msk.getHours() + msk.getMinutes() / 60;
    const isOpen = h >= SITE.open && h < SITE.close;
    fill('[data-status]', (el) => {
      el.classList.toggle('is-open', isOpen);
      el.textContent = isOpen ? 'открыто до 00:00' : `закрыто · с ${SITE.open}:00`;
    });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---------- плавающая навигация и нижняя панель: после первого экрана ---------- */
  const pill = $('.pill');
  const dock = $('.dock');
  const heroBtns = $('.hero .btns');
  new IntersectionObserver(([e]) => {
    const past = !e.isIntersecting && e.boundingClientRect.top < 0;
    pill.classList.toggle('is-shown', past);
    dock.classList.toggle('is-shown', past);
  }).observe(heroBtns);

  /* ---------- карта: статичная картинка Яндекса (без рекламы), по клику — Яндекс Карты ---------- */
  const mapUrl = (scale) => `https://static-maps.yandex.ru/1.x/?ll=${SITE.lng},${SITE.lat}&z=16&size=650,450&scale=${scale}&l=map&pt=${SITE.lng},${SITE.lat},pm2rdl&lang=ru_RU`;
  fill('[data-static-map]', (img) => {
    img.src = mapUrl(1);
    img.srcset = `${mapUrl(1)} 650w, ${mapUrl(1.5)} 975w`;
    img.sizes = '(max-width: 980px) 100vw, 60vw';
  });

  /* ---------- подсказка и копирование адреса ---------- */
  const toast = $('#toast');
  let toastTimer;
  const showToast = (text) => {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  };
  $$('[data-copy-address]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(SITE.address);
      showToast('Адрес скопирован');
    } catch {
      showToast(SITE.address);
    }
  }));

  /* ---------- cookie и Яндекс Метрика ----------
     Метрика загружается только после согласия посетителя. Номер счётчика — в config.js (metrikaId). */
  const COOKIE_KEY = 'che-cookie-consent';
  const banner = $('#cookie');
  const readConsent = () => { try { return localStorage.getItem(COOKIE_KEY); } catch { return null; } };
  const saveConsent = (v) => { try { localStorage.setItem(COOKIE_KEY, v); } catch { /* приватный режим */ } };

  function loadMetrika() {
    if (!SITE.metrikaId || window.ym) return;
    /* стандартный код счётчика Яндекс Метрики */
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(SITE.metrikaId, 'init', { webvisor: true, clickmap: true, accurateTrackBounce: true, trackLinks: true });
    if (SITE.metrikaBizId) {
      window.ym(SITE.metrikaBizId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    }
  }

  /* Цели — те же идентификаторы, что на прежнем cheshashlik.ru, чтобы не заводить их заново.
     Определяются по ссылке; data-goal на элементе имеет приоритет. */
  function goalsFor(a) {
    if (a.dataset.goal) return [a.dataset.goal, a.dataset.goalBiz];
    const href = a.getAttribute('href') || '';
    if (href.startsWith('tel:')) return ['click_phone', 'make-call'];
    if (href.includes('wa.me')) return ['click_whatsapp'];
    if (href.includes('t.me/')) return ['click_telegram'];
    if (href.includes('max.ru')) return ['click_max'];
    if (href.includes('2gis.ru')) return [href.includes('/reviews') ? 'click_reviews' : 'click_2gis'];
    if (href.includes('yandex.ru/maps')) return [href.includes('/reviews') ? 'click_reviews' : 'click_route', href.includes('/reviews') ? null : 'make-route'];
    return [];
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href], [data-goal]');
    if (!a || typeof window.ym !== 'function') return;
    const [goal, biz] = goalsFor(a);
    if (goal) window.ym(SITE.metrikaId, 'reachGoal', goal);
    if (biz && SITE.metrikaBizId) window.ym(SITE.metrikaBizId, 'reachGoal', biz);
  });

  const consent = readConsent();
  if (consent === 'yes') loadMetrika();
  else if (!consent) banner.hidden = false;

  $$('[data-cookie]', banner).forEach((b) => b.addEventListener('click', () => {
    saveConsent(b.dataset.cookie);
    banner.hidden = true;
    if (b.dataset.cookie === 'yes') loadMetrika();
  }));
  $$('[data-cookie-settings]').forEach((b) => b.addEventListener('click', () => { banner.hidden = false; }));

  /* ---------- окно «Написать нам» ---------- */
  const sheet = $('#contacts');
  let lastFocus = null;
  const openSheet = () => {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    $('.sheet__list a', sheet).focus();
  };
  const closeSheet = () => {
    sheet.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { sheet.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  };
  $$('[data-open-contacts]').forEach((b) => b.addEventListener('click', openSheet));
  $$('[data-close], .sheet__list a', sheet).forEach((b) => b.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  /* ---------- меню ---------- */
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const priceHtml = (p) => (p === null || p === undefined)
    ? '<span class="price--ask">цену уточняйте</span>'
    : `<span class="price">${esc(fmt(p))} <small>₽</small></span>`;

  const state = { cat: MENU.kitchen[0].id };
  const nav = $('#menu-nav');
  const body = $('#menu-body');

  const dishCard = (it) => `
    <article class="dish${it.img ? '' : ' dish--noimg'}">
      ${it.img ? `<div class="window"><img src="${IMG + it.img}.jpg" alt="${esc(it.name)}" loading="lazy">${it.chef ? '<span class="seal">Шеф советует</span>' : ''}</div>` : ''}
      <h4 class="dish__name">${esc(it.name)}</h4>
      ${it.desc ? `<p class="dish__desc">${esc(it.desc)}</p>` : ''}
      <div class="dish__foot"><span class="w">${esc(it.w || '')}</span>${priceHtml(it.price)}</div>
    </article>`;

  const listRow = (it) => `
    <div class="row">
      <span class="row__name">${esc(it.name)}</span>
      <span class="w">${esc(it.w || '')}</span>
      ${priceHtml(it.price)}
      ${it.desc ? `<span class="row__desc">${esc(it.desc)}</span>` : ''}
    </div>`;

  function renderNav() {
    nav.innerHTML = MENU.kitchen.map((c, n) =>
      `<button type="button" class="${c.id === state.cat ? 'is-on' : ''}" aria-current="${c.id === state.cat}" data-cat="${c.id}"><span>${String(n + 1).padStart(2, '0')}</span>${esc(c.title)}</button>`
    ).join('');
  }

  function renderCat() {
    const cat = MENU.kitchen.find((c) => c.id === state.cat);
    body.innerHTML = `
      <div class="cat">
        <div class="cat__head">
          <h3 class="cat__title">${esc(cat.title)}</h3>
          ${cat.note ? `<p class="cat__note">${esc(cat.note)}</p>` : ''}
        </div>
        ${cat.list
          ? `<div class="list">${cat.items.map(listRow).join('')}</div>`
          : `<div class="grid">${cat.items.map(dishCard).join('')}</div>`}
        <div class="cat__cta">
          <span>Заказать с доставкой?</span>
          <a class="b b--fill b--sm" data-phone-link href="#"><svg><use href="#i-phone"/></svg>Позвонить</a>
          <a class="b b--sm" data-wa="delivery" href="#" target="_blank" rel="noopener"><svg><use href="#i-wa"/></svg>WhatsApp</a>
          <a class="b b--sm" data-tg href="#" target="_blank" rel="noopener"><svg><use href="#i-tg"/></svg>Telegram</a>
          <a class="b b--sm" data-max href="#" target="_blank" rel="noopener"><svg><use href="#i-max"/></svg>MAX</a>
        </div>
      </div>`;
    applyContacts(body);
  }

  function setCat(id) {
    state.cat = id;
    renderNav();
    renderCat();
    const on = $('.is-on', nav);
    if (on && nav.scrollWidth > nav.clientWidth) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    const top = body.getBoundingClientRect().top + window.scrollY - (window.innerWidth <= 860 ? 80 : 100);
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }

  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) setCat(b.dataset.cat);
  });

  renderNav();
  renderCat();
})();
