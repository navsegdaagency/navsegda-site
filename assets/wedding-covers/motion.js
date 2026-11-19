(()=>{
 'use strict';
 const root=document.documentElement,hero=document.querySelector('header.hero'),video=document.getElementById('wedding-cover-video'),button=document.getElementById('wedding-cover-toggle');
 if(!hero||!video||!button)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:760px)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
 const network=navigator.connection,saveTraffic=!!(network&&(network.saveData||/2g/.test(network.effectiveType||'')));
 let inView=true,userPaused=false,source='',heroHeight=hero.offsetHeight,raf=0,lenis=null,lastShift=-1,engineTime=0,lastFrame=0;
 function syncButton(){const paused=video.paused;button.textContent=paused?'Включить видео':'Пауза видео';button.setAttribute('aria-label',paused?'Включить фоновое видео':'Приостановить фоновое видео');}
 function markReady(){hero.classList.add('wedding-video-ready');}
 function selectSource(){
  const next=mobile.matches?video.dataset.mobile:video.dataset.desktop;
  if(source===next)return;
  const time=Number.isFinite(video.currentTime)?video.currentTime:0;
  source=next;hero.classList.remove('wedding-video-ready');
  video.poster=mobile.matches?video.dataset.posterMobile:video.dataset.posterDesktop;
  video.preload='auto';video.src=next;
  if(time>0)video.addEventListener('loadedmetadata',()=>{if(time<video.duration)video.currentTime=time;},{once:true});
 }
 function play(manual=false){
  if(document.hidden||!inView||(!manual&&(userPaused||reduced.matches||saveTraffic)))return;
  selectSource();video.muted=true;if(video.error)video.load();video.play().catch(syncButton);
 }
 video.addEventListener('loadeddata',()=>{if('requestVideoFrameCallback' in video)video.requestVideoFrameCallback(markReady);else markReady();});
 video.addEventListener('play',syncButton);video.addEventListener('pause',syncButton);
 video.addEventListener('error',()=>{hero.classList.remove('wedding-video-ready');syncButton();});
 button.addEventListener('click',()=>{if(video.paused){userPaused=false;play(true);}else{userPaused=true;video.pause();}});
 new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;hero.classList.toggle('cover-in-view',inView);if(inView){play();wake();}else video.pause();},{threshold:.01}).observe(hero);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();if(raf){cancelAnimationFrame(raf);raf=0;}}else{play();wake();}});
 mobile.addEventListener('change',()=>{const resume=!video.paused;if(source){selectSource();if(resume)play(true);}configureMotion();});
 function paint(){
  if(!inView||reduced.matches)return;
  const p=Math.max(0,Math.min(1,scrollY/Math.max(1,heroHeight))),shift=Math.round(p*(mobile.matches?8:14)*10)/10;
  if(shift!==lastShift){hero.style.setProperty('--cover-shift',shift+'px');lastShift=shift;}
 }
 function tick(time){
  raf=0;if(document.hidden){lastFrame=0;return;}
  // Resume after idle with a bounded frame delta, rather than jumping to the target.
  engineTime+=lastFrame?Math.min(time-lastFrame,32):16.667;lastFrame=time;
  if(lenis)lenis.raf(engineTime);paint();
  if(lenis&&lenis.isScrolling==='smooth')wake();else lastFrame=0;
 }
 function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
 function configureMotion(){
  const allow=!reduced.matches;root.classList.toggle('wedding-motion-enabled',allow);
  if(lenis){lenis.destroy();lenis=null;}engineTime=0;lastFrame=0;
  if(allow&&fine.matches&&!mobile.matches&&typeof window.Lenis==='function'){
   lenis=new window.Lenis({autoRaf:false,lerp:.09,smoothWheel:true,syncTouch:false,anchors:false,respectReducedMotion:true,prevent:node=>node.classList?.contains('lb')||node.hasAttribute?.('data-lenis-prevent')||node.tagName==='SELECT'||node.tagName==='TEXTAREA',virtualScroll:({event})=>!event.shiftKey&&Math.abs(event.deltaX)<=Math.abs(event.deltaY)});
   lenis.on('virtual-scroll',wake);lenis.on('scroll',wake);
  }
  if(!allow){video.pause();hero.style.removeProperty('--cover-shift');lastShift=-1;}else play();
  wake();
 }
 addEventListener('scroll',wake,{passive:true});addEventListener('wheel',wake,{passive:true});
 new ResizeObserver(()=>{heroHeight=hero.offsetHeight;if(lenis)lenis.resize();wake();}).observe(hero);
 reduced.addEventListener('change',configureMotion);fine.addEventListener('change',configureMotion);
 new MutationObserver(()=>{if(!lenis)return;if(document.body.style.overflow==='hidden')lenis.stop();else lenis.start();}).observe(document.body,{attributes:true,attributeFilter:['style']});
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const hash=link.getAttribute('href');if(!hash||hash==='#')return;
  let target;try{target=document.getElementById(decodeURIComponent(hash.slice(1)));}catch{return;}
  if(!target)return;event.preventDefault();
  if(lenis){lenis.scrollTo(target,{offset:-82,duration:.95});wake();}
  else target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  history.pushState(null,'',hash);
 });
 configureMotion();syncButton();
})();
