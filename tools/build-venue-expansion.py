import importlib.util
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'tools/venue-expansion.json').read_text())
POLICY = json.loads((ROOT / 'tools/wedding-offer-policy.json').read_text())
DATA = [v for v in DATA if v['slug'] not in POLICY['excluded_venues']]
spec = importlib.util.spec_from_file_location('growth', ROOT / 'tools/build-growth-batch.py')
growth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(growth)
growth.BATCH['reviewed_at'] = '2026-11-17'


def main():
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    template = Path(sys.argv[3]).read_text()
    output.mkdir(parents=True, exist_ok=True)
    published = {path.parent.name for path in (ROOT / 'ploshchadki').glob('*/index.html')}
    for venue in DATA:
        image_path = ROOT / 'assets/img/venues-expansion' / (venue['slug'] + '.webp')
        image_path.parent.mkdir(parents=True, exist_ok=True)
        image = Image.open(source / 'p' / venue['image']).convert('RGB')
        image.thumbnail((1400, 1000))
        image.save(image_path, 'WEBP', quality=82)
        article = {'path': 'ploshchadki/' + venue['slug'] + '/index.html', 'title': venue['name'] + ' — площадка для свадьбы и корпоратива | НАВСЕГДА', 'h1': venue['name'], 'description': venue['facts'], 'image': '/' + str(image_path.relative_to(ROOT)), 'image_alt': venue['name'] + ': фотография из базы площадок', 'intro': venue['facts'], 'sections': [{'heading': 'Для какого события рассмотреть', 'paragraphs': [venue['question']]}, {'heading': 'Что согласовать до бронирования', 'list': venue['checks']}, {'heading': 'Стоимость на вашу дату', 'paragraphs': ['Публикуем проверенное описание площадки, а не обещание свободной даты или фиксированной цены. Для расчёта нужны дата, формат, число гостей и состав программы. Запросим отдельные строки аренды, минимального заказа, питания, сервиса, техники и организации.', 'Цена из старой базы не переносится в новое предложение автоматически. Если площадка предлагает сезонные условия, срок их действия и применимость подтверждаем до предоплаты.']}], 'sources': [(venue['source'], 'Официальное описание: проверено 17 ноября 2026')], 'related': [('/ploshchadki/', 'Все площадки'), ('/blog/kak-proverit-polnotu-smety-svadby/', 'Проверить полноту сметы')], 'cta': 'Запросить дату и полный расчёт'}
        text = growth.article_html(article).replace('2026-11-16', '2026-11-17').replace('16 ноября 2026', '17 ноября 2026')
        text = text.replace('Материал основан на опубликованных сметах НАВСЕГДА. Исторические итоги не являются действующими тарифами; условия новой даты проверяются отдельно. Числа на одного гостя округлены, где это указано.', 'Описание сверено с официальным сайтом 17 ноября 2026 года. Цены и свободность даты требуют отдельного подтверждения площадкой; карточка не является офертой или бронированием.')
        text = text.replace('<form data-growth-form>', '<form data-growth-form><input type="hidden" name="venue" value="' + growth.escape(venue['name']) + '">')
        structured = {'@context': 'https://schema.org', '@type': 'EventVenue', 'name': venue['name'], 'url': growth.DOMAIN + '/' + article['path'].replace('index.html', ''), 'image': growth.DOMAIN + article['image'], 'maximumAttendeeCapacity': venue['capacity'], 'address': {'@type': 'PostalAddress', 'addressRegion': 'Московская область', 'addressLocality': venue['area'], 'addressCountry': 'RU'}}
        text = text.replace('</head>', '<script type="application/ld+json">' + json.dumps(structured, ensure_ascii=False) + '</script></head>')
        destination = ROOT / article['path']
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(text)
    new_articles = []
    for corporate in [False, True]:
        path = 'event/blog/kak-sravnit-ploshchadki-dlya-korporativa-po-polnoy-smete/' if corporate else 'blog/oranzhereya-na-50-ili-120-gostey-kak-vybrat/'
        heading = 'Как сравнить площадки для корпоратива по полной смете' if corporate else 'Оранжерея на 50 или зал на 120 гостей: как выбирать площадку'
        article = {'path': path + 'index.html', 'title': heading + ' | НАВСЕГДА', 'h1': heading, 'description': 'Разбираем выбор площадки по формату, рассадке, полной смете и подтверждённым условиям. Четыре новых карточки с официальными источниками.', 'image': '/assets/img/venues-expansion/' + ('usadba-grebnevo-grand-lesnoy' if corporate else 'ostrov-lyubvi') + '.webp', 'image_alt': 'Одна из площадок новой подборки НАВСЕГДА', 'intro': 'Сравнивать площадки полезно на одном брифе: дата, гости, длительность, рассадка и программа. Одинаковое число мест и похожие фотографии ещё не означают одинаковый состав расходов. Ниже — последовательность выбора без переноса старого прайса на новую дату.', 'sections': [
            {'heading': 'Начните с формата и схемы', 'paragraphs': ['Сначала определите, будет ли банкет, фуршет или деловая часть с вечерней программой. Попросите схему со сценой, экраном, проходами и танцполом. Максимальную вместимость не стоит принимать за удобную рассадку вашего события.', 'Для камерного события оцените, можно ли организовать компактную зону и не оплачивать лишний масштаб. Для большого — расположение сцены, доступ в зал и работу нескольких подрядчиков.']},
            {'heading': 'Четыре площадки для первого сравнения', 'list': ['Остров Любви: камерная оранжерея с банкетной вместимостью до 50 гостей.', 'Green Lake Hall: банкетный зал на 120 гостей, терраса и площадки для дополнительных зон.', '«Барский» в Гребнево: банкет до 80 гостей; фуршетная вместимость отличается.', 'Grand «Лесной» в Гребнево: до 280 гостей банкетом и до 350 фуршетом.'], 'paragraphs': ['Эти данные сверены с официальными описаниями 17 ноября 2026 года. Они помогают составить короткий список, но не подтверждают свободную дату. Порядок списка не является рейтингом площадок.']},
            {'heading': 'Сведите расходы в одну таблицу', 'list': ['Аренда и время доступа: подготовка, само событие, демонтаж и продление.', 'Меню, минимальный заказ и правило начисления сервиса.', 'Напитки, свой алкоголь, пробковый сбор, стекло и охлаждение.', 'Обязательные техника и персонал: звук, свет, экран, сцена и технические специалисты.', 'Ведущий, программа, декор, съёмка, логистика, координация и организация.'], 'paragraphs': ['Не складывайте стоимость питания и минимальный заказ автоматически: сначала уточните, как площадка учитывает депозит. Не переносите правило одной площадки на другую. Обеспечительный возвратный платёж также нужно отличать от расхода: у него свои условия возврата.']},
            {'heading': 'Отметьте неизвестное и сравните одинаковые условия', 'paragraphs': ['У каждой суммы укажите статус: подтверждена на дату, предварительный ориентир или требует расчёта. Неизвестная позиция не равна нулю. Цена за гостя по меню не равна стоимости события на человека.', 'Сравните две версии одного брифа, а не минимальную аренду одной площадки с полным мероприятием на другой. Если выбираете между буднями и выходными, сохраняйте одинаковыми состав услуг и длительность.']},
            {'heading': 'Что проверить до предоплаты', 'paragraphs': ['Согласуйте конкретный зал, схему рассадки, время музыки, правила монтажа и план на плохую погоду. Отдельно проверьте способы оплаты и состав закрывающих документов.', 'Пришлите дату, число гостей и общий бюджет. Подберём варианты и уточним их условия под ваш формат; окончательный выбор делаем после проверки даты и полного расчёта, а не по архивной цене.']}
        ], 'sources': [('/ploshchadki/' + venue['slug'] + '/', venue['name'] + ': карточка и официальный источник') for venue in DATA], 'related': [('/event/blog/dve-realnye-smety-korporativa-chto-sravnivat/', 'Сравнение корпоративных смет'), ('/blog/kak-proverit-polnotu-smety-svadby/', 'Чек-лист полной сметы')], 'cta': 'Подобрать площадки под наш бриф'}
        destination = ROOT / article['path']
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(growth.article_html(article).replace('2026-11-16', '2026-11-17').replace('16 ноября 2026', '17 ноября 2026'))
        new_articles.append(article)
    for relative in ['ploshchadki/index.html', 'ploshchadki/steklyannye/index.html', 'ploshchadki/kamernye/index.html', 'ploshchadki/korporativ-v-moskve/index.html', 'ploshchadki/svadebnye/index.html', 'ploshchadki/u-vody/index.html']:
        path = ROOT / relative
        text = growth.remove_previous(path.read_text(), 'venue-expansion')
        selection = DATA if 'steklyannye' not in relative else [DATA[0]]
        block = '<section class="nsg-growth"><h2>Новые площадки: сравните под ваш бриф</h2><p>Добавили карточки с официальными источниками. Вместимость относится к банкетной схеме; тариф и свободность конкретной даты проверяются отдельно.</p>' + growth.links([('/ploshchadki/' + venue['slug'] + '/', venue['name'] + ' · до ' + str(venue['capacity']) + ' гостей') for venue in selection]) + '<h3>Как сравнивать</h3><p>Сведите аренду, минимальный заказ, сервис, технику и программу в один расчёт. Попросите рассадку после установки сцены и танцпола. Неизвестные расходы не считайте нулевыми.</p>' + growth.links([('/' + article['path'].replace('index.html', ''), article['h1']) for article in new_articles]) + '</section>'
        path.write_text(growth.assets(growth.insert_before(text, '</main>', growth.marked('venue-expansion', block))))
    growth.update_hub('blog/index.html', [article for article in growth.ARTICLES if not article['path'].startswith('event/')] + [new_articles[0]])
    growth.update_hub('event/blog/index.html', [article for article in growth.ARTICLES if article['path'].startswith('event/')] + [new_articles[1]])
    growth.update_sitemap('sitemap.xml', [new_articles[0]])
    growth.update_sitemap('event/sitemap.xml', [new_articles[1]])
    growth.update_sitemap('ploshchadki/sitemap.xml', [{'path': 'ploshchadki/' + venue['slug'] + '/index.html'} for venue in DATA])
    snapshot = []
    verified = {venue['slug']: venue for venue in DATA}
    for row in json.loads((source / 'venues.json').read_text()):
        slug = row['id']
        calc = row.get('calc') or {}
        issue = 'Ошибка исходных чисел: обязательна проверка условий.' if any(isinstance(calc.get(key), (int, float)) and calc[key] > limit for key, limit in [('corkage', 10000), ('banquet', 100000), ('service_pct', 100)]) else ''
        record = {'id': slug, 'name': row.get('real') or row.get('code') or slug, 'area': row.get('area') or row.get('loc') or '', 'kind': row.get('kind') or 'Уточнить', 'capacity': row.get('cap'), 'tags': row.get('tags') or [], 'menu': calc.get('banquet'), 'service': calc.get('service_pct'), 'issue': issue, 'verified': slug in verified, 'url': growth.DOMAIN + '/ploshchadki/' + slug + '/' if slug in published or slug in verified else ''}
        if not isinstance(record['capacity'], (int, float)) or record['capacity'] <= 0 or record['capacity'] > 5000:
            if record['capacity'] is not None: record['issue'] = 'Ошибка вместимости в базе: требуется подтверждение.'
            record['capacity'] = None
        if record['issue']: record.update(menu=None, service=None)
        record['kind'] = {'Вернада': 'Веранда', 'Шатер': 'Шатёр'}.get(record['kind'], record['kind'])
        if slug in verified: record.update(name=verified[slug]['name'], capacity=verified[slug]['capacity'], kind=verified[slug]['kind'], area=verified[slug]['area'], menu=None, service=None)
        snapshot.append(record)
    assert len({row['id'] for row in snapshot}) == len(snapshot)
    (output / 'index.html').write_text(template.replace('__VENUES__', json.dumps(snapshot, ensure_ascii=False).replace('</', '<\\/')))
    print(json.dumps({'public_venues': len(DATA), 'new_articles': len(new_articles), 'strengthened_hubs': 6, 'internal_venues': len(snapshot), 'flagged_data_errors': sum(bool(row['issue']) for row in snapshot)}))


if __name__ == '__main__':
    main()
