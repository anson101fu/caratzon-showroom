/* CARATZON V8.1 — robust empty-bag UI. Does not alter prices or orders. */
(() => {
  const drawer=document.getElementById('drawer');
  const items=document.getElementById('cartItems');
  if (!drawer || !items) return;
  const dict={
    ru:{title:'Ваша корзина пуста',text:'Откройте коллекцию и выберите украшения, которые вам нравятся.',shop:'Смотреть коллекцию'},
    en:{title:'Your bag is empty',text:'Discover the collection and find something special.',shop:'Explore collection'},
    zh:{title:'购物袋还是空的',text:'探索精选珠宝，挑选喜爱的款式。',shop:'浏览产品'}
  };
  let busy=false;
  function language(){
    const l=(document.documentElement.lang||'ru').toLowerCase();
    return l.startsWith('zh')?'zh':l.startsWith('en')?'en':'ru';
  }
  function refresh(){
    if(busy)return;
    busy=true;
    try {
      const hasItems=!!items.querySelector('.cart-entry');
      drawer.classList.toggle('store-empty',!hasItems);
      let placeholder=items.querySelector('.v81-empty');
      if(hasItems){if(placeholder)placeholder.remove();return;}
      if(!placeholder){
        placeholder=document.createElement('div');
        placeholder.className='v81-empty';
        placeholder.innerHTML='<div class="v81-empty-symbol" aria-hidden="true">◇</div><h3 class="v81-empty-title"></h3><p class="v81-empty-text"></p><a class="v81-shop" href="#collection"></a>';
        placeholder.querySelector('a').addEventListener('click',()=>{document.getElementById('closeCart')?.click();});
        items.append(placeholder);
      }
      const t=dict[language()];
      const h=placeholder.querySelector('h3'),p=placeholder.querySelector('p'),a=placeholder.querySelector('a');
      if(h.textContent!==t.title)h.textContent=t.title;
      if(p.textContent!==t.text)p.textContent=t.text;
      if(a.textContent!==t.shop)a.textContent=t.shop;
    }finally{busy=false;}
  }
  new MutationObserver(refresh).observe(items,{childList:true,subtree:false});
  document.getElementById('langBtn')?.addEventListener('click',()=>setTimeout(refresh,0));
  refresh();
})();
