/* НАВСЕГДА · бриф сайта-приглашения (свадьба / корпоратив).
   Вид брифа: <body data-kind="svadba|korporativ">. Ответы → /api/kab/invite-brief → Google Таблица «Брифы сайтов-приглашений» (без amoCRM).
   Префилл: ?name=&groom=&company=&date=&guests=&lead=<id сделки>&p=<проект кабинета> */
(function(){
var KIND=document.body.getAttribute('data-kind')==='korporativ'?'korporativ':'svadba';
var ENDPOINT='https://109-68-213-160.sslip.io/api/kab/invite-brief'; // → Google Таблица, не amoCRM
var KEY='nsg_invite_brief_'+KIND+'_v1';
var COLORS=[['Белый и айвори','#f6f1e6'],['Пудровый','#e8c4bf'],['Персик','#f2c7a5'],['Шампань и золото','#d6b07b'],['Зелень и шалфей','#8fa58a'],['Оливка','#6b7046'],['Голубой и синий','#7f9fc0'],['Бордо и марсала','#7a1c22'],['Терракота','#b5643f'],['Лиловый','#a593bd'],['Графит и чёрный','#222222'],['Серебро','#c9ccd1']];
// стиль: [название, описание, фон превью, цвет, шрифт, образец]
var LOOKS=[
 ['Кино','тёмный постер, фото на весь экран, титры и плёнка','linear-gradient(180deg,#000 0 12%,#3a3029 12% 88%,#000 88%)','#E3C79A',"italic 400 30px 'Playfair Display',Georgia,serif",'Премьера'],
 ['Журнал','обложка глянца, крупные заголовки, колонки','#F4EFE6','#1D1B17',"700 22px 'Playfair Display',Georgia,serif",'ВЫПУСК 01'],
 ['3D и частицы','объёмный вензель, мерцание, движение за пальцем','radial-gradient(circle at 50% 45%,#2a3350,#0F1424 70%)','#D8B98A',"400 34px 'Hello January',cursive",'В & Л'],
 ['Нежная классика','крем, золото, вензеля и каллиграфия','#FFF4E4','#7A1C22',"400 34px 'Hello January',cursive",'навсегда'],
 ['Ботаника','зелень, лён, веточки и воздух','linear-gradient(160deg,#F2F1EA,#D9E2CF)','#33452F',"italic 400 28px 'Playfair Display',Georgia,serif",'сад'],
 ['Минимализм','белый, графит, строгая сетка, много воздуха','#FFFFFF','#1E1E1E',"200 18px 'SF Pro Display',system-ui,sans-serif",'М I N I M A L']
];
var CORP_LOOKS=[
 ['Корпоративный премиум','фирменные цвета, логотип, строгая и дорогая подача','linear-gradient(135deg,#14213d,#0b1220)','#E5C07B',"300 21px 'SF Pro Display',system-ui,sans-serif",'COMPANY'],
 ['Тематическая вечеринка','Гэтсби, кино, ретро, космос: тема вечера в дизайне','linear-gradient(135deg,#111 0 50%,#1b1b1b 50%)','#D4AF37',"italic 400 30px 'Playfair Display',Georgia,serif",'Gatsby']
];
var ANIM=[['Спокойная','плавные появления, ничего не отвлекает'],['Заметная','параллакс, движение фото, живые переходы'],['Вау-эффект','3D, частицы, интерактив: запоминается с первой секунды']];

var SV=[
 {t:'Знакомство',h:'Давайте познакомимся',sub:'Как к вам обращаться и куда прислать первый вариант дизайна.',q:[
  {id:'name',l:'Имя невесты',ty:'text',req:1,half:1},{id:'groom',l:'Имя жениха',ty:'text',req:1,half:1},
  {id:'phone',l:'Телефон',ty:'tel',req:1,half:1,ph:'+7'},{id:'tg',l:'Telegram (ник)',ty:'text',half:1,ph:'@'},
  {id:'date',l:'Дата свадьбы',ty:'text',half:1,ph:'например, 14.08.2027'},{id:'guests',l:'Сколько гостей',ty:'text',half:1,ph:'например, 70'}
 ]},
 {t:'Стиль',h:'Каким будет приглашение',sub:'Выберите, что откликается. Это отправная точка: финальный дизайн рисуем под вашу свадьбу.',q:[
  {id:'look',l:'Стиль сайта',hint:'Можно выбрать один или два',ty:'looks',max:2,o:LOOKS},
  {id:'mood',l:'Настроение',hint:'До трёх слов',ty:'chips',max:3,o:['Элегантно','Романтично','Легко и воздушно','Торжественно','С юмором','Современно','Уютно','Дерзко']},
  {id:'anim',l:'Сколько движения',ty:'cards',o:ANIM},
  {id:'colors',l:'Цвета свадьбы',hint:'Часто совпадают с декором и дресс-кодом',ty:'colors'},
  {id:'colors_no',l:'Каких цветов точно не надо',ty:'text'},
  {id:'refs',l:'Ссылка на вдохновение',hint:'Pinterest, Instagram, понравившиеся сайты или приглашения',ty:'url',ph:'https://'},
  {id:'dislike',l:'Что точно не нравится',ty:'text',ph:'например, «без сердечек и блёсток»'}
 ]},
 {t:'Фото и тексты',h:'Фото и слова',sub:'Можно пропустить: тексты напишем сами и пришлём на согласование.',q:[
  {id:'photos',l:'Фото пары',ty:'radio',o:['Есть фотосессия','Будет love story позже','Пока нет: сделайте красиво без фото']},
  {id:'photos_link',l:'Ссылка на фото',hint:'Яндекс Диск или Google Диск. Или пришлите фото нам в Telegram/WhatsApp',ty:'url',ph:'https://',cond:['photos',['Есть фотосессия']]},
  {id:'you',l:'Как обращаемся к гостям',ty:'radio',o:['На «вы»','На «ты»','Разберёмся по гостям']},
  {id:'story',l:'Как вы познакомились',hint:'2-3 предложения: расскажем вашу историю на сайте',ty:'area'},
  {id:'hello',l:'Ваши слова гостям',hint:'Если хотите своё обращение. Иначе предложим текст',ty:'area'}
 ]},
 {t:'Разделы',h:'Что будет на сайте',sub:'Обложка с фото, дата, программа дня, площадка с картой, анкета гостя и координатор есть всегда. Отметьте, что добавить.',q:[
  {id:'blocks',l:'Дополнительные разделы',ty:'chips',o:['История пары','Дресс-код с палитрой','Вишлист','Вопросы гостей','Трансфер','Ночёвка','Детская зона','Обратный отсчёт','Фото от гостей после свадьбы']},
  {id:'gifts',l:'Про подарки',ty:'radio',o:['Вишлист','Только конверт','Не писать о подарках']},
  {id:'dress',l:'Дресс-код',hint:'Если уже придумали: цвета, «без белого» и т. п.',ty:'text'},
  {id:'friends',l:'Контакт для сюрпризов',hint:'Подруга невесты или друг жениха, к кому гости могут обратиться',ty:'text',ph:'имя и телефон, по желанию'}
 ]},
 {t:'Анкета гостя',h:'Что спросить у гостей',sub:'Каждый гость отвечает в своей анкете: вы и координатор видите, кто придёт и что ему нужно.',q:[
  {id:'rsvp',l:'Вопросы анкеты',hint:'«Приду / не приду» и имя с фамилией есть всегда',ty:'chips',o:['Будет ли с парой (+1)','Дети и их возраст','Выбор горячего','Алкоголь','Аллергии и ограничения в еде','Трансфер','Ночёвка','Любимая песня','Пожелание паре']},
  {id:'menu',l:'Варианты горячего',hint:'Если уже знаете: мясо, рыба, вегетарианское',ty:'text',cond:['rsvp',['Выбор горячего']]},
  {id:'deadline',l:'До какого числа ответить гостям',ty:'text',ph:'например, до 1 июля'},
  {id:'send',l:'Как отправим приглашение',ty:'radio',o:['Каждому гостю своя ссылка с именем','Одна общая ссылка','Ссылка + QR для печатных приглашений']},
  {id:'extra',l:'Что ещё важно учесть',ty:'area'}
 ]}
];

var KO=[
 {t:'Компания',h:'О мероприятии',sub:'Коротко о компании и событии: с этого начнём дизайн.',q:[
  {id:'company',l:'Компания',ty:'text',req:1},
  {id:'name',l:'Ваше имя',ty:'text',req:1,half:1},{id:'role',l:'Должность',ty:'text',half:1},
  {id:'phone',l:'Телефон',ty:'tel',req:1,half:1,ph:'+7'},{id:'tg',l:'Telegram или почта',ty:'text',half:1},
  {id:'occasion',l:'Повод',ty:'radio',o:['Новый год','День рождения компании','Итоги года / награждение','Конференция или форум','Тимбилдинг','Летний корпоратив','Презентация','Другое']},
  {id:'date',l:'Дата и время',ty:'text',half:1,ph:'например, 26.12, 19:00'},{id:'guests',l:'Сколько гостей',ty:'text',half:1},
  {id:'venue',l:'Площадка',hint:'Если уже выбрана',ty:'text'}
 ]},
 {t:'Стиль',h:'Фирменный стиль и тема',sub:'Совместим бренд компании и настроение вечера.',q:[
  {id:'brand',l:'Как работаем с брендом',ty:'cards',o:[['Строго в фирменном стиле','логотип, цвета и шрифты по брендбуку'],['Бренд + тема вечера','фирменные цвета, а атмосфера по теме'],['Свободная тема','логотип скромно, всё остальное по теме вечера']]},
  {id:'brandbook',l:'Брендбук или логотип',hint:'Ссылка на файл или папку. Можно прислать в Telegram',ty:'url',ph:'https://'},
  {id:'theme',l:'Тема вечера',hint:'Если есть: Гэтсби, кино, «Оскар», космос, 90-е…',ty:'text'},
  {id:'look',l:'Стиль сайта',hint:'Один или два',ty:'looks',max:2,o:CORP_LOOKS.concat(LOOKS.filter(function(x){return x[0]!=='Нежная классика'&&x[0]!=='Ботаника'}))},
  {id:'anim',l:'Сколько движения',ty:'cards',o:ANIM},
  {id:'colors',l:'Цвета',hint:'Если не по брендбуку',ty:'colors'},
  {id:'refs',l:'Ссылка на вдохновение',ty:'url',ph:'https://'},
  {id:'dislike',l:'Что точно не подходит',ty:'text'}
 ]},
 {t:'Тексты',h:'Тон приглашения',sub:'Тексты напишем сами и пришлём на согласование.',q:[
  {id:'from',l:'От чьего имени приглашение',ty:'radio',o:['От генерального директора','От компании','От команды организаторов']},
  {id:'tone',l:'Тон',ty:'radio',o:['Официально','Тепло и по-дружески','С юмором']},
  {id:'you',l:'Обращение',ty:'radio',o:['На «вы»','На «ты»']},
  {id:'idea',l:'Главная мысль',hint:'Что гости должны почувствовать или запомнить. По желанию',ty:'area'},
  {id:'photos',l:'Фото на сайте',ty:'radio',o:['Фото команды или офиса','Только фото площадки и графика']},
  {id:'photos_link',l:'Ссылка на фото',ty:'url',ph:'https://',cond:['photos',['Фото команды или офиса']]}
 ]},
 {t:'Разделы',h:'Что будет на сайте',sub:'Обложка, дата и время, программа, площадка с картой, анкета гостя и координатор есть всегда. Отметьте, что добавить.',q:[
  {id:'blocks',l:'Дополнительные разделы',ty:'chips',o:['Дресс-код','Трансфер','Парковка и пропуск на авто','Регистрация и бейджи','Меню','Номинации или голосование','Квиз или розыгрыш','Вопросы гостей','Обратный отсчёт','Фото от гостей после вечера']},
  {id:'access',l:'Доступ к сайту',ty:'radio',o:['Открыт по ссылке','Вход по коду','Только персональные ссылки сотрудникам']},
  {id:'logo_ok',l:'Логотип компании на сайте',ty:'radio',o:['Да','Нет, без логотипа']}
 ]},
 {t:'Анкета гостя',h:'Что спросить у гостей',sub:'Каждый отвечает в своей анкете: вы видите список гостей и ответы в таблице.',q:[
  {id:'rsvp',l:'Вопросы анкеты',hint:'«Приду / не приду» и ФИО есть всегда',ty:'chips',o:['Отдел или подразделение','Должность','Будет ли с парой (+1)','Выбор горячего','Алкоголь','Аллергии и ограничения в еде','Трансфер','Номер авто для пропуска','Размер одежды для мерча','Вопрос или пожелание']},
  {id:'deadline',l:'До какого числа ответить',ty:'text',ph:'например, до 15 декабря'},
  {id:'send',l:'Как разошлём',ty:'radio',o:['Мы даём ссылки, HR рассылает сам','Одна общая ссылка в корпоративный чат','Персональные ссылки каждому сотруднику']},
  {id:'export',l:'Выгрузка ответов для HR',ty:'radio',o:['Нужна таблица Excel / Google','Достаточно ссылки на список']},
  {id:'extra',l:'Что ещё важно учесть',ty:'area'}
 ]}
];

var S=KIND==='korporativ'?KO:SV;
var TITLE=KIND==='korporativ'?'Бриф: приглашение на корпоратив':'Бриф: сайт-приглашение на свадьбу';
var A={},cur=-1;
try{A=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){A={}}
var HAD=Object.keys(A).length>0;
var P=new URLSearchParams(location.search);
['name','groom','company','date','guests','lead','p'].forEach(function(k){if(P.get(k)&&!A[k])A[k]=P.get(k).slice(0,120)});
var $=function(i){return document.getElementById(i)};
function save(){try{localStorage.setItem(KEY,JSON.stringify(A));$('saved').textContent='Ответы сохраняются на этом устройстве'}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function arr(v){return Array.isArray(v)?v:(v?[v]:[])}
function render(){
 var h='';
 S.forEach(function(s,i){
  h+='<section class="st" data-i="'+i+'"><div class="eyebrow">Шаг '+(i+1)+' из '+S.length+' · '+s.t+'</div><h2>'+s.h+'</h2><p class="sub">'+s.sub+'</p>';
  var buf=[];
  s.q.forEach(function(q){
   var lab='<span class="lbl'+(q.req?' req':'')+'">'+q.l+'</span>'+(q.hint?'<span class="hint">'+q.hint+'</span>':'');
   var v=A[q.id],x='';
   if(q.ty=='text'||q.ty=='tel'||q.ty=='url'){x='<input type="'+(q.ty=='text'?'text':q.ty)+'" data-id="'+q.id+'"'+(q.ty=='tel'?' autocomplete="tel" inputmode="tel"':'')+' placeholder="'+esc(q.ph||'')+'" value="'+esc(v||'')+'">'}
   else if(q.ty=='area'){x='<textarea data-id="'+q.id+'" placeholder="'+esc(q.ph||'')+'">'+esc(v||'')+'</textarea>'}
   else if(q.ty=='chips'||q.ty=='radio'){x='<div class="chips" data-id="'+q.id+'" data-m="'+(q.ty=='chips'?1:0)+'" data-max="'+(q.max||0)+'">'+q.o.map(function(o){return '<span class="chip'+(arr(v).indexOf(o)>-1?' on':'')+'" data-v="'+esc(o)+'" role="button" tabindex="0">'+o+'</span>'}).join('')+'</div>'}
   else if(q.ty=='cards'){x='<div class="cards" data-id="'+q.id+'" data-m="0">'+q.o.map(function(o){return '<div class="card'+(arr(v).indexOf(o[0])>-1?' on':'')+'" data-v="'+esc(o[0])+'" role="button" tabindex="0"><b>'+o[0]+'</b><span>'+o[1]+'</span></div>'}).join('')+'</div>'}
   else if(q.ty=='looks'){x='<div class="looks" data-id="'+q.id+'" data-m="1" data-max="'+(q.max||0)+'">'+q.o.map(function(o){return '<div class="look'+(arr(v).indexOf(o[0])>-1?' on':'')+'" data-v="'+esc(o[0])+'" role="button" tabindex="0"><div class="pv" style="background:'+o[2]+';color:'+o[3]+'"><em style="font:'+o[4]+'">'+o[5]+'</em><small>'+o[0]+'</small></div><div class="tx"><b>'+o[0]+'</b><span>'+o[1]+'</span></div></div>'}).join('')+'</div>'}
   else if(q.ty=='colors'){x='<div class="pal" data-id="'+q.id+'" data-m="1">'+COLORS.map(function(c){return '<span class="sw'+(arr(v).indexOf(c[0])>-1?' on':'')+'" data-v="'+esc(c[0])+'" role="button" tabindex="0"><i style="background:'+c[1]+'"></i>'+c[0]+'</span>'}).join('')+'</div><input type="text" data-id="colors_own" placeholder="Свой вариант или HEX-коды" value="'+esc(A.colors_own||'')+'">'}
   var blk='<div class="q'+(q.cond?' cond':'')+'" data-q="'+q.id+'"'+(q.cond?' data-cond="'+q.cond[0]+'" data-cv="'+esc(q.cond[1].join('|'))+'"':'')+'>'+lab+x+'</div>';
   if(q.half){buf.push(blk);if(buf.length==2){h+='<div class="two">'+buf.join('')+'</div>';buf=[]}}
   else{if(buf.length){h+='<div class="two">'+buf.join('')+'</div>';buf=[]}h+=blk}
  });
  if(buf.length)h+='<div class="two">'+buf.join('')+'</div>';
  if(i==S.length-1)h+='<label class="ok" id="okL"><input type="checkbox" id="ok"> <span>Даю <a href="/soglasie/" target="_blank" rel="noopener">согласие на обработку персональных данных</a> и принимаю <a href="/privacy/" target="_blank" rel="noopener">политику конфиденциальности</a></span></label>';
  h+='<p class="err">Заполните, пожалуйста, поля со звёздочкой.</p></section>';
 });
 $('steps').innerHTML=h;conds();
}
function conds(){document.querySelectorAll('.cond').forEach(function(el){var vals=el.dataset.cv.split('|');el.classList.toggle('show',arr(A[el.dataset.cond]).some(function(x){return vals.indexOf(x)>-1}))})}
document.addEventListener('input',function(e){var id=e.target.dataset&&e.target.dataset.id;if(!id)return;A[id]=e.target.value;save()});
function pick(t){
 var box=t.parentNode,id=box.dataset.id,multi=box.dataset.m=='1',max=+box.dataset.max||0,v=t.dataset.v;
 if(multi){var a=arr(A[id]).slice(),k=a.indexOf(v);if(k>-1)a.splice(k,1);else{if(max&&a.length>=max){var first=a.shift();[].forEach.call(box.children,function(c){if(c.dataset.v===first)c.classList.remove('on')})}a.push(v)}A[id]=a;t.classList.toggle('on',a.indexOf(v)>-1)}
 else{if(A[id]==v){delete A[id];t.classList.remove('on')}else{A[id]=v;[].forEach.call(box.children,function(c){c.classList.toggle('on',c===t)})}}
 save();conds();
}
document.addEventListener('click',function(e){var t=e.target.closest('.chip,.card,.look,.sw');if(t)pick(t)});
document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.chip,.card,.look,.sw')){e.preventDefault();pick(e.target)}});
function go(i){
 cur=i;
 $('intro').style.display=i<0?'':'none';
 document.querySelectorAll('.st').forEach(function(s){s.classList.toggle('on',+s.dataset.i===i)});
 $('bar').style.width=(i<0?0:((i+1)/S.length*100))+'%';
 $('stepLbl').textContent=i<0?'Бриф приглашения':(i+1)+' / '+S.length;
 $('back').style.display=i<0?'none':'';
 $('next').textContent=i<0?(HAD?'Продолжить':'Начать'):(i==S.length-1?'Отправить бриф':'Далее');
 window.scrollTo({top:0,behavior:'smooth'});
}
function valid(i){var ok=true;S[i].q.forEach(function(q){if(q.req&&!String(A[q.id]||'').trim())ok=false});var e=document.querySelector('.st[data-i="'+i+'"] .err');if(e)e.style.display=ok?'none':'block';return ok}
function fmt(v){return Array.isArray(v)?v.join(', '):String(v)}
function summary(){
 var out=[(KIND==='korporativ'?'БРИФ ПРИГЛАШЕНИЯ · КОРПОРАТИВ':'БРИФ САЙТА-ПРИГЛАШЕНИЯ · СВАДЬБА')+(A.lead?' · сделка '+A.lead:'')];
 S.forEach(function(s){var lines=[];s.q.forEach(function(q){var v=A[q.id];if(q.ty=='colors'&&A.colors_own)v=arr(v).concat([A.colors_own]);if(v==null||v===''||(Array.isArray(v)&&!v.length))return;lines.push('• '+q.l+': '+fmt(v))});if(lines.length){out.push('');out.push('【'+s.t.toUpperCase()+'】');out=out.concat(lines)}});
 return out.join('\n');
}
function answers(){
 var r=[];
 S.forEach(function(s){s.q.forEach(function(q){var v=A[q.id];if(q.ty=='colors'&&A.colors_own)v=arr(v).concat([A.colors_own]);r.push([q.l,v==null?'':fmt(v)])})});
 return r;
}
function submit(){
 if(!$('ok').checked){$('okL').classList.add('bad');$('okL').scrollIntoView({block:'center',behavior:'smooth'});return}
 var btn=$('next');btn.disabled=true;btn.textContent='Отправляем…';
 var text=summary();
 var body={kind:KIND,answers:answers(),lead:A.lead||'',p:A.p||'',_hp:$('hp').value||''};
 var wa='https://wa.me/79150907290?text='+encodeURIComponent(text.slice(0,3500));
 function fin(ok){$('steps').style.display='none';$('nav').style.display='none';$('done').style.display='';$('bar').style.width='100%';$('stepLbl').textContent='Готово';
  if(!ok){$('doneTxt').textContent='Сервер не подтвердил получение. Чтобы ответы точно дошли, отправьте их нам в WhatsApp одной кнопкой: текст уже собран.';var a=document.querySelector('#done .btns a');a.href=wa;a.textContent='Отправить ответы в WhatsApp'}
  else{try{localStorage.removeItem(KEY)}catch(e){}}
  if(window.ym)try{ym(112491690,'reachGoal',KIND==='korporativ'?'invite_brief_korp':'invite_brief_svadba')}catch(e){}
  window.scrollTo({top:0})}
 fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body)})
  .then(function(r){return r.json()}).then(function(j){fin(!!(j&&j.ok))}).catch(function(){fin(false)});
}
document.addEventListener('change',function(e){if(e.target.id==='ok')$('okL').classList.remove('bad')});
$('next').onclick=function(){if(cur<0){go(0);return}if(!valid(cur))return;if(cur<S.length-1)go(cur+1);else submit()};
$('back').onclick=function(){go(cur-1)};
render();go(-1);
if(HAD)$('saved').textContent='Есть сохранённые ответы: продолжим с того же места';
})();
