(() => {
  const titles = ['О вас', 'Welcome', 'Программа', 'SDE-фильм', 'Площадка', 'Решения'];
  const photo = (number, alt) => `<img src="assets/pin-${String(number).padStart(2, '0')}.jpg" alt="${alt}">`;
  const sigmaPhoto = (number, alt) => `<img src="assets/sigma-${String(number).padStart(2, '0')}.jpg" alt="Sigma · ${alt}">`;
  const sigmaCollage = () => `<div class="collage cover">${sigmaPhoto(1, 'зал и барная зона')}${sigmaPhoto(2, 'сервировка у панорамных окон')}${sigmaPhoto(6, 'зал с диванами и растениями')}<span class="photo-tag">SIGMA · СЕРГЕЯ МАКЕЕВА, 9, КОРП. 3</span></div>`;
  const collage = (numbers, cover = false) => `<div class="collage${cover ? ' cover' : ''}">${numbers.map(number => photo(number, 'Визуальный ориентир атмосферы корпоративного вечера')).join('')}<span class="photo-tag">МЕСТО ДЛЯ СВОИХ</span></div>`;
  const field = (key, label, placeholder = '', type = 'text') => `<label>${label}<input data-field="${key}" type="${type}" placeholder="${placeholder}"${type === 'number' ? ' min="1"' : ''}></label>`;
  const choice = (category, value, label = value) => `<button type="button" data-choice="${category}" data-value="${value}" aria-pressed="false">＋ ${label}</button>`;
  const ask = text => `<div class="ask"><span>ОБСУДИМ</span><p>${text}</p></div>`;
  const heading = (text, subtitle) => `<div class="section-head"><h2>${text}</h2><p>${subtitle}</p></div>`;
  const blocks = [
    {
      kicker: 'ЗНАКОМСТВО · КОНЦЕПЦИЯ ДЛЯ ОБСУЖДЕНИЯ',
      note: 'Что для вас важно в этом вечере?',
      placeholder: 'Цель, состав команды, прошлый опыт, что хочется повторить или исключить…',
      html: `<div class="split"><div><h1>ВАШИ ЛЮДИ.<br>ВАШ ВЕЧЕР.<br><em>Соберём его вместе.</em></h1><p class="intro">Я — Денис Коняев, ведущий вашего вечера. Сегодня обсудим, как собрать для команды Malina Property живую программу в Sigma, и запишем то, что подходит именно вам.</p><div class="fields">${field('company', 'Компания')}${field('occasion', 'Повод', 'Новый год, итоги, день компании…')}${field('date', 'Дата события', '', 'date')}${field('guests', 'Количество гостей', 'Уточним на встрече', 'number')}${field('venue', 'Площадка / город', 'Sigma, Москва')}${field('duration', 'Время / длительность', 'Начало и окончание')}</div>${ask('Что за повод? Кто будет в зале? Какое главное впечатление хочется оставить команде?')}</div>${sigmaCollage()}</div>`
    },
    {
      kicker: 'WELCOME · ПЕРВЫЙ КАДР ВЕЧЕРА',
      note: 'Как вы хотите встретить гостей?',
      placeholder: 'Острота юмора, герои интервью, идеи вопросов, пожелания по welcome…',
      html: `<div class="split"><div><h2>НАЧИНАЕМ<br>С <em>живого общения.</em></h2><p class="intro">Гости знакомятся и попадают в небольшое юмористическое интервью. Пока мы общаемся, появляются первые кадры будущего фильма.</p><div class="idea"><span class="tiny">ИДЕЯ ДЛЯ MALINA PROPERTY</span><h3>«Объект особого назначения — наша команда»</h3><p>Серьёзный интервьюер исследует идеальное пространство для своих. Неожиданные вопросы, узнаваемые ответы и тёплый поворот в финале.</p></div><div class="samples"><p>«Если бы настроение вашего отдела было помещением, что бы это было?»</p><p>«Какую суперспособность коллеги вы бы взяли в долгосрочную аренду?»</p><p>«За что вы цените людей, с которыми работаете?»</p></div><div class="choices">${choice('welcome', 'Юмористическое интервью', 'Интервью-пранк')}${choice('welcome', 'Тёплое интервью без пранка', 'Без пранка')}${choice('welcome', 'Фото и знакомство с ведущим', 'Фото и общение')}</div><p class="fine">Участие добровольное. Объясняем, что снимаем юмористический фильм вечера. Вопросы и границы монтажа согласуем заранее.</p></div>${collage([3, 5, 6])}</div>${ask('Какой юмор близок вашей команде? Какие темы исключаем? Кого можно заранее пригласить в интервью?')}`
    },
    {
      kicker: 'ПРОГРАММА · ВАШИ ИСТОРИИ СТАНОВЯТСЯ СОБЫТИЕМ',
      note: 'Что оставляем в программе?',
      placeholder: 'Любимые форматы, песни, обязательные выступления, ограничения и свои идеи…',
      html: `${heading('УЗНАЁМ СВОИХ.<br><em>Смеёмся вместе.</em>', 'Выбираем несколько сильных моментов.<br>Между ними — еда, музыка и общение.')}<div class="program"><article>${photo(7, 'Праздничное событие: визуальный ориентир')}<span class="tiny">ПЕРСОНАЛЬНЫЙ ЮМОР · 10–12 МИН</span><h3>«Это мог сказать только…»</h3><p>Угадываем авторов реальных фраз команды. Для Malina Property — рабочие выражения, истории показов и переговоров, согласованные с компанией.</p>${choice('program', 'Игра с цитатами команды', 'Хочется в программу')}</article><article>${photo(8, 'Атмосфера корпоративного праздника')}<span class="tiny">МУЗЫКАЛЬНЫЙ ПОВОРОТ · 8–10 МИН</span><h3>Караоке с сюрпризом</h3><p>Знакомая песня, добровольцы и неожиданный поворот. Механику и треки готовим с диджеем. Альтернатива — «Продолжи песню» всем залом.</p>${choice('program', 'Караоке с сюрпризом', 'Хочется в программу')}</article><article>${photo(9, 'Общение команды на мероприятии')}<span class="tiny">ПРИЗНАНИЕ КОМАНДЫ · 8–10 МИН</span><h3>«Люди с хорошей отдачей»</h3><p>Добрые номинации за реальные качества: спокойствие в переговорах, помощь коллегам, чувство юмора. Названия и героев выбираем вместе.</p>${choice('program', 'Персональные номинации', 'Хочется в программу')}</article></div><div class="rhythm"><span>Welcome</span><i>→</i><span>Открытие</span><i>→</i><span>Ужин и истории</span><i>→</i><span>Музыка</span><i>→</i><span>SDE</span><i>→</i><span>Финал</span></div>${ask('Что из референсов обязательно? Нужны ли речи руководителей, награды, артисты? Что точно не проводим?')}`
    },
    {
      kicker: 'SDE · ПРЕМЬЕРА В ЭТОТ ЖЕ ВЕЧЕР',
      note: 'Каким должен быть ваш фильм?',
      placeholder: 'Герои, настроение, видеокоманда, время показа, согласующий, способ передачи…',
      html: `<div class="split"><div><h2>В НАЧАЛЕ — ОТВЕТЫ.<br>В ФИНАЛЕ —<br><em>фильм о вас.</em></h2><p class="intro">Снимаем на welcome. Монтируем во время программы. Ближе к финалу показываем фильм на 3–4 минуты: от смешных ответов к словам о том, что объединяет команду.</p><ol class="sde-steps"><li><span>01</span><div><b>Снимаем и передаём</b><p>Первые ответы отправляются монтажёру, пока интервью ещё идут.</p></div></li><li><span>02</span><div><b>Собираем историю</b><p>Ответы, атмосфера, первые кадры вечера, музыка и титры.</p></div></li><li><span>03</span><div><b>Согласуем и проверяем</b><p>Один согласующий, один список правок. Тест файла, экрана и звука до анонса.</p></div></li><li><span>04</span><div><b>Смотрим и передаём</b><p>Общая премьера. Затем файл передаём контактному лицу компании.</p></div></li></ol><div class="choices">${choice('sde', 'Хотим SDE-премьеру', 'Хотим премьеру')}${choice('sde', 'Нужно рассчитать видеокоманду', 'Рассчитать команду')}</div></div><div><div class="duo">${photo(10, 'Живые моменты гостей мероприятия')}${photo(11, 'Атмосфера праздника')}</div><div class="production"><span class="tiny">ДВЕ ПАРАЛЛЕЛЬНЫЕ ИСТОРИИ</span><h3>Гости проживают вечер.<br>Команда собирает фильм.</h3><p>Нужны оператор, интервьюер, отдельный монтажёр, координатор и технический специалист. До события — вопросы, шаблон, музыка и согласование формата.</p><p>Премьеру вечером подтверждаем после согласования команды и техники. При задержке переносим показ в согласованное окно; при техническом сбое передаём фильм после события в оговорённый срок.</p></div></div></div>${ask('Кто организует видеокоманду? Кто утверждает фильм? Есть ли экран и звук? Кому и как передать видео?')}`
    },
    {
      kicker: 'ПЛОЩАДКА SIGMA · АТМОСФЕРА И РАСПОЛОЖЕНИЕ ЗОН',
      note: 'Как организуем ваш вечер в Sigma?',
      placeholder: 'Выбранный зал, рассадка, точка интервью, место ведущего, экран, звук, декор…',
      html: `${heading('SIGMA.<br><em>Пространство для своих.</em>', 'Москва, ул. Сергея Макеева, 9, корп. 3.<br>На фотографиях — ваша площадка.')}<div class="venue-gallery">${[[4, 'Зал и лестница'], [5, 'Пространство у окон'], [8, 'Столы и диванная зона'], [10, 'Барная зона']].map(([number, label]) => `<figure>${sigmaPhoto(number, label)}<figcaption>${label}</figcaption></figure>`).join('')}</div><div class="venue-plan"><div><span class="tiny">ОБСУДИМ РАСПОЛОЖЕНИЕ</span><h3>Три точки внимания</h3><p>На фотографиях видна площадка. Конкретный зал, рассадку, свободные проходы и техническое оснащение подтверждаем с менеджером.</p></div><div class="choices">${choice('venue', 'Тихая точка welcome-интервью', 'Точка интервью')}${choice('venue', 'Общая зона интерактивов', 'Место для программы')}${choice('venue', 'Экран и звук для SDE', 'Показ SDE')}</div></div><details class="mood-details"><summary>Выбрать настроение и фотомеханику</summary><div class="moods">${[[12, 'Тёплый камерный вечер', 'Тепло и близко', 'Общение, мягкий свет, свои люди'], [13, 'Нарядный праздничный вечер', 'Нарядно и празднично', 'Красивый зал, фото, особенный повод'], [14, 'Драйв и свободное общение', 'Свободно и с драйвом', 'Музыка, движение, общая энергия']].map(([number, value, title, subtitle]) => `<button type="button" class="mood" data-choice="mood" data-value="${value}" aria-pressed="false">${photo(number, 'Ориентир настроения, не фотография Sigma: ' + title)}<span class="mood-caption"><b>${title}</b><small>${subtitle}</small></span><span class="mark" aria-hidden="true">＋</span></button>`).join('')}</div><p class="fine">Эти три фотографии — ориентиры настроения, а не фотографии Sigma.</p><div class="choices">${choice('memory', 'Фотомозаика')}${choice('memory', 'Фотомагниты')}${choice('memory', 'Рамка моментальных фото', 'Рамка с фото')}</div></details>${ask('Какой зал забронирован? Где свободное место для интерактивов? Видно ли экран со всех столов? Где снимать интервью без громкой музыки?')}`
    },
    {
      kicker: 'СОБИРАЕМ ВАШ ВЕЧЕР',
      note: 'Что ещё важно учесть?',
      placeholder: 'Финальные договорённости, открытые вопросы, ответственные и сроки…',
      html: `${heading('ДОГОВОРИЛИСЬ.<br><em>Зафиксировали.</em>', 'Выборы и пожелания из всех блоков — здесь.<br>После созвона превращаем их в программу.')}<div class="summary-meta" id="summary-meta"></div><div id="summary-list" aria-live="polite"></div>`
    }
  ];
  const screenRoot = document.getElementById('screens');
  blocks.forEach((block, index) => {
    const section = document.createElement('section');
    section.className = 'screen'; section.dataset.screen = index; section.hidden = index !== 0; section.setAttribute('aria-label', titles[index]);
    section.innerHTML = `<div class="kicker">${String(index + 1).padStart(2, '0')} / ${block.kicker}</div>${block.html}<div class="wish"><label for="note-${index}"><span>ВАШИ ПРЕДПОЧТЕНИЯ И ПОЖЕЛАНИЯ</span>${block.note}</label><textarea id="note-${index}" data-note="${index}" rows="2" placeholder="${block.placeholder}"></textarea></div>${index === 5 ? '<p class="fine">Заметки хранятся только в этом браузере. Сохраните PDF после встречи, чтобы передать договорённости. Автоматической отправки в CRM нет.</p>' : ''}`;
    if (index === 2) {
      const activities = [
        ['Питч невозможного объекта', '6–8 минут · команды', 'За 30 секунд представить идеальный офис на Луне или помещение для супергероев. Я даю вводные, команды придумывают преимущества, зал выбирает самый убедительный питч. Нужны карточки и микрофон.'],
        ['Переводчик с брокерского', '5–7 минут · игра с мест', 'Переводим знакомые рабочие выражения на язык кино, свидания или семейного разговора. Смешно от смены контекста. Фразы заранее собираем и согласуем; можно провести без экрана.'],
        ['Кто это в нашей команде?', '7–9 минут · весь зал', 'Угадываем коллег по необычному хобби, любимой песне или детской фотографии. После раскрытия — короткая история от героя. Нужны добровольно предоставленные материалы и экран.'],
        ['Саундтрек рабочего дня', '5–7 минут · ведущий + диджей', 'Диджей включает короткие музыкальные фрагменты, а столы придумывают, какой рабочий момент они озвучивают. В финале выбираем гимн вечера. Треки и ситуации готовим заранее.']
      ];
      section.querySelector('.rhythm').insertAdjacentHTML('beforebegin', `<div class="more-heading"><h3>Ещё идеи на выбор</h3><p>Выберем 2–3 блока на вечер. Это варианты, а не обязательная программа целиком.</p></div><div class="activity-grid">${activities.map(([title, timing, text]) => `<article><span class="tiny">${timing}</span><h3>${title}</h3><p>${text}</p>${choice('program', title, 'Добавить в предпочтения')}</article>`).join('')}</div>`);
    }
    screenRoot.append(section);
    const navigation = document.createElement('button'); navigation.type = 'button'; navigation.dataset.go = index; navigation.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${titles[index]}`; document.getElementById('chapters').append(navigation);
  });
  const fieldLabels = {company: 'Компания', occasion: 'Повод', date: 'Дата', guests: 'Гостей', venue: 'Площадка', duration: 'Время'};
  const categories = {welcome: 1, program: 2, sde: 3, mood: 4, memory: 4, venue: 4};
  const storageKey = 'malina-property-meeting-v1';
  const status = document.getElementById('save-state');
  let state = {fields: {company: 'Malina Property'}, notes: {}, choices: {}};
  let current = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object') ['fields', 'notes', 'choices'].forEach(key => { if (saved[key] && typeof saved[key] === 'object' && !Array.isArray(saved[key])) state[key] = saved[key]; });
  } catch { status.textContent = 'Сохранение недоступно — используйте PDF'; }
  if (typeof state.fields.venue !== 'string' || !state.fields.venue.trim()) state.fields.venue = 'Sigma · Сергея Макеева, 9, корп. 3, Москва';
  function renderSummary() {
    document.getElementById('summary-meta').textContent = Object.entries(fieldLabels).filter(([key]) => typeof state.fields[key] === 'string' && state.fields[key].trim()).map(([key, label]) => label + ': ' + state.fields[key]).join('\n') || 'Заполните вводные в первом блоке.';
    const list = document.getElementById('summary-list'); list.replaceChildren();
    titles.forEach((title, index) => {
      const item = document.createElement('div'); item.className = 'summary-item';
      const heading = document.createElement('h3'); heading.textContent = String(index + 1).padStart(2, '0') + ' / ' + title; item.append(heading);
      const selected = Object.keys(categories).filter(key => categories[key] === index).flatMap(key => Array.isArray(state.choices[key]) ? state.choices[key].filter(value => typeof value === 'string') : []);
      if (selected.length) { const choices = document.createElement('p'); choices.className = 'selected-values'; choices.textContent = selected.join(' · '); item.append(choices); }
      const note = document.createElement('p'); note.textContent = typeof state.notes[index] === 'string' && state.notes[index].trim() ? state.notes[index] : 'Пожелания пока не записаны.'; item.append(note); list.append(item);
    });
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); status.textContent = 'Сохранено в этом браузере'; }
    catch { status.textContent = 'Не сохранено — используйте PDF'; }
    renderSummary();
  }
  function show(index) {
    current = Math.max(0, Math.min(blocks.length - 1, index));
    document.querySelectorAll('[data-screen]').forEach((screen, screenIndex) => { screen.hidden = screenIndex !== current; });
    document.querySelectorAll('[data-go]').forEach(button => { if (Number(button.dataset.go) === current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    document.getElementById('counter').textContent = String(current + 1).padStart(2, '0') + ' / 06';
    document.getElementById('prev').disabled = current === 0;
    document.getElementById('next').textContent = current === blocks.length - 1 ? 'Сохранить PDF ↗' : titles[current + 1] + ' →';
    renderSummary(); window.scrollTo({top: 0, behavior: 'instant'});
  }
  document.querySelectorAll('[data-field]').forEach(input => {
    if (typeof state.fields[input.dataset.field] === 'string') input.value = state.fields[input.dataset.field];
    input.addEventListener('input', () => { state.fields[input.dataset.field] = input.value; save(); });
  });
  document.querySelectorAll('[data-note]').forEach(textarea => {
    if (typeof state.notes[textarea.dataset.note] === 'string') textarea.value = state.notes[textarea.dataset.note];
    const printNote = document.createElement('p'); printNote.className = 'print-note'; printNote.textContent = textarea.value || 'Пожелания пока не записаны.'; textarea.after(printNote);
    textarea.addEventListener('input', () => { state.notes[textarea.dataset.note] = textarea.value; printNote.textContent = textarea.value || 'Пожелания пока не записаны.'; save(); });
  });
  document.querySelectorAll('[data-choice]').forEach(button => {
    const category = button.dataset.choice; const value = button.dataset.value;
    if (!Array.isArray(state.choices[category])) state.choices[category] = [];
    function update() { const selected = state.choices[category].includes(value); button.setAttribute('aria-pressed', String(selected)); const mark = button.querySelector('.mark'); if (mark) mark.textContent = selected ? '✓' : '＋'; else button.textContent = button.textContent.replace(/^[＋✓]/, selected ? '✓' : '＋'); }
    update();
    button.addEventListener('click', () => { const values = state.choices[category]; state.choices[category] = values.includes(value) ? values.filter(item => item !== value) : [...values, value]; update(); save(); });
  });
  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => show(Number(button.dataset.go))));
  document.getElementById('prev').addEventListener('click', () => show(current - 1));
  document.getElementById('next').addEventListener('click', () => { if (current === blocks.length - 1) window.print(); else show(current + 1); });
  document.getElementById('print').addEventListener('click', () => { renderSummary(); window.print(); });
  const closedBeforePrint = [];
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('details').forEach(details => { if (!details.open) { closedBeforePrint.push(details); details.open = true; } });
  });
  window.addEventListener('afterprint', () => { closedBeforePrint.splice(0).forEach(details => { details.open = false; }); });
  document.addEventListener('keydown', event => {
    if (event.target instanceof HTMLElement && (event.target.closest('input,textarea,select,button') || event.target.isContentEditable)) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); show(current + 1); }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); show(current - 1); }
  });
  show(0);
})();
