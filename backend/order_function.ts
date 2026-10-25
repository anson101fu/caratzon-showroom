// Supabase Edge Function: POST /functions/v1/caratzon-order
// Requires environment secret SERVICE_ROLE_KEY automatically in Supabase runtime.
// Set RESEND_API_KEY, ORDER_FROM_EMAIL, ORDER_TO_EMAIL to enable automatic email.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, apikey, authorization'};
serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return new Response('Method Not Allowed',{status:405,headers:cors});
 try{
  const b=await req.json();
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||typeof b.contact!=='string'||!b.contact.trim()||b.contact.length>180||!Array.isArray(b.items)||b.items.length<1||b.items.length>120)throw Error('Invalid order');
  const items=b.items.map(x=>({sku:String(x.sku||'').slice(0,80),quantity:Number(x.quantity),unit_cny:Number(x.unit_cny)}));
  if(items.some(x=>!x.sku||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>9999||!Number.isFinite(x.unit_cny)||x.unit_cny<0))throw Error('Invalid item');
  const fx=Number(b.rate);if(!Number.isFinite(fx)||fx<=0)throw Error('Invalid rate');
  const total=Number(b.total_rub);if(!Number.isFinite(total)||total<0)throw Error('Invalid total');
  const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data,error}=await supabase.from('caratzon_orders').insert({customer_name:b.name.trim(),contact:b.contact.trim(),notes:String(b.notes||'').slice(0,800),items,total_rub:total,exchange_rate:fx}).select('id').single();
  if(error)throw Error('Database rejected order');
  let emailSent=false;
  const api=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('ORDER_FROM_EMAIL'),to=Deno.env.get('ORDER_TO_EMAIL');
  if(api&&from&&to){
   const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${api}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject:`caratzon.com order ${data.id}`,text:`Customer: ${b.name}\nContact: ${b.contact}\nItems: ${JSON.stringify(items)}\nTotal RUB: ${total}\nOrder: ${data.id}`})});emailSent=r.ok;
  }
  return Response.json({success:true,id:data.id,email_sent:emailSent},{headers:cors});
 }catch(e){return Response.json({success:false,error:'Could not accept order'},{status:400,headers:cors});}
});
