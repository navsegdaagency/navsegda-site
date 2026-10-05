/* НАВСЕГДА · 152-ФЗ: cookie-уведомление + обязательное согласие в любой форме с персональными данными */
(function(){
  var ev=location.pathname.indexOf('/event/')===0;
  var POL=ev?'/event/politika-konfidencialnosti/':'/privacy/', SOG=ev?'/event/soglasie/':'/soglasie/';
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
  function css(){if(document.getElementById('nsg-legal-css'))return;var s=document.createElement('style');s.id='nsg-legal-css';
    s.textContent='.nsg-ck{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;background:#2a0001;color:#FFE7C6;border:1px solid rgba(186,138,72,.5);border-radius:14px;padding:14px 16px;font:14px/1.45 -apple-system,system-ui,sans-serif;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);display:flex;gap:12px;align-items:center;flex-wrap:wrap}'+
    '.nsg-ck a{color:#FFE7C6;text-decoration:underline}.nsg-ck button{margin-left:auto;background:#BA8A48;color:#2a0001;border:0;border-radius:999px;padding:9px 18px;font:600 13px system-ui;cursor:pointer}'+
    '.nsg-cs{display:flex;gap:8px;align-items:flex-start;font:12.5px/1.4 -apple-system,system-ui,sans-serif;margin:8px 0;text-align:left;cursor:pointer}.nsg-cs input{margin-top:2px;flex:none;width:16px;height:16px}.nsg-cs a{color:inherit;text-decoration:underline}'+
    '.nsg-cs-err{color:#e0574a!important;font-weight:600}';document.head.appendChild(s);}
  function banner(){if(ls('nsg-cookie'))return;css();var d=document.createElement('div');d.className='nsg-ck';d.setAttribute('role','dialog');
    d.innerHTML='<span>Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал и становился удобнее. Подробнее — в <a href="'+POL+'">политике конфиденциальности</a>.</span><button type="button">Понятно</button>';
    d.querySelector('button').onclick=function(){ls('nsg-cookie','1');d.remove();};document.body.appendChild(d);}
  // только формы, которые реально собирают контакты (калькуляторы и поиск не трогаем)
  function personal(f){return [].some.call(f.querySelectorAll('input,textarea'),function(i){var n=(i.name||'')+' '+(i.id||'')+' '+(i.placeholder||'');
    return i.type==='tel'||i.type==='email'||/name|phone|contact|tel|mail|fio|nick|telegram|имя|телефон/i.test(n);});}
  function box(f){var c=f.querySelector('input[name="_consent"]');if(c)return c;
    css();var l=document.createElement('label');l.className='nsg-cs';
    l.innerHTML='<input type="checkbox" name="_consent" required> <span>Я даю <a href="'+SOG+'" target="_blank">согласие на обработку персональных данных</a> и принимаю <a href="'+POL+'" target="_blank">политику конфиденциальности</a></span>';
    var b=f.querySelector('[type=submit],button:not([type=button]),.t-submit');
    if(b&&b.parentNode&&f.contains(b.parentNode))b.parentNode.insertBefore(l,b);else f.appendChild(l);
    return l.querySelector('input');}
  function guard(f){if(f.__nsgLegal||!personal(f)||f.closest('[data-legal-skip]'))return;f.__nsgLegal=1;var c=box(f);
    function stop(e){if(c.checked)return;e.preventDefault();e.stopImmediatePropagation();var s=c.parentNode.querySelector('span');if(s){s.classList.add('nsg-cs-err');}
      try{c.focus();c.scrollIntoView({block:'center',behavior:'smooth'});}catch(x){}}
    c.addEventListener('change',function(){var s=c.parentNode.querySelector('span');if(s)s.classList.remove('nsg-cs-err');});
    f.addEventListener('submit',stop,true);
    f.addEventListener('click',function(e){var t=e.target.closest('[type=submit],button:not([type=button]),.t-submit');if(t&&f.contains(t))stop(e);},true);}
  function scan(){[].forEach.call(document.querySelectorAll('form'),guard);}
  function init(){banner();scan();var n=0,iv=setInterval(function(){scan();if(++n>20)clearInterval(iv);},700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
