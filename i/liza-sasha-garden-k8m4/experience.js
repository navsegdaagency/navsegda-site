(function(){
'use strict';
var dialog=document.getElementById('rsvp-dialog'),open=document.getElementById('open-rsvp'),close=document.getElementById('close-rsvp');
open.addEventListener('click',function(){dialog.showModal();document.body.classList.add('dialog-open')});
close.addEventListener('click',function(){dialog.close()});
dialog.addEventListener('close',function(){document.body.classList.remove('dialog-open')});
dialog.addEventListener('click',function(e){if(e.target!==dialog)return;var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}})},{threshold:.08});document.querySelectorAll('.reveal').forEach(function(item){observer.observe(item)});document.documentElement.classList.add('reveal-ready')}
})();
