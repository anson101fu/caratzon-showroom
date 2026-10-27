/* Fashion A V4 category tiles use the original category select and filtering logic. */
(function(){
const words={
 ru:{kicker:'КОЛЛЕКЦИЯ',title:'Популярные категории',all:'Смотреть все изделия →',view:'СМОТРЕТЬ →',names:{earrings:'Серьги',necklaces:'Колье',rings:'Кольца',bracelets:'Браслеты'}},
 en:{kicker:'THE COLLECTION',title:'Explore by category',all:'View all jewelry →',view:'EXPLORE →',names:{earrings:'Earrings',necklaces:'Necklaces',rings:'Rings',bracelets:'Bracelets'}},
 zh:{kicker:'精选系列',title:'探索热门分类',all:'查看全部产品 →',view:'探索系列 →',names:{earrings:'耳饰',necklaces:'项链',rings:'戒指',bracelets:'手链'}}
};
const hints={earrings:['耳钉','耳环','耳饰'],necklaces:['项链','锁骨链','颈链','项圈'],rings:['戒指','指环'],bracelets:['手链','手镯','手饰']};
function language(){return ['ru','en','zh'].includes(document.documentElement.lang)?document.documentElement.lang:'ru'}
function refresh(){const w=words[language()];document.querySelector('[data-cat-kicker]').textContent=w.kicker;document.querySelector('[data-cat-title]').textContent=w.title;document.querySelector('[data-cat-all]').textContent=w.all;document.querySelectorAll('[data-cat-view]').forEach(e=>e.textContent=w.view);document.querySelectorAll('[data-cat-name]').forEach(e=>e.textContent=w.names[e.dataset.catName]||'')}
const langBtn=document.getElementById('langBtn');langBtn.addEventListener('click',()=>queueMicrotask(refresh));
document.querySelectorAll('.fashion-category').forEach(card=>card.addEventListener('click',event=>{
 event.preventDefault();const sel=document.getElementById('category');const wanted=hints[card.dataset.categoryType]||[];
 const options=[...sel.options].filter(o=>o.value);
 const matched=options.find(o=>wanted.some(w=>o.value===w))||options.find(o=>wanted.some(w=>o.value.includes(w)));
 sel.value=matched?matched.value:'';sel.dispatchEvent(new Event('change',{bubbles:true}));
 document.getElementById('collection').scrollIntoView({behavior:'smooth',block:'start'});
}));
document.querySelector('.fashion-categories-all').addEventListener('click',()=>{const sel=document.getElementById('category');sel.value='';sel.dispatchEvent(new Event('change',{bubbles:true}))});
refresh();
})();
