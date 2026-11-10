/* CARATZON B2B entry V1 — non-invasive homepage enhancement. */
(() => {
  'use strict';
  const labels = {
    en: {
      wholesale:'Shop Wholesale', custom:'OEM / ODM Service',
      kicker:'CUSTOM JEWELRY MANUFACTURING', title:'Create jewelry for your brand.',
      lead:'From your drawings to samples and bulk production. Discuss materials, finishing, packaging, quantity and lead time with our team.',
      oem:'OEM · Manufacture from your design', odm:'ODM · Design & product development',
      contact:'Discuss a Custom Project', note:'Sample fees, minimum quantities, prices and production schedules are quoted after reviewing your requirements.'
    },
    zh: {
      wholesale:'批發產品', custom:'OEM／ODM 訂製',
      kicker:'珠寶訂製生產服務', title:'為你的品牌開發專屬珠寶。',
      lead:'由設計圖、打板到批量生產，歡迎向我們查詢材質、電鍍、品牌包裝、數量及交貨時間。',
      oem:'OEM · 按客戶設計圖生產', odm:'ODM · 設計開發與產品製作',
      contact:'聯絡我們洽談訂製', note:'打板費、起訂量、價格及生產交期會按照實際需求另行報價。'
    },
    ru: {
      wholesale:'Оптовый каталог', custom:'OEM / ODM на заказ',
      kicker:'ПРОИЗВОДСТВО УКРАШЕНИЙ НА ЗАКАЗ', title:'Украшения для вашего бренда.',
      lead:'От эскиза и образца до серийного производства. Обсудите с нами материалы, покрытие, фирменную упаковку, тираж и сроки.',
      oem:'OEM · Производство по вашему дизайну', odm:'ODM · Разработка дизайна и изделий',
      contact:'Обсудить индивидуальный проект', note:'Стоимость образцов, минимальный тираж, цены и сроки определяются после рассмотрения запроса.'
    }
  };
  function init() {
    if (document.getElementById('cz-b2b-oem-section')) return;
    const hero = document.querySelector('.hero');
    const content = hero?.querySelector('.hero-content');
    const existing = content?.querySelector('a.cta[href="#collection"]');
    if (!hero || !content || !existing || !document.getElementById('collection')) return;
    const css = document.createElement('style');
    css.id='cz-b2b-entry-style';
    css.textContent = `
      .cz-b2b-hero-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:22px}
      .cz-b2b-hero-actions .cta{margin:0!important;min-width:154px;text-align:center;box-sizing:border-box}
      .cz-b2b-hero-actions .cz-b2b-oem-link{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:12px 22px;border:1px solid #392c24;background:#fffaf6;color:#392c24;text-decoration:none;font:inherit;font-size:14px;box-sizing:border-box}
      .cz-b2b-hero-actions .cz-b2b-oem-link:hover,.cz-b2b-hero-actions .cz-b2b-oem-link:focus-visible{background:#efe5dd}
      #cz-b2b-oem-section{scroll-margin-top:110px;background:#f6f0eb;color:#392c24;padding:clamp(36px,6vw,88px) clamp(20px,5vw,70px)}
      #cz-b2b-oem-section .cz-b2b-inner{max-width:1100px;margin-inline:auto}
      #cz-b2b-oem-section .cz-b2b-eyebrow{font-size:11px;letter-spacing:.19em;text-transform:uppercase;color:#967765}
      #cz-b2b-oem-section h2{font-size:clamp(27px,3.8vw,52px);line-height:1.16;margin:14px 0 20px;font-family:Georgia,serif;font-weight:400}
      #cz-b2b-oem-section p{max-width:770px;line-height:1.8}
      #cz-b2b-oem-section ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:22px 0}
      #cz-b2b-oem-section li{padding:18px;border:1px solid #ddcfc5;background:#fffaf6}
      #cz-b2b-oem-section .cz-b2b-contact{display:inline-flex;padding:14px 24px;background:#392c24;color:white;text-decoration:none;border:0;cursor:pointer;font:inherit}
      #cz-b2b-oem-section .cz-b2b-note{font-size:12px;color:#78665a;margin-top:20px}
      @media(max-width:650px){.cz-b2b-hero-actions{gap:9px}.cz-b2b-hero-actions .cta,.cz-b2b-hero-actions .cz-b2b-oem-link{width:100%}#cz-b2b-oem-section ul{grid-template-columns:1fr}}
    `;
    document.head.append(css);
    const actions = document.createElement('div');
    actions.className='cz-b2b-hero-actions';
    existing.removeAttribute('data-t'); // Do not let existing translate() overwrite new B2B label.
    existing.replaceWith(actions);
    actions.append(existing);
    const custom=document.createElement('a');
    custom.href='#cz-b2b-oem-section';
    custom.className='cz-b2b-oem-link';
    actions.append(custom);
    const section=document.createElement('section');
    section.id='cz-b2b-oem-section';
    section.setAttribute('aria-labelledby','cz-b2b-oem-title');
    section.innerHTML='<div class="cz-b2b-inner"><p class="cz-b2b-eyebrow"></p><h2 id="cz-b2b-oem-title"></h2><p class="cz-b2b-lead"></p><ul><li class="cz-b2b-oem"></li><li class="cz-b2b-odm"></li></ul><button class="cz-b2b-contact" type="button"></button><p class="cz-b2b-note"></p></div>';
    hero.insertAdjacentElement('afterend',section);
    const text=(sel,str)=>{const elem=section.querySelector(sel);if(elem)elem.textContent=str};
    function update(){
      const lang=document.documentElement.lang?.toLowerCase().slice(0,2);
      const t=labels[lang]||labels.en;
      existing.textContent=t.wholesale;
      custom.textContent=t.custom;
      text('.cz-b2b-eyebrow',t.kicker);
      text('#cz-b2b-oem-title',t.title);
      text('.cz-b2b-lead',t.lead);
      text('.cz-b2b-oem',t.oem);
      text('.cz-b2b-odm',t.odm);
      text('.cz-b2b-contact',t.contact);
      text('.cz-b2b-note',t.note);
    }
    section.querySelector('.cz-b2b-contact').addEventListener('click',()=>{
      const live=document.getElementById('cz-live-chat');
      if (live) live.click();
      else window.location.hash='about-showroom';
    });
    new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    update();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
