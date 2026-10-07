(() => {
  document.documentElement.classList.add('js');
  const SITE = window.SITE || {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let vitalsStarted = false;
  async function startVitals() {
    if (vitalsStarted) return;
    vitalsStarted = true;
    try {
      const { onCLS, onINP, onLCP } = await import('/assets/js/vendor/web-vitals.js');
      const report = ({ name, value, rating, id, navigationType }) => {
        if (consent !== 'yes' || !metrikaActive) return;
        const metric = { value: Math.round(value * 1000) / 1000, rating, id, navigationType };
        window.ym(SITE.metrikaId, 'params', { web_vitals: { [name]: metric } });
      };
      onCLS(report);
      onINP(report);
      onLCP(report);
    } catch {
      vitalsStarted = false; // Analytics must never break the site.
    }
  }

  /* ---------- cookie и Яндекс Метрика ----------
     Метрика загружается только после согласия посетителя. Номер счётчика — в config.js (metrikaId). */
  const COOKIE_KEY = 'che-cookie-consent';
  const banner = $('#cookie-banner');
  const readConsent = () => { try { return localStorage.getItem(COOKIE_KEY); } catch { return null; } };
  const saveConsent = (v) => { try { localStorage.setItem(COOKIE_KEY, v); } catch { /* приватный режим */ } };
  let consent = readConsent();
  let metrikaActive = false;
  let metrikaReady = false;
  let metrikaLoading = false;

  function startMetrika() {
    if (consent !== 'yes' || metrikaActive) return;
    metrikaActive = true;
    startVitals();
    window.ym(SITE.metrikaId, 'init', { webvisor: true, clickmap: true, accurateTrackBounce: true, trackLinks: true });
    if (SITE.metrikaBizId) {
      window.ym(SITE.metrikaBizId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    }
  }

  function loadMetrika() {
    if (!SITE.metrikaId || metrikaActive) return;
    if (metrikaReady) { startMetrika(); return; }
    if (metrikaLoading) return;
    metrikaLoading = true;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    script.onload = () => {
      metrikaLoading = false;
      metrikaReady = true;
      // Согласие могли отозвать, пока загружался скрипт.
      startMetrika();
    };
    script.onerror = () => { metrikaLoading = false; script.remove(); };
    document.head.append(script);
  }

  function stopMetrika() {
    if (!metrikaActive) return;
    metrikaActive = false;
    window.ym(SITE.metrikaId, 'destruct');
    if (SITE.metrikaBizId) window.ym(SITE.metrikaBizId, 'destruct');
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
    if (!a || consent !== 'yes' || !metrikaActive || typeof window.ym !== 'function') return;
    const [goal, biz] = goalsFor(a);
    if (goal) window.ym(SITE.metrikaId, 'reachGoal', goal);
    if (biz && SITE.metrikaBizId) window.ym(SITE.metrikaBizId, 'reachGoal', biz);
  });

  if (consent === 'yes') loadMetrika();
  else if (!consent && banner) banner.hidden = false;

  $$('[data-cookie]').forEach((b) => b.addEventListener('click', () => {
    consent = b.dataset.cookie;
    saveConsent(consent);
    banner.hidden = true;
    if (consent === 'yes') loadMetrika();
    else stopMetrika();
  }));
  $$('[data-cookie-settings]').forEach((b) => b.addEventListener('click', () => { banner.hidden = false; }));
  window.addEventListener('storage', (e) => {
    if (e.key !== COOKIE_KEY && e.key !== null) return;
    consent = readConsent();
    if (banner) banner.hidden = !!consent;
    if (consent === 'yes') loadMetrika();
    else stopMetrika();
  });

})();
