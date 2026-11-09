/* CARATZON member login add-on. Requires window.CARATZON_SUPABASE_CONFIG set by member-auth-config.js. */
(() => {
  'use strict';
  const root = document.createElement('div');
  root.id = 'caratzon-member-root';
  root.innerHTML = `<style>
  #caratzonMemberButton{font:600 12px/1.3 Arial,sans-serif;background:transparent;border:1px solid #bec3be;padding:9px 12px;border-radius:4px;cursor:pointer;color:#243129;white-space:nowrap}
  #caratzonMemberButton:hover{background:#eef0ed}
  #caratzonMemberOverlay[hidden]{display:none!important}
  #caratzonMemberOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.48);display:grid;place-items:center;padding:16px}
  #caratzonMemberDialog{background:#fff;color:#263329;border-radius:8px;max-width:390px;width:100%;padding:25px;box-shadow:0 16px 50px #0003;font:14px/1.5 Arial,sans-serif;box-sizing:border-box}
  #caratzonMemberDialog h2{font:28px/1.2 Georgia,serif;margin:0 0 18px}
  #caratzonMemberDialog label{display:block;font-size:12px;margin:12px 0 5px}
  #caratzonMemberDialog input{box-sizing:border-box;width:100%;font:14px Arial,sans-serif;padding:12px;border:1px solid #ccc;border-radius:3px}
  #caratzonMemberDialog button{cursor:pointer}
  .cm-primary{background:#34463b;color:#fff;border:0;padding:12px 20px;width:100%;margin-top:16px}
  .cm-link{background:transparent;border:0;color:#34463b;text-decoration:underline;margin-top:12px}
  .cm-close{float:right;border:0;background:transparent;font-size:24px;line-height:1}
  #caratzonMemberMessage{font-size:12px;min-height:18px;margin-top:10px;overflow-wrap:anywhere}
  </style><div id="caratzonMemberOverlay" hidden><section id="caratzonMemberDialog" role="dialog" aria-modal="true" aria-labelledby="caratzonMemberTitle"><button type="button" class="cm-close" id="caratzonMemberClose" aria-label="Close">×</button><h2 id="caratzonMemberTitle">Member login</h2><form id="caratzonMemberForm"><label for="caratzonMemberEmail">Email</label><input id="caratzonMemberEmail" type="email" required autocomplete="email"/><label for="caratzonMemberPassword">Password (min. 6 characters)</label><input id="caratzonMemberPassword" type="password" required minlength="6" autocomplete="current-password"/><button id="caratzonMemberSubmit" class="cm-primary" type="submit">Sign in</button></form><button id="caratzonMemberSwitch" type="button" class="cm-link">Create account</button><button id="caratzonMemberSignout" type="button" class="cm-link" hidden>Sign out</button><p id="caratzonMemberMessage" role="status"></p></section></div>`;
  document.body.appendChild(root);
  const q = id => document.getElementById(id);
  const actions = document.querySelector('.header .actions') || document.querySelector('.actions') || document.querySelector('header');
  const btn = document.createElement('button');btn.id='caratzonMemberButton';btn.type='button';btn.textContent='Login / Register';actions?.prepend(btn);
  const overlay=q('caratzonMemberOverlay'), message=q('caratzonMemberMessage');
  const conf=() => window.CARATZON_SUPABASE_CONFIG || {};
  const valid=() => {const c=conf();return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.url||'') && /^sb_publishable_|^eyJ/.test(c.anonKey||'')};
  const base=()=>conf().url.replace(/\/$/,'');
  const tokenKey='caratzon_member_session_v1';
  const session=()=>{try{return JSON.parse(localStorage.getItem(tokenKey)||'null')}catch{return null}};
  const setSession=s=>{if(s)localStorage.setItem(tokenKey,JSON.stringify({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:Date.now()+Number(s.expires_in||3600)*1000,email:s.user?.email||''}));else localStorage.removeItem(tokenKey);update()};
  const update=()=>{const s=session(); const logged=Boolean(s?.access_token&&s.expires_at>Date.now());btn.textContent=logged?'Account / Logout':'Login / Register';q('caratzonMemberSignout').hidden=!logged;q('caratzonMemberForm').hidden=logged;q('caratzonMemberSwitch').hidden=logged; if(logged)message.textContent='Signed in: '+(s.email||'member')};
  const open=()=>{overlay.hidden=false;document.body.style.overflow='hidden';update();if(!valid())message.textContent='Login not connected yet. Add your Supabase Project URL and publishable key to member-auth-config.js.';else if(!session())message.textContent='';};
  const close=()=>{overlay.hidden=true;document.body.style.overflow=''};
  btn.addEventListener('click',open);q('caratzonMemberClose').addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
  let mode='login';q('caratzonMemberSwitch').addEventListener('click',()=>{mode=mode==='login'?'signup':'login';q('caratzonMemberTitle').textContent=mode==='signup'?'Create account':'Member login';q('caratzonMemberSubmit').textContent=mode==='signup'?'Register':'Sign in';q('caratzonMemberSwitch').textContent=mode==='signup'?'Already registered? Sign in':'Create account';message.textContent=''});
  q('caratzonMemberForm').addEventListener('submit',async e=>{e.preventDefault();if(!valid()){message.textContent='Supabase is not configured yet.';return}const submit=q('caratzonMemberSubmit');submit.disabled=true;message.textContent='Connecting...';try{const email=q('caratzonMemberEmail').value.trim(),password=q('caratzonMemberPassword').value;const u=mode==='signup'?'/auth/v1/signup':'/auth/v1/token?grant_type=password';const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);let resp;try{resp=await fetch(base()+u,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','apikey':conf().anonKey},body:JSON.stringify({email,password})})}finally{clearTimeout(timer)}const data=await resp.json();if(!resp.ok)throw Error(data.msg||data.error_description||data.message||'Authentication failed');if(data.access_token){setSession(data);message.textContent='Signed in.';q('caratzonMemberPassword').value='';}else{message.textContent='Registered. Please check your email for a confirmation link, then sign in.';mode='login';q('caratzonMemberSubmit').textContent='Sign in';q('caratzonMemberSwitch').textContent='Create account'}}catch(err){message.textContent=err.name==='AbortError'?'Connection timed out. Try again.':err.message}finally{submit.disabled=false}});
  q('caratzonMemberSignout').addEventListener('click',()=>{setSession(null);message.textContent='Signed out.'});update();
})();
