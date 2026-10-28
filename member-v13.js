/* CARATZON V13: real Supabase auth. Checkout is deliberately disabled unless verified server endpoint is ready. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const overlay=$('memberOverlay'),form=$('memberForm'),checkout=$('checkout'),button=$('memberBtn');
if(!overlay||!form||!checkout)return;
const copy={
ru:{login:'Войти',register:'Регистрация',reset:'Восстановить пароль',account:'Аккаунт',lead:'Войдите, чтобы оформить заказ.',create:'Создать аккаунт',signin:'Уже есть аккаунт?',forgot:'Забыли пароль?',logout:'Выйти',send:'Отправить ссылку',submit:'Войти',signup:'Зарегистрироваться',confirm:'Проверьте вашу почту и подтвердите адрес.',sent:'Ссылка отправлена, проверьте почту.',locked:'Войдите в аккаунт, чтобы оформить заказ.',backend:'Оформление заказов будет доступно после подключения защищённого сервера.',unconfigured:'Система входа ещё не настроена.',orderok:'Заказ получен. Ожидает подтверждения, оплата не произведена.',unpaid:'Оплата не производится на сайте.'},
en:{login:'Sign in',register:'Create account',reset:'Reset password',account:'Account',lead:'Sign in to place an order.',create:'Create account',signin:'Already have an account?',forgot:'Forgot password?',logout:'Sign out',send:'Send reset link',submit:'Sign in',signup:'Sign up',confirm:'Check your inbox and verify your email address.',sent:'A reset link has been sent. Check your email.',locked:'Sign in before placing your order.',backend:'Checkout will be available when the secure order server is connected.',unconfigured:'Member sign-in has not been configured yet.',orderok:'Order received, pending confirmation. No payment taken.',unpaid:'No payment will be charged on this site.'},
zh:{login:'登录',register:'注册账户',reset:'重置密码',account:'会员账户',lead:'登录后才能提交订单。',create:'创建账户',signin:'已有账户？',forgot:'忘记密码？',logout:'退出登录',send:'发送重置邮件',submit:'登录',signup:'注册',confirm:'请检查邮箱并完成验证。',sent:'重置链接已发送，请检查邮箱。',locked:'请先登录会员账户，再提交订单。',backend:'安全订单服务器尚未连接，暂时不能提交订单。',unconfigured:'会员登录服务尚未配置。',orderok:'订单已收到，待确认，未扣款。',unpaid:'本网站不会即时扣款。'}};
const language=()=>{let x=document.documentElement.lang||'ru';return x.startsWith('zh')?'zh':x.startsWith('en')?'en':'ru'};
const tr=k=>copy[language()][k];
const cfg=window.CARATZON_AUTH_CONFIG||{};
const ready=typeof cfg.url==='string'&&/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.url)&&typeof cfg.publishableKey==='string'&&cfg.publishableKey.length>20&&window.supabase?.createClient;
const client=ready?window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}}):null;
let current=null,mode='login',busy=false;
const showMessage=(msg,isError=false)=>{const el=$('memberMessage');el.textContent=msg;el.style.color=isError?'#a44738':'#6f5a4f'};
function paint(){const signed=!!current;button.textContent=signed?(current.email||tr('account')):tr('login');$('memberTitle').textContent=signed?tr('account'):(mode==='register'?tr('register'):mode==='reset'?tr('reset'):tr('login'));
 $('memberLead').textContent=signed?(current.email||''):tr('lead');form.hidden=signed&&mode!=='recovery';$('memberPasswordLabel').hidden=mode==='reset';$('memberPassword').hidden=mode==='reset';$('memberPassword').required=mode!=='reset';$('memberSubmit').textContent=mode==='register'?tr('signup'):mode==='reset'?tr('send'):mode==='recovery'?'Update password':tr('submit');$('memberSwitch').textContent=mode==='login'?tr('create'):tr('signin');$('memberReset').textContent=tr('forgot');$('memberReset').hidden=mode==='reset'||signed;$('memberSwitch').hidden=signed;$('memberLogout').hidden=!signed;$('memberLogout').textContent=tr('logout');
 if(!client&&!signed)showMessage(tr('unconfigured'),true);
 // Never trust the browser alone for checkout permission: backend must re-check JWT.
 const panel=$('memberCheckoutLock');if(panel){panel.querySelector('span').textContent=!signed?tr('locked'):tr('backend');panel.querySelector('button').hidden=signed;panel.querySelector('button').textContent=tr('login');}
}
function open(modeWanted){mode=modeWanted||'login';overlay.hidden=false;document.body.style.overflow='hidden';paint();$('memberEmail').focus()}
function close(){overlay.hidden=true;document.body.style.overflow=''}
button.addEventListener('click',()=>open());$('memberClose').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
$('memberSwitch').onclick=()=>{mode=mode==='login'?'register':'login';showMessage('');paint()};$('memberReset').onclick=()=>{mode='reset';showMessage('');paint()};
$('memberLogout').onclick=async()=>{if(client){const {error}=await client.auth.signOut();if(error){showMessage(error.message,true);return}}current=null;mode='login';paint();close()};
form.onsubmit=async e=>{e.preventDefault();if(busy)return;if(!client){showMessage(tr('unconfigured'),true);return}busy=true;$('memberSubmit').disabled=true;try{
 const email=$('memberEmail').value.trim(),password=$('memberPassword').value;let result;
 if(mode==='recovery'){result=await client.auth.updateUser({password});if(!result.error){showMessage('Password updated. You can now sign in.');mode='login'}}
 else if(mode==='register'){result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(!result.error)showMessage(tr('confirm'))}
 else if(mode==='reset'){result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(!result.error)showMessage(tr('sent'))}
 else{result=await client.auth.signInWithPassword({email,password});if(!result.error){current=result.data.user;close()}}
 if(result.error)showMessage(result.error.message,true);
 }catch(err){showMessage(err.message||String(err),true)}finally{busy=false;$('memberSubmit').disabled=false;paint()}};
const lock=document.createElement('div');lock.className='member-order-lock';lock.id='memberCheckoutLock';lock.innerHTML='<span></span><button type="button"></button>';lock.querySelector('button').onclick=()=>open();
checkout.prepend(lock);
const submitButton=$('submitBtn');
if(submitButton)submitButton.disabled=true;
// Override legacy FormSubmit handler. This is a UX control only; the Edge Function enforces auth independently.
checkout.onsubmit=async e=>{
 e.preventDefault();e.stopImmediatePropagation();
 if(!current){open();$('submitMsg').textContent=tr('locked');return}
 if(!client){$('submitMsg').textContent=tr('unconfigured');return}
 if(!checkout.reportValidity())return;
 const session=(await client.auth.getSession()).data.session;
 if(!session){current=null;paint();open();return}
 if(typeof products==='undefined'||!Array.isArray(products)){$('submitMsg').textContent=tr('backend');return}
 const lines=products.filter(p=>cart[p.sku]>0).map(p=>({sku:p.sku,quantity:cart[p.sku]}));if(!lines.length)return;
 const f=checkout.elements;
 const payload={items:lines,name:f.customer_name.value.trim(),contact:f.contact.value.trim(),notes:f.notes.value.trim(),shipping:{country:f.shipping_country.value,city:f.shipping_city.value,region:f.shipping_region.value,address:f.shipping_address.value,postal:f.shipping_postal.value}};
 try{$('submitMsg').textContent='...';const {data,error}=await client.functions.invoke('place-order',{body:payload});if(error)throw error;if(!data?.success)throw Error(data?.error||'Order not accepted');$('submitMsg').textContent=tr('orderok')+' #'+data.order_id;$('submitMsg').style.color='#38734e';cart={};saveCart();checkout.reset()}
 catch(err){$('submitMsg').textContent=tr('backend')+' '+(err?.message||'');$('submitMsg').style.color='#a44738'}
};
// Older app.js periodically disables button based on cart content. Preserve hard lock until backend and sign-in configured.
const unlockWhenReady=()=>{const backendReady=!!client&&!!current;if(submitButton)submitButton.disabled=!backendReady||!products.some(p=>cart[p.sku]>0)};
const obs=new MutationObserver(()=>{if(submitButton&&!client&& !submitButton.disabled)submitButton.disabled=true});if(submitButton)obs.observe(submitButton,{attributes:true,attributeFilter:['disabled']});
$('cartItems')&&new MutationObserver(()=>{if(client)unlockWhenReady()}).observe($('cartItems'),{childList:true,subtree:false});
// Allow signed-in checkout only when auth configured and signed in; backend still authenticates request.
if(client){client.auth.onAuthStateChange((event,session)=>{current=session?.user||null;if(event==='PASSWORD_RECOVERY'){mode='recovery';open('recovery')}paint();unlockWhenReady()});client.auth.getUser().then(({data,error})=>{current=error?null:data.user;paint();unlockWhenReady()}).catch(()=>{current=null;paint()});}
$('langBtn')?.addEventListener('click',()=>setTimeout(paint,0));
paint();
})();
