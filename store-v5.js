
/* CARATZON V5 — order submission without taking payment.
   Requires existing app.js data and configuration. No order is 'paid' here. */
(() => {
const words = {
ru:{shipping:"Доставка и контактные данные",country:"Страна доставки *",city:"Город *",region:"Регион / область",address:"Адрес доставки *",postal:"Почтовый индекс *",shippingNote:"Стоимость и сроки доставки подтвердит менеджер перед оплатой.",paymentTitle:"Способ оплаты",paymentPending:"Онлайн-оплата временно недоступна — заказ без списания средств",totalNote:"Итог в корзине не включает доставку. Окончательная сумма будет подтверждена до оплаты.",consent:"Я понимаю, что оформление заказа не является оплатой; менеджер подтвердит наличие, доставку и способ оплаты.",submit:"Оформить заказ (без оплаты)",sending:"Отправляем заказ...",success:"Заказ отправлен. Оплата не произведена. Мы свяжемся с вами для подтверждения наличия, доставки и оплаты.",fail:"Не удалось отправить заказ. Попробуйте ещё раз. Заказ не подтверждён."},
en:{shipping:"Shipping and contact details",country:"Shipping country *",city:"City *",region:"State / region",address:"Shipping address *",postal:"Postal code *",shippingNote:"Shipping cost and timing will be confirmed before payment.",paymentTitle:"Payment method",paymentPending:"Online payment is not available yet — no money will be charged",totalNote:"The cart estimate excludes shipping. Final total will be confirmed before payment.",consent:"I understand placing this order is not payment. Availability, shipping and payment will be confirmed.",submit:"Place order (no payment)",sending:"Sending order...",success:"Order submitted. No payment has been made. We will contact you to confirm stock, delivery and payment.",fail:"Order could not be sent. Please retry. The order is not confirmed."},
zh:{shipping:"收货及联络资料",country:"配送国家 *",city:"城市 *",region:"地区 / 省份",address:"收货地址 *",postal:"邮政编码 *",shippingNote:"运费及送货时间会在付款前确认。",paymentTitle:"付款方式",paymentPending:"暂未开通在线支付，不会扣款",totalNote:"购物袋金额未包含运费，最终金额会在付款前确认。",consent:"我明白提交订单并不代表已付款，商品库存、运费及支付方式须进一步确认。",submit:"提交订单（暂不付款）",sending:"正在提交订单...",success:"订单已提交，但尚未付款。我们将联系您确认库存、运费及付款方式。",fail:"订单未能提交，请重试；订单尚未确认。"}
};
const form=document.getElementById('checkout'),button=document.getElementById('submitBtn'),status=document.getElementById('submitMsg');
if(!form||!button)return;
const langNow=()=>['ru','en','zh'].includes(localStorage.getItem('caratzon-lang'))?localStorage.getItem('caratzon-lang'):'ru';
const refresh=()=>{const w=words[langNow()];document.querySelectorAll('[data-store]').forEach(n=>{n.textContent=w[n.dataset.store]||''});button.textContent=w.submit;document.querySelector('.tiny[data-t="noPayment"]')?.replaceChildren(document.createTextNode(w.paymentPending));};
refresh();
document.getElementById('langBtn')?.addEventListener('click',()=>setTimeout(refresh,0));
/* app.js uses form.onsubmit; replace only that handler while retaining catalog/cart behaviour */
form.onsubmit=async function(event){
event.preventDefault();
const w=words[langNow()];
if(!form.reportValidity())return;
const chosen=products.filter(p=>cart[p.sku]>0);
if(!chosen.length){status.textContent=w.fail;return;}
const originalAmount=chosen.reduce((n,p)=>n+cart[p.sku]*(cart[p.sku]>=30&&p.wholesale>0?p.wholesale:p.retail),0);
if(!Number.isFinite(originalAmount)||originalAmount<=0){status.textContent=w.fail;return;}
const details=chosen.map(p=>`${p.sku} | ${p.zh} | qty=${cart[p.sku]} | unit_CNY=${cart[p.sku]>=30?p.wholesale:p.retail}`).join('\n');
const delivery={country:form.elements.shipping_country.value,city:form.elements.shipping_city.value,region:form.elements.shipping_region.value,address:form.elements.shipping_address.value,postal:form.elements.shipping_postal.value};
button.disabled=true;button.textContent=w.sending;status.textContent='';
try{
 const payload=new FormData(form);
 payload.set('order_details',details);
 payload.set('order_total_rub',rate>0?String(Math.round(originalAmount*rate)):'Pending conversion');
 payload.set('exchange_rate',rate>0?`1 CNY = ${rate} RUB (${rateDate||'date unavailable'})`:'Not available');
 payload.append('total_cny_before_shipping',String(originalAmount));
 payload.append('shipping_fee','TO BE CONFIRMED');
 payload.append('order_status','PENDING_CONFIRMATION');
 payload.append('payment_status','UNPAID - PAYMENT METHOD NOT CONNECTED');
 payload.append('submitted_at',new Date().toISOString());
 payload.append('_subject','CARATZON online store order - UNPAID');
 payload.append('_template','table');
 let res;
 if(window.CARATZON_ORDER_API){
  res=await fetch(window.CARATZON_ORDER_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   name:form.elements.customer_name.value, contact:form.elements.contact.value, notes:form.elements.notes.value,
   shipping:delivery,payment_status:'UNPAID',order_status:'PENDING_CONFIRMATION',
   items:chosen.map(p=>({sku:p.sku,quantity:cart[p.sku],unit_cny:cart[p.sku]>=30?p.wholesale:p.retail})),
   rate,total_rub:rate>0?Math.round(originalAmount*rate):null,total_cny:originalAmount,shipping_fee:null
  })});
 }else{
  res=await fetch('https://formsubmit.co/ajax/anson.fu101@gmail.com',{method:'POST',headers:{Accept:'application/json'},body:payload});
 }
 const result=await res.json();
 if(!res.ok||!(result.success===true||result.success==='true'))throw new Error(result.message||'Order submission not acknowledged');
 status.style.color='#316348';
 status.textContent=w.success+(result.id?' #'+result.id:'');
 cart={};saveCart();form.reset();
}catch(err){
 console.error('CARATZON online order submission failed',err);
 status.style.color='#a33b35';status.textContent=w.fail;
}finally{button.textContent=w.submit;button.disabled=!products.some(p=>cart[p.sku]>0);}
};
})();
