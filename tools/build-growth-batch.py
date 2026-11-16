import hashlib
import html
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = Path(__file__).resolve().parent
DOMAIN = 'https://navseg-da.agency'
VERSION = 'growth20261116'
BATCH = json.loads((TOOLS / 'growth-batch.json').read_text())
ARTICLES = json.loads((TOOLS / 'growth-articles.json').read_text())


def escape(value):
    return html.escape(str(value), quote=True)


def links(items):
    return '<div class="nsg-growth__links">' + ''.join(f'<a href="{escape(url)}">{escape(title)}</a>' for url, title in items) + '</div>'


def table(data):
    heading = ''.join(f'<th scope="col">{escape(value)}</th>' for value in data['headers'])
    rows = ''.join('<tr>' + ''.join(f'<td>{escape(value)}</td>' for value in row) + '</tr>' for row in data['rows'])
    return f'<div class="nsg-growth__table" role="region" aria-label="Сравнение смет" tabindex="0"><table><thead><tr>{heading}</tr></thead><tbody>{rows}</tbody></table></div>'


def assets(text):
    text = re.sub(r'<link[^>]+href="/assets/growth/growth.css[^\"]*"[^>]*>\n?', '', text)
    text = re.sub(r'<script[^>]+src="/assets/growth/growth.js[^\"]*"[^>]*></script>\n?', '', text)
    text = text.replace('</head>', f'<link rel="stylesheet" href="/assets/growth/growth.css?v={VERSION}">\n</head>', 1)
    text = text.replace('</body>', f'<script src="/assets/growth/growth.js?v={VERSION}" defer></script>\n</body>', 1)
    return re.sub(r'/assets/js/tg-field.js\?v=[^\"\x27]+', '/assets/js/tg-field.js?v=' + VERSION, text)


def remove_previous(text, marker):
    return re.sub(r'<!-- ' + re.escape(marker) + r' start -->.*?<!-- ' + re.escape(marker) + r' end -->\n?', '', text, flags=re.S)


def marked(marker, content):
    return f'<!-- {marker} start -->{content}<!-- {marker} end -->\n'


def growth_block(page):
    points = '<ol>' + ''.join(f'<li>{escape(point)}</li>' for point in page['points']) + '</ol>'
    if page['target'] == 'modal':
        cta = f'<button class="nsg-growth__button" type="button" data-smeta data-growth-cta>{escape(page["cta"])}</button>'
    else:
        cta = f'<a class="nsg-growth__button" href="{escape(page["target"])}" data-growth-cta>{escape(page["cta"])}</a>'
    return f'<section class="nsg-growth" aria-labelledby="nsg-growth-title"><p class="nsg-growth__eyebrow">Перед выбором · материал дополнен 16 ноября 2026</p><h2 id="nsg-growth-title">{escape(page["heading"])}</h2><p>{escape(page["intro"])}</p>{points}<p class="nsg-growth__note">{escape(page["note"])}</p><p>{cta}</p>{links(page["links"])}</section>'


def insert_before(text, marker, insertion):
    found = re.search(marker, text)
    if not found:
        raise ValueError('Insertion marker not found: ' + marker)
    return text[:found.start()] + insertion + text[found.start():]


def update_page(page):
    destination = ROOT / page['path']
    original = destination.read_text()
    text = remove_previous(original, 'nsg-growth-batch')
    content = marked('nsg-growth-batch', growth_block(page))
    if page['path'].startswith('ploshchadki/'):
        marker = r'<section class="wrap cform"' if page['target'] == '#cform' else r'<div class="wrap vbody"'
    elif page['path'].startswith('event/'):
        marker = r'</main>'
    else:
        marker = r'<section class="nsg-lm"'
    text = assets(insert_before(text, marker, content))
    if page['target'] == '#cform':
        text = text.replace('<h2>Подберём площадку из подборки бесплатно</h2>', '<h2>' + escape(page['cta']) + '</h2>', 1)
        for suffix in ['', '2']:
            form_marker = f'id="cform{suffix}"><form>'
            if form_marker in text:
                text = re.sub(r'(<div><label for="cft' + suffix + r'">Телефон</label><input[^>]*></div>)(?!\s*<div class="nsg-growth-context")', r'\1' + f'<div class="nsg-growth-context"><label for="growth-date{suffix}">Дата или сезон</label><input id="growth-date{suffix}" name="date" placeholder="Например, июль 2027"><label for="growth-guests{suffix}">Число гостей</label><input id="growth-guests{suffix}" name="guests" type="number" min="1" max="3000"><label for="growth-budget{suffix}">Общий бюджет события, если определён</label><input id="growth-budget{suffix}" name="budget" placeholder="Можно указать диапазон"></div>', text, count=1)
    destination.write_text(text)
    return {'path': page['path'], 'before_sha256': hashlib.sha256(original.encode()).hexdigest(), 'after_sha256': hashlib.sha256(text.encode()).hexdigest()}


def quote_form(article):
    return f'''<section class="nsg-growth" id="quote" aria-labelledby="quote-title">
<h2 id="quote-title">{escape(article['cta'])}</h2><p>Напишите дату, число гостей и приоритеты. В расчёте разделим подтверждённые условия и позиции, которые ещё нужно уточнить.</p>
<form data-growth-form>
<div class="nsg-growth__fields"><label>Как к вам обращаться<input name="name" required maxlength="100" autocomplete="name"></label><label>Телефон или Telegram<input name="contact" required maxlength="100" autocomplete="off"></label><label>Ник в Telegram, необязательно<input name="tg" maxlength="64" autocomplete="off" autocapitalize="off" spellcheck="false"></label><label>Как вы о нас узнали?<select name="heard"><option value="">Можно не выбирать</option><option>ChatGPT / нейросеть</option><option>Яндекс / Google</option><option>Рекомендация</option><option>Другое</option></select></label><label>Дата или сезон<input name="date" maxlength="100"></label><label>Число гостей<input name="guests" type="number" min="1" max="3000"></label></div>
<label>Общий бюджет и пожелания<textarea name="message" rows="3" maxlength="1500"></textarea></label>
<input class="nsg-growth__hp" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<label class="nsg-growth__consent"><input name="_consent" type="checkbox" required>Я даю <a href="/soglasie/">согласие на обработку персональных данных</a> и принимаю <a href="/privacy/">политику конфиденциальности</a>.</label>
<button class="nsg-growth__button" type="submit">Запросить расчёт</button><div role="status" aria-live="polite"></div>
</form><p>Или <a href="https://t.me/navsegda_agency">напишите в Telegram</a> · <a href="tel:+79585410041">+7 958 541-00-41</a>.</p></section>'''


def article_html(article):
    canonical = DOMAIN + '/' + article['path'].replace('index.html', '')
    ld = [
        {'@context': 'https://schema.org', '@type': 'Article', 'headline': article['h1'], 'description': article['description'], 'url': canonical, 'mainEntityOfPage': canonical, 'image': DOMAIN + article['image'], 'datePublished': '2026-11-16', 'dateModified': '2026-11-16', 'author': {'@type': 'Organization', 'name': 'НАВСЕГДА', 'url': DOMAIN}, 'publisher': {'@type': 'Organization', 'name': 'НАВСЕГДА', 'url': DOMAIN, 'logo': {'@type': 'ImageObject', 'url': DOMAIN + '/assets/brand/logo-h-cream.svg'}}},
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'НАВСЕГДА', 'item': DOMAIN + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'Статьи', 'item': DOMAIN + ('/event/blog/' if article['path'].startswith('event/') else '/blog/')}, {'@type': 'ListItem', 'position': 3, 'name': article['h1'], 'item': canonical}]}
    ]
    sections = []
    contents = []
    for index, section in enumerate(article['sections'], 1):
        contents.append((f'#section-{index}', section['heading']))
        paragraphs = ''.join('<p>' + escape(paragraph) + '</p>' for paragraph in section.get('paragraphs', []))
        items = '<ul>' + ''.join('<li>' + escape(item) + '</li>' for item in section['list']) + '</ul>' if section.get('list') else ''
        data_table = table(section['table']) if section.get('table') else ''
        sections.append(f'<section class="nsg-growth" aria-labelledby="section-{index}"><h2 id="section-{index}">{escape(section["heading"])}</h2>{paragraphs}{data_table}{items}</section>')
    schema = json.dumps(ld, ensure_ascii=False).replace('</', '<\\/')
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(article['title'])}</title><meta name="description" content="{escape(article['description'])}">
<link rel="canonical" href="{canonical}"><meta property="og:type" content="article"><meta property="og:title" content="{escape(article['h1'])}"><meta property="og:description" content="{escape(article['description'])}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{DOMAIN + article['image']}">
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/assets/growth/growth.css?v={VERSION}">
<script type="application/ld+json">{schema}</script>
<script>if(location.hostname==='navseg-da.agency'||location.hostname.endsWith('.navseg-da.agency')){{(function(m,e,t,r,i,k,a){{m[i]=m[i]||function(){{(m[i].a=m[i].a||[]).push(arguments)}};m[i].l=1*new Date();k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)}})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(112491690,'init',{{clickmap:true,trackLinks:true,accurateTrackBounce:true}});}}</script>
</head><body class="nsg-growth-page"><header class="nsg-growth-header"><a href="/"><img src="/assets/brand/logo-h-bordo.svg" alt="НАВСЕГДА"></a><nav><a href="/blog/">Свадьбы</a> · <a href="/event/blog/">Корпоративы</a> · <a href="/ploshchadki/">Площадки</a></nav></header>
<main><p><a href="/">НАВСЕГДА</a> / Разбор реальных смет</p><article><h1>{escape(article['h1'])}</h1><p>Редакция НАВСЕГДА · 16 ноября 2026</p><p class="nsg-growth-intro">{escape(article['intro'])}</p><p><a href="#quote" class="nsg-growth__button" data-growth-cta>Запросить индивидуальный расчёт</a></p>
<img class="nsg-growth-cover" src="{article['image']}" alt="{escape(article['image_alt'])}" width="1400" height="800" fetchpriority="high">
<nav class="nsg-growth" aria-label="Содержание"><h2>В материале</h2>{links(contents)}</nav>
{''.join(sections)}<section class="nsg-growth"><h2>Источники и границы расчёта</h2><p>Материал основан на опубликованных сметах НАВСЕГДА. Исторические итоги не являются действующими тарифами; условия новой даты проверяются отдельно. Числа на одного гостя округлены, где это указано.</p>{links(article['sources'])}</section>
<aside class="nsg-growth"><h2>По теме</h2>{links(article['related'])}</aside></article>{quote_form(article)}</main>
<footer class="nsg-growth-footer"><span>НАВСЕГДА · Москва и Подмосковье</span><a href="/privacy/">Политика конфиденциальности</a></footer>
<script src="/assets/legal/legal.js" defer></script><script src="/assets/js/tg-field.js?v={VERSION}" defer></script><script src="/assets/growth/growth.js?v={VERSION}" defer></script></body></html>'''


def update_hub(relative, articles):
    destination = ROOT / relative
    text = remove_previous(destination.read_text(), 'nsg-growth-reading')
    block = marked('nsg-growth-reading', '<section class="nsg-growth"><p class="nsg-growth__eyebrow">Разборы на собственных сметах</p><h2>Сравниваем бюджет и состав услуг</h2>' + links([('/' + article['path'].replace('index.html', ''), article['h1']) for article in articles]) + '</section>')
    marker = r'</main>' if '</main>' in text else r'<footer'
    destination.write_text(assets(insert_before(text, marker, block)))


def update_sitemap(relative, articles):
    destination = ROOT / relative
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', namespace)
    tree = ET.fromstring(destination.read_text())
    existing = {node.findtext(f'{{{namespace}}}loc'): node for node in tree}
    for article in articles:
        url = DOMAIN + '/' + article['path'].replace('index.html', '')
        node = existing.get(url)
        if node is None:
            node = ET.SubElement(tree, f'{{{namespace}}}url')
            ET.SubElement(node, f'{{{namespace}}}loc').text = url
        modified = node.find(f'{{{namespace}}}lastmod')
        if modified is None:
            modified = ET.SubElement(node, f'{{{namespace}}}lastmod')
        modified.text = BATCH['reviewed_at']
    destination.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(tree, encoding='unicode'))


def main():
    changed = [update_page(page) for page in BATCH['pages']]
    for article in ARTICLES:
        destination = ROOT / article['path']
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(article_html(article))
    weddings = [article for article in ARTICLES if not article['path'].startswith('event/')]
    corporate = [article for article in ARTICLES if article['path'].startswith('event/')]
    update_hub('blog/index.html', weddings)
    update_hub('event/blog/index.html', corporate)
    update_sitemap('sitemap.xml', weddings)
    update_sitemap('event/sitemap.xml', corporate)
    (TOOLS / 'growth-build-report.json').write_text(json.dumps({'updated_pages': changed, 'new_articles': [article['path'] for article in ARTICLES]}, ensure_ascii=False, indent=2))
    print(json.dumps({'updated_pages': len(changed), 'new_articles': len(ARTICLES)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
