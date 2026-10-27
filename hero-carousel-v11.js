/* CARATZON hero images: automatic, manually controllable, pauses on hover/focus. */
(() => {
 const root=document.getElementById('campaignCarousel');
 if(!root)return;
 const slides=[...root.querySelectorAll('.campaign-slide')];
 const dots=[...root.querySelectorAll('.campaign-indicators button')];
 const prev=document.getElementById('campaignPrev'),next=document.getElementById('campaignNext');
 if(slides.length<2)return;
 let index=0,timer=null;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const set=(n)=>{index=(n+slides.length)%slides.length;slides.forEach((slide,i)=>{
  const active=i===index;slide.classList.toggle('is-current',active);slide.setAttribute('aria-hidden',String(!active));
 });dots.forEach((dot,i)=>{const active=i===index;dot.classList.toggle('is-current',active);if(active)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current')})};
 const stop=()=>{if(timer){clearInterval(timer);timer=null}};
 const play=()=>{stop();if(!reduced&&!document.hidden)timer=setInterval(()=>set(index+1),5000)};
 prev?.addEventListener('click',()=>{set(index-1);play()});
 next?.addEventListener('click',()=>{set(index+1);play()});
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>{set(i);play()}));
 root.addEventListener('mouseenter',stop);root.addEventListener('mouseleave',play);
 root.addEventListener('focusin',stop);root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))play()});
 document.addEventListener('visibilitychange',()=>document.hidden?stop():play());
 slides.forEach((slide,i)=>slide.querySelector('img')?.addEventListener('error',()=>{slide.dataset.failed='true';if(i===index)set(index+1)}));
 play();
})();
