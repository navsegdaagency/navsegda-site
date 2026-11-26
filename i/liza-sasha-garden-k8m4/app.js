(function(){
'use strict';
var date='2027-08-12';
var code='liza-sasha-garden-k8m4';
var api='https://109-68-213-160.sslip.io/api/kab/inv/'+code;
var form=document.getElementById('guest-form');
var lastAnswer=null;
var busy=false;
var photoDialog=document.getElementById('photo-dialog');
document.querySelectorAll('[data-photo]').forEach(function(button){button.addEventListener('click',function(){photoDialog.querySelector('img').src=button.dataset.photo;photoDialog.showModal()})});
photoDialog.querySelector('button').onclick=function(){photoDialog.close()};
photoDialog.addEventListener('click',function(event){if(event.target===photoDialog)photoDialog.close()});
var message=document.getElementById('success-text');
document.querySelector('.form-message').setAttribute('role','status');
document.querySelector('.form-message').setAttribute('aria-live','polite');
function choose(name){var selected=form.querySelector('input[name="'+name+'"]:checked');return selected?selected.value:''}
function setError(text){document.querySelector('.form-message').textContent=text}
function attendance(){var absent=choose('attendance')==='Не смогу';document.getElementById('yes-fields').hidden=absent;Array.prototype.forEach.call(document.getElementById('yes-fields').querySelectorAll('input,textarea'),function(input){input.disabled=absent})}
form.addEventListener('change',function(event){
 if(event.target.name==='attendance')attendance();
 if(event.target.name==='drink'&&event.target.checked){Array.prototype.forEach.call(form.querySelectorAll('[name="drink"]'),function(input){if(input!==event.target&&(event.target.value==='Без алкоголя'||input.value==='Без алкоголя'))input.checked=false})}
 setError('');
});
function answerRows(){
 var present=choose('attendance')==='Буду';
 var drinks=Array.prototype.map.call(form.querySelectorAll('[name="drink"]:checked'),function(input){return input.value}).join(', ');
 return [['Имя и фамилия',form.elements.guest.value.trim().replace(/\s+/g,' ')],['Будете на свадьбе?',choose('attendance')],['Предпочтение по горячему',present?choose('meal'):''],['Предпочтения по алкоголю',present?drinks:''],['Особенности питания',present?form.elements.diet.value.trim():''],['Трансфер',present?choose('transfer'):''],['Пожелание',form.elements.wish.value.trim()]];
}
form.addEventListener('submit',function(event){
 event.preventDefault();if(busy||form.elements.website.value)return;
 var rows=answerRows();
 if(rows[0][1].split(' ').length<2||rows[0][1].length<4){setError('Пожалуйста, укажите имя и фамилию.');form.elements.guest.focus();return}
 if(!rows[1][1]){setError('Отметьте, сможете ли вы прийти.');form.querySelector('[name="attendance"]').focus();return}
 if(!form.elements.consent.checked){setError('Для отправки нужно отметить согласие на обработку данных.');form.elements.consent.focus();return}
 busy=true;var button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent='Сохраняем ваш ответ…';setError('');
 var controller=window.AbortController?new AbortController():null;
 var timer=controller?setTimeout(function(){controller.abort()},30000):null;
 var options={method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({answers:rows,consent:true,_hp:''})};
 if(controller)options.signal=controller.signal;
 fetch(api+'/rsvp',options).then(function(response){return response.json().then(function(result){if(!response.ok||!result.ok||result.sheet_saved!==true)throw new Error(result.detail||'Сохранение не подтверждено');return result})}).then(function(){
  lastAnswer=rows;form.hidden=true;document.querySelector('.success').hidden=false;
  message.textContent=rows[1][1]==='Буду'?'Ваш ответ записан. Будем очень рады увидеть вас на нашей свадьбе.':'Спасибо, что сообщили. Если планы изменятся, вы можете поменять ответ.';
  document.querySelector('.success').scrollIntoView({behavior:'smooth',block:'center'});
 }).catch(function(error){setError(error.name==='AbortError'?'Сервер отвечает дольше обычного. Ответы остались в форме. Попробуйте отправить ещё раз.':'Не удалось подтвердить запись в таблицу. Ответы остались в форме. Повторите отправку или позвоните Анастасии: +7 987 609-49-67.')}).finally(function(){if(timer)clearTimeout(timer);busy=false;button.disabled=false;button.textContent='Отправить ответ'});
});
document.getElementById('edit-answer').onclick=function(){form.hidden=false;document.querySelector('.success').hidden=true;form.scrollIntoView({behavior:'smooth',block:'start'});setError('Внесите изменения и снова нажмите «Отправить ответ». Предыдущая запись с тем же именем и фамилией обновится.')};
if(date){
 var calendar=document.getElementById('calendar');calendar.hidden=false;
 calendar.onclick=function(){var nextDay=new Date(new Date(date+'T12:00:00Z').getTime()+86400000).toISOString().slice(0,10).replace(/-/g,'');var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NAVSEGDA//Wedding//RU','BEGIN:VEVENT','UID:liza-sasha-garden-k8m4@navseg-da.agency','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z'),'DTSTART;VALUE=DATE:'+date.replace(/-/g,''),'DTEND;VALUE=DATE:'+nextDay,'SUMMARY:Свадьба Александра и Елизаветы','LOCATION:Зал Лермонтов\, усадьба Гребнево','DESCRIPTION:Время сбора уточняется. '+location.href.split('#')[0],'END:VEVENT','END:VCALENDAR'];var url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'}));var anchor=document.createElement('a');anchor.href=url;anchor.download='elizaveta-alexandr.ics';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000)};
 var parts=date.split('-'),months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 document.querySelector('[data-date-label]').textContent=Number(parts[2])+' '+months[Number(parts[1])-1]+' '+parts[0];
 document.querySelector('[data-date-large]').innerHTML=parts[2]+'.'+parts[1]+'<span>'+parts[0]+'</span>';
 document.querySelector('[data-date-large] span').style.cssText='display:block;font-size:.3em;letter-spacing:.25em;margin-top:20px';
 var countdown=document.querySelector('.countdown');countdown.hidden=false;
 function tick(){var seconds=Math.max(0,Math.floor((new Date(date+'T00:00:00+03:00').getTime()-Date.now())/1000));var values=[Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60)];Array.prototype.forEach.call(countdown.querySelectorAll('strong'),function(element,index){element.textContent=String(values[index]).padStart(2,'0')})}
 tick();setInterval(tick,60000);
}
})();
