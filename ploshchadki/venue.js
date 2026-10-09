(function(){
function rub(n){return Math.round(n).toLocaleString('ru-RU').replace(/,/g,' ')+' ₽'}
/* lightbox */
var lb=document.getElementById('lb'),li=lb.querySelector('img'),i=0;
function sh(k){i=(k+PH.length)%PH.length;li.src=PH[i];lb.classList.add('on')}
lb.querySelector('.x').onclick=function(){lb.classList.remove('on')};lb.querySelector('.p').onclick=function(){sh(i-1)};lb.querySelector('.n').onclick=function(){sh(i+1)};
lb.onclick=function(ev){if(ev.target===lb)lb.classList.remove('on')};
document.addEventListener('keydown',function(ev){if(!lb.classList.contains('on'))return;if(ev.key=='Escape')lb.classList.remove('on');if(ev.key=='ArrowLeft')sh(i-1);if(ev.key=='ArrowRight')sh(i+1)});
/* 3D ring */
var stage=document.getElementById('stage'),ring=document.getElementById('ring'),cards=[].slice.call(ring.children),n=cards.length;
var R=Math.max(260,Math.round((innerWidth<700?200:250)*n/(2*Math.PI)*1.12)),ang=0,vel=.12,drag=false,x0=0,a0=0,moved=0;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
cards.forEach(function(c,k){c.style.transform='rotateY('+(360/n*k)+'deg) translateZ('+R+'px)'});
function draw(){ring.style.transform='translateZ('+(-R)+'px) rotateY('+ang+'deg)'}
function tick(){if(!drag&&!reduce)ang-=vel;draw();requestAnimationFrame(tick)}
draw();requestAnimationFrame(tick);
stage.addEventListener('pointerdown',function(ev){drag=true;moved=0;x0=ev.clientX;a0=ang;stage.setPointerCapture(ev.pointerId)});
stage.addEventListener('pointermove',function(ev){if(!drag)return;var dx=ev.clientX-x0;moved=Math.max(moved,Math.abs(dx));ang=a0+dx*.35});
function up(){drag=false}stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
ring.addEventListener('click',function(ev){var b=ev.target.closest('[data-i]');if(b&&moved<6)sh(+b.dataset.i)});ring.addEventListener('keydown',function(ev){var b=ev.target.closest('[data-i]');if(b&&(ev.key=='Enter'||ev.key==' ')){ev.preventDefault();sh(+b.dataset.i)}});
/* calculator */
var S=[{id:'decor',l:'Декор и флористика',from:150000,on:1},{id:'host',l:CFG.wedding?'Ведущий и диджей':'Ведущий, диджей, программа',from:110000,on:1},
{id:'tech',l:'Свет и звук',from:100000,on:!CFG.tech_in,note:CFG.tech_in?'часть техники уже есть на площадке':''},{id:'photo',l:'Фото и видео',from:135000,on:1},
{id:'cake',l:'Торт',pg:750,on:CFG.wedding,w:1},{id:'team',l:'Координатор и персонал',from:60000,on:1}];
var svc=document.getElementById('svc'),g=document.getElementById('cg'),go=document.getElementById('cgo'),res=document.getElementById('res'),day=null;
S.forEach(function(s){if(s.w&&!CFG.wedding)return;var l=document.createElement('label');
l.innerHTML='<input type="checkbox" data-id="'+s.id+'"'+(s.on?' checked':'')+'> '+s.l+(s.note?' <small style="color:var(--muted)">— '+s.note+'</small>':'')+'<em>'+(s.pg?s.pg+' ₽ / гость':'от '+rub(s.from))+'</em>';svc.appendChild(l)});
if(CFG.days){var keys=Object.keys(CFG.days);day=keys[keys.length-1];var w=document.getElementById('cdw');
w.innerHTML='<label class="t">День недели</label><div class="fg">'+keys.map(function(k){return '<button type="button" class="chip" data-d="'+k+'" aria-pressed="'+(k==day)+'">'+k+'</button>'}).join('')+'</div>';
w.querySelectorAll('[data-d]').forEach(function(b){b.onclick=function(){day=b.dataset.d;w.querySelectorAll('[data-d]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});calc()}})}
var last='';
function calc(){var n=+g.value;go.textContent=n;var L=[],venue=0,food=0;
 if(CFG.banquet){food=CFG.banquet*n;L.push(['Банкет: '+rub(CFG.banquet)+' × '+n,food]);
  var srv=CFG.service_fix?CFG.service_fix*n:(CFG.service_pct?food*CFG.service_pct/100:0);
  if(srv){L.push([CFG.service_fix?'Обслуживание: '+rub(CFG.service_fix)+' × '+n:'Сервисный сбор '+CFG.service_pct+'%',srv])}
  var dep=CFG.days&&day?CFG.days[day][1]:CFG.deposit;var fs=food+(CFG.deposit_incl_service?srv:0);
  if(dep&&fs<dep){L.push(['Добор до минимального депозита '+rub(dep),dep-fs])}}
 else{L.push(['Питание — по меню площадки, посчитаем отдельно',0])}
 if(CFG.corkage){L.push(['Пробковый сбор: '+rub(CFG.corkage)+' × '+n,CFG.corkage*n])}
 var rent=CFG.days&&day?CFG.days[day][0]:CFG.rent;if(rent){L.push(['Аренда'+(day?' ('+day+')':''),rent])}else{L.push(['Аренда — уточним под дату',0])}
 L.forEach(function(x){venue+=x[1]});
 var sv=0,SL=[];svc.querySelectorAll('input').forEach(function(c){if(!c.checked)return;var s=S.filter(function(z){return z.id==c.dataset.id})[0];var v=s.pg?s.pg*n:s.from;sv+=v;SL.push([s.l,v])});
 var org=Math.round((venue+sv)*0.11),tot=venue+sv+org;
 var h='<div class="ln"><span><b>Площадка</b></span><span><b>'+rub(venue)+'</b></span></div>'+L.map(function(x){return '<div class="ln"><span>'+x[0]+'</span><span>'+(x[1]?rub(x[1]):'—')+'</span></div>'}).join('');
 if(SL.length)h+='<div class="ln" style="margin-top:8px"><span><b>Команда и услуги</b></span><span><b>'+rub(sv)+'</b></span></div>'+SL.map(function(x){return '<div class="ln"><span>'+x[0]+'</span><span>от '+rub(x[1])+'</span></div>'}).join('');
 h+='<div class="ln" style="margin-top:8px"><span><b>Организация НАВСЕГДА</b> · 11%</span><span><b>'+rub(org)+'</b></span></div>';
 h+='<div class="tot"><span>Итого, ориентир</span><div><b>≈ '+rub(tot)+'</b><div class="pg">≈ '+rub(tot/n)+' на гостя</div></div></div>';
 h+='<p class="note">Услуги — минимальные суммы по нашим проектам 2026 года на 40–60 гостей. Цены площадки зависят от даты; точную смету соберём под вас.</p>';
 res.innerHTML=h;last='Калькулятор: '+n+' гостей'+(day?', '+day:'')+', ориентир ≈ '+rub(tot)+' (площадка '+rub(venue)+', услуги '+rub(sv)+')';}
g.oninput=calc;svc.onchange=calc;calc();
var touched=0;g.addEventListener('change',function(){if(!touched&&window.ym)try{ym(112491690,'reachGoal','catalog_calc')}catch(x){};touched=1});
document.getElementById('cgo2').onclick=function(){document.getElementById('g').value=g.value;var cm=document.getElementById('cm');cm.value=last;document.getElementById('zayavka').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(function(){document.getElementById('n').focus({preventScroll:true})},600)};
/* form */
var f=document.querySelector('#form form');
f.onsubmit=function(ev){ev.preventDefault();var q=new URLSearchParams(location.search),d={form:'catalog',source:'catalog',venue:CFG.name,
utm_source:q.get('utm_source')||'catalog',utm_medium:q.get('utm_medium')||'venue_page',utm_campaign:q.get('utm_campaign')||location.pathname.split('/')[2],page:location.href};
new FormData(f).forEach(function(val,k){d[k]=val});d.message='Каталог площадок: '+d.venue+(d.event_type?', '+d.event_type:'')+(d.comment?'. '+d.comment:'');
var b=f.querySelector('button');b.disabled=true;b.textContent='Отправляем…';
fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(d)}).then(function(r){return r.json()})
.then(function(j){if(!j||!j.ok)throw 0;document.getElementById('form').classList.add('done');if(window.ym)try{ym(112491690,'reachGoal','catalog_lead')}catch(x){}})
.catch(function(){b.disabled=false;b.textContent='Узнать даты и стоимость';alert('Не получилось отправить. Позвоните или напишите нам: +7 958 541-00-41')})};
})();