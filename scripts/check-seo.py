#!/usr/bin/env python3
"""Check shipped HTML, local references, sitemap, and optional HTTP deployment."""
import argparse
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1] / 'vers_2'
ERRORS = []


def check(condition, message):
    if not condition:
        ERRORS.append(message)


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.tags = []
        self.ids = set()
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            check(attrs['id'] not in self.ids, f'{self.path}: duplicate id {attrs["id"]}')
            self.ids.add(attrs['id'])


def local_target(url, source):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        return None
    path = (ROOT / unquote(parsed.path).lstrip('/')) if parsed.path.startswith('/') else source.parent / unquote(parsed.path)
    if not parsed.path:
        path = source
    if path.is_dir():
        path = path / 'index.html'
    return path.resolve(), unquote(parsed.fragment)


pages = {p.resolve(): Page(p) for p in ROOT.rglob('*.html')}
titles, descriptions = set(), set()
for path, page in pages.items():
    text = path.read_text()
    redirect = any(tag == 'meta' and attrs.get('http-equiv') == 'refresh' for tag, attrs in page.tags)
    meta = {a.get('name'): a.get('content', '') for tag, a in page.tags if tag == 'meta'}
    title = re.findall(r'<title>(.*?)</title>', text, re.S)
    check(len(title) == 1 and bool(title[0].strip()), f'{path}: missing/duplicate title')
    check(meta.get('description'), f'{path}: missing description')
    check(meta.get('viewport'), f'{path}: missing viewport')
    if not redirect:
        check(title[0] not in titles, f'{path}: duplicate title')
        check(meta.get('description') not in descriptions, f'{path}: duplicate description')
        titles.add(title[0])
        descriptions.add(meta.get('description'))
        headings = [int(tag[1]) for tag, _ in page.tags if re.fullmatch('h[1-6]', tag)]
        check(headings.count(1) == 1, f'{path}: expected one H1')
        check(all(b <= a + 1 for a, b in zip(headings, headings[1:])), f'{path}: skipped heading level')
    canonical = [a.get('href') for tag, a in page.tags if tag == 'link' and a.get('rel') == 'canonical']
    if path.name != '404.html':
        check(len(canonical) == 1 and canonical[0].startswith('https://cheshashlik.ru/') and '#' not in canonical[0], f'{path}: invalid canonical')
    else:
        check('noindex' in meta.get('robots', ''), '404 must be noindex')
    for schema in re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.S):
        json.loads(schema)
    for tag, attrs in page.tags:
        if tag == 'img':
            check('alt' in attrs, f'{path}: image without alt')
            check('width' in attrs and 'height' in attrs, f'{path}: image without dimensions')
        if tag == 'a':
            check(bool(attrs.get('href')) and attrs.get('href') != '#', f'{path}: empty anchor: {attrs}')
        refs = [attrs[a] for a in ['href', 'src', 'data-full'] if attrs.get(a)]
        if attrs.get('srcset'):
            refs += [part.strip().split()[0] for part in attrs['srcset'].split(',') if part.strip()]
        for ref in refs:
            target = local_target(ref, path)
            if target:
                file, fragment = target
                check(file.is_file(), f'{path}: broken file {ref}')
                if fragment and file in pages:
                    check(fragment in pages[file].ids, f'{path}: broken fragment {ref}')

for css in (ROOT / 'assets').rglob('*.css'):
    for quoted, single, bare in re.findall(r'''url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)''', css.read_text()):
        url = quoted or single or bare.strip()
        target = local_target(url, css)
        if target:
            check(target[0].is_file(), f'{css}: broken asset {url}')

tree = ET.parse(ROOT / 'sitemap.xml')
urls = [el.text for el in tree.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
check(len(set(urls)) == len(urls), 'Duplicate URLs in sitemap')
for url in urls:
    parsed = urlsplit(url)
    check(parsed.scheme == 'https' and parsed.netloc == 'cheshashlik.ru' and not parsed.fragment and not parsed.query, f'Invalid sitemap URL: {url}')
    target = local_target(parsed.path, ROOT / 'index.html')[0]
    check(target in pages, f'Sitemap file missing: {url}')
    if target in pages:
        check('noindex' not in target.read_text(), f'Sitemap includes noindex page: {url}')
        check(f'rel="canonical" href="{url}"' in target.read_text(), f'Sitemap/canonical mismatch: {url}')
check('Sitemap: https://cheshashlik.ru/sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'Missing sitemap in robots')

parser = argparse.ArgumentParser()
parser.add_argument('--url', help='Optional deployed or local nginx origin')
args = parser.parse_args()
if args.url:
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    cases = [('/', 200, None), ('/privacy.html', 200, None), ('/robots.txt', 200, None), ('/sitemap.xml', 200, None),
             ('/index.html', 301, 'https://cheshashlik.ru/'), ('/menu', 301, 'https://cheshashlik.ru/#menu'),
             ('/menu/', 301, 'https://cheshashlik.ru/#menu'), ('/menu/index.html', 301, 'https://cheshashlik.ru/#menu'),
             ('/shashlyk/', 301, 'https://cheshashlik.ru/#menu'), ('/privacy/', 301, 'https://cheshashlik.ru/privacy.html'),
             ('/menu/?utm_source=test', 301, 'https://cheshashlik.ru/?utm_source=test#menu'),
             ('/seo-audit-missing-20261007', 404, None), ('/assets/missing.js', 404, None), ('/404.html', 404, None)]
    for path, status, location in cases:
        try:
            try:
                response = opener.open(urljoin(args.url, path), timeout=20)
            except urllib.error.HTTPError as error:
                response = error
            check(response.code == status, f'{path}: expected {status}, received {response.code}')
            if location:
                check(response.headers.get('Location') == location, f'{path}: wrong redirect {response.headers.get("Location")}')
            if status == 404:
                check('Страница не найдена' in response.read().decode('utf-8', errors='replace'), f'{path}: missing custom 404')
            print(f'{response.code} {path}')
        except Exception as error:
            ERRORS.append(f'{path}: {error}')

if ERRORS:
    print('\n'.join(ERRORS), file=sys.stderr)
    sys.exit(1)
print(f'OK: {len(pages)} HTML pages, local links/assets, metadata, headings, JSON-LD and sitemap.')
