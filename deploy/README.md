# Публикация на существующем nginx

## Как устроено на cheshashlik.ru (с 7 октября 2026)

- Корень сайта `/var/www/shashlik-bridge` — git-репозиторий
  github.com/ddosmast3r/shashlik-bridge. Push в `main` запускает GitHub Actions,
  сервер делает `git reset --hard origin/main`.
- Публикация: скопировать `vers_2/` (без `README.md`) в shashlik-bridge, там
  `node scripts/build.mjs` (встраивает стили, ставит версии скриптам),
  `node scripts/check.mjs`, коммит и push. Служебные файлы bridge
  (`.github`, `scripts`, `public`, `package.json`, `yandex_c905b937071eea3f.html`)
  не удалять: последний подтверждает права в Вебмастере.
- `/etc/nginx/sites-available/shashlik-bridge` подключает
  `/etc/nginx/snippets/cheshashlik-site.conf` — это копия `nginx-site.conf`.
  После её изменения: скопировать на сервер, `nginx -t`, `systemctl reload nginx`.
- Сертификат продлевает certbot с плагином nginx; проверка `certbot renew --dry-run`.

Ниже — общая инструкция для другого nginx.

7 октября 2026 публичный сервер отвечает `nginx/1.24.0 (Ubuntu)`.
Загрузка HTML не применяет серверные редиректы: `.htaccess` nginx не читает.

1. В корне репозитория выполнить `node scripts/build-seo.mjs`, затем
   `node scripts/build-seo.mjs --check` и `python3 scripts/check-seo.py`.
2. Загрузить содержимое `vers_2/` в текущий document root домена.
   Сохранить существующие файлы подтверждения Яндекса и `.well-known/`.
   Папки `scripts/`, `deploy/`, `docs/`, `ref/` на сайт не загружать.
3. В существующем HTTPS-блоке `server` подключить абсолютным путём
   `nginx-site.conf`. Удалить или заменить конфликтующие `location`, `index`,
   `error_page`, `gzip` и настройки кеша в этом же блоке. Существующие пути
   `root`, сертификаты, порты и ACME-конфигурацию сохранить.
4. HTTP-блок должен перенаправлять оба имени на HTTPS без www:

   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name cheshashlik.ru www.cheshashlik.ru;
       # Сохранить отдельный location /.well-known/acme-challenge/, если он нужен.
       location / { return 301 https://cheshashlik.ru$request_uri; }
   }
   ```

   Если HTTPS для `www` обслуживает отдельный `server`, сохранить его сертификат
   и задать в нём `return 301 https://cheshashlik.ru$request_uri;`.
5. Проверить `nginx -t`, после успешной проверки выполнить reload принятым
   на сервере способом. Проверить `python3 scripts/check-seo.py --url https://cheshashlik.ru`.

Ожидается: `/`, `/privacy.html`, `/robots.txt`, `/sitemap.xml` → 200;
`/index.html`, `/menu`, `/menu/`, `/menu/index.html`, `/shashlyk/` → 301;
неизвестные страницы и неизвестные файлы → 404 с оформленной страницей ошибки.
Параметры рекламы сохраняются при редиректе, canonical указывает URL без них.
Старые HTML-файлы в `menu/` и `shashlyk/` остаются запасным переходом
для простого статического хостинга; на nginx их перехватывает HTTP 301.

## Яндекс Вебмастер

В кабинете добавить `https://cheshashlik.ru/`, взять публичный код подтверждения
из «Права доступа → Метатег», записать в `yandexVerification` в `config.js`,
запустить генератор и загрузить обновлённый `index.html`. Если права уже
подтверждены через DNS или HTML-файл, менять способ не нужно.
После публикации нажать «Подтвердить», добавить `https://cheshashlik.ru/sitemap.xml`
и отправить главную на переобход. Проверить «Страницы в поиске», «Статистика
обхода», дубли и ошибки. Наличие кода на странице само по себе не означает,
что кабинет подключён и страницы включены в поиск.

## Метрика и Core Web Vitals

Сохранены счётчики 110450622 и 105239781. Код работает на главной, странице
политики и 404; счётчики загружаются только после согласия. Отказ и отзыв
согласия отключают аналитику, в том числе в других вкладках.

Официальная библиотека `web-vitals` 6.2.3 размещена локально с лицензией.
После согласия LCP, CLS и INP передаются в основной счётчик методом `params`
в `web_vitals`, с полями `value`, `rating`, `id`, `navigationType`.
LCP/INP — миллисекунды, CLS — безразмерный показатель. Итоговые значения
отправляются при скрытии страницы; INP требует взаимодействия посетителя.
Для оценки брать последние значения для каждой пары `id`/метрика, затем p75
отдельно по мобильным и компьютерам. Значения Lighthouse — лабораторные,
они не подтверждают прохождение полевых Core Web Vitals.

Источники: [права Вебмастера](https://yandex.ru/support/webmaster/ru/service/rights),
[sitemap](https://yandex.ru/support/webmaster/en/indexing-options/sitemap),
[Web Vitals](https://web.dev/articles/vitals),
[библиотека web-vitals](https://github.com/GoogleChrome/web-vitals).
