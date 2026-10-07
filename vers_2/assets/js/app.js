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
    hello: 'Здравствуйте!',
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
  fill('[data-address-short]', (el) => { el.textContent = SITE.addressShort; });
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
      el.textContent = isOpen ? 'открыто' : 'закрыто';
    });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---------- плавающая навигация и нижняя панель: как только шапка ушла с экрана ---------- */
  const pill = $('.pill');
  const dock = $('.dock');
  const hero = $('.hero');
  new IntersectionObserver(([e]) => {
    const past = !e.isIntersecting && e.boundingClientRect.top < 0;
    pill.classList.toggle('is-shown', past);
    dock.classList.toggle('is-shown', past);
  }).observe(hero);

  /* ---------- лента фото интерьера в шапке: сама медленно листается по кругу ---------- */
  // Клиенту нравится движение. Лента — обычная прокручиваемая полоса: колесо мыши, тачпад
  // и палец работают как везде. Пока курсор над лентой, её листают или фото выбрано
  // с клавиатуры, автопрокрутка ждёт. Копии фото нужны для бесконечного круга, они скрыты
  // от экранного диктора и клавиатуры, но открываются по нажатию.
  const reel = $('.hero__reel');
  const strip = reel && $('.hero__photos', reel);
  if (strip && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const originals = [...strip.children];
    originals.forEach((li) => {
      const copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      $$('button', copy).forEach((b) => { b.tabIndex = -1; });
      strip.append(copy);
    });
    reel.classList.add('is-moving');
    // после загрузки страницы догружаем остальные фото ленты, чтобы они не въезжали пустыми
    window.addEventListener('load', () => $$('img', strip).forEach((img) => { img.loading = 'eager'; }), { once: true });

    const SPEED = 20; // пикселей в секунду
    const vertical = window.matchMedia('(min-width: 861px)'); // на компьютере лента вертикальная
    const dialog = $('#photo');
    const read = () => (vertical.matches ? strip.scrollTop : strip.scrollLeft);
    const write = (v) => { if (vertical.matches) strip.scrollTop = v; else strip.scrollLeft = v; };
    // длина одного круга: от первого фото до его копии
    const lap = () => {
      const a = originals[0];
      const b = strip.children[originals.length];
      return vertical.matches ? b.offsetTop - a.offsetTop : b.offsetLeft - a.offsetLeft;
    };
    let pos = read();
    let written = pos;
    let last = 0;
    let frame = 0;
    let hover = false;
    let onScreen = true;
    let waitUntil = 0;
    const wait = (ms) => { waitUntil = performance.now() + ms; };

    const tick = (now) => {
      frame = 0;
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      if (!hover && now > waitUntil && !dialog?.open && !strip.matches(':focus-within')) {
        pos += SPEED * dt;
        const length = lap();
        if (length > 0 && pos >= length) pos -= length; // копия на месте оригинала — шва не видно
        write(pos);
        written = read();
      }
      if (onScreen) frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || !onScreen) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    // прокрутка посетителя: запоминаем, где он остановился, и ждём, пока он посмотрит
    strip.addEventListener('scroll', () => {
      const v = read();
      if (Math.abs(v - written) < 2) return; // это наша же автопрокрутка
      pos = v;
      written = v;
      wait(3000);
    }, { passive: true });
    reel.addEventListener('mouseenter', () => { hover = true; });
    reel.addEventListener('mouseleave', () => { hover = false; wait(1200); });
    reel.addEventListener('touchstart', () => wait(4000), { passive: true });
    vertical.addEventListener('change', () => { pos = read(); written = pos; });
    new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start();
    }).observe(reel);
    start();
  }

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

  /* ---------- окно «Написать нам» ---------- */
  const sheet = $('#contacts');
  const sheetBackground = $$('.page, .pill, .dock, #cookie-banner');
  let lastFocus = null;
  let sheetOpen = false;
  let sheetCloseTimer;
  const openSheet = () => {
    if (sheetOpen) return;
    clearTimeout(sheetCloseTimer);
    sheetOpen = true;
    lastFocus = document.activeElement;
    sheet.hidden = false;
    sheetBackground.forEach((el) => { el.inert = true; });
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => { if (sheetOpen) sheet.classList.add('is-open'); });
    $('.sheet__list a', sheet).focus({ preventScroll: true });
  };
  const closeSheet = () => {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove('is-open');
    sheetBackground.forEach((el) => { el.inert = false; });
    document.body.classList.remove('no-scroll');
    sheetCloseTimer = setTimeout(() => { sheet.hidden = true; }, 250);
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  };
  // Ссылки ведут к контактам без JavaScript; с JavaScript открывают мессенджеры.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-open-contacts]')) return;
    e.preventDefault();
    openSheet();
  });
  $$('[data-close], .sheet__list a', sheet).forEach((b) => b.addEventListener('click', closeSheet));
  document.addEventListener('keydown', (e) => {
    if (!sheetOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    if (e.key !== 'Tab') return;
    const focusable = $$('button, a[href]', sheet);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* ---------- меню ---------- */
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const priceHtml = (p) => (p === null || p === undefined)
    ? '<span class="price--ask">цену уточняйте</span>'
    : `<span class="price">${esc(fmt(p))} <small>руб.</small></span>`;

  const CATS = [MENU.chef, ...MENU.kitchen];
  const state = { cat: CATS[0].id };
  const nav = $('#menu-nav');
  const body = $('#menu-body');
  const menuCard = $('#menu');

  // All categories are present in the initial HTML. JavaScript only switches visibility.
  const TONE = { cold: 'beige', salads: 'olive', soups: 'beige', sides: 'beige', sauces: 'beige' };
  function renderCat() {
    const cat = CATS.find((category) => category.id === state.cat);
    menuCard.dataset.tone = TONE[cat.id] || 'light';
    $$('[data-category]', body).forEach((section) => {
      section.classList.toggle('is-active', section.dataset.category === state.cat);
    });
  }

  function setCat(id, scroll = true) {
    if (!CATS.some((cat) => cat.id === id)) return;
    state.cat = id;
    $$('[data-cat]', nav).forEach((button) => {
      const selected = button.dataset.cat === id;
      button.classList.toggle('is-on', selected);
      if (selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    renderCat();
    if (!scroll) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    const on = $('.is-on', nav);
    if (on && nav.scrollWidth > nav.clientWidth) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior });
    const top = body.getBoundingClientRect().top + window.scrollY - (window.innerWidth <= 860 ? 80 : 100);
    if (window.scrollY > top) window.scrollTo({ top, behavior });
  }

  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    history.pushState(null, '', b.getAttribute('href'));
    setCat(b.dataset.cat);
  });

  /* фото крупно (блюда и интерьер): закрывается крестиком, Esc или нажатием в любом месте */
  const photo = $('#photo');
  function showPhoto(src, alt, caption, tall) {
    const img = $('.photo__img', photo);
    img.src = src;
    img.alt = alt;
    photo.setAttribute('aria-label', `Фото: ${alt}`);
    photo.classList.toggle('photo--tall', tall);
    $('.photo__cap', photo).innerHTML = caption;
    if (window.typo) window.typo(photo);
    photo.showModal();
    document.body.classList.add('no-scroll');
  }
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-photo]');
    if (!b) return;
    const it = CATS.find((c) => c.id === state.cat).items.find((i) => i.img === b.dataset.photo);
    showPhoto(IMG + it.img + '.jpg', it.name,
      `<span class="photo__name">${esc(it.name)}</span><span class="w">${esc(it.w || '')}</span>${priceHtml(it.price)}`, false);
  });
  // фото интерьера открываются и из галереи, и из шапки
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-full]');
    if (!b) return;
    const alt = $('img', b).alt;
    showPhoto(b.dataset.full, alt, `<span class="photo__name">${esc(alt)}</span>`, true);
  });
  photo.addEventListener('click', () => photo.close());
  photo.addEventListener('close', () => document.body.classList.remove('no-scroll'));

  const syncHash = () => {
    const id = location.hash.replace('#menu-', '');
    setCat(CATS.some((cat) => cat.id === id) ? id : CATS[0].id, false);
  };
  window.addEventListener('hashchange', syncHash);
  syncHash();
})();
