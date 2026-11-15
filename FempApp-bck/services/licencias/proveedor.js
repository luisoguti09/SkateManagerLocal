'use strict';
const {fail}=require('../cuenta-reglas');
function api({env=process.env,fetcher=globalThis.fetch,receptor=require('../mercadopago/receptor').production()}={}){
 function config(){
  if(env.MP_CONNECTION_MODE!=='direct'||!/^\d+$/.test(env.MP_FEMPA_COLLECTOR_ID||''))fail(503,'Configurá la conexión directa de FEMPA.');
  if(!env.MP_LICENCIAS_WEBHOOK_SECRET?.trim())fail(503,'Falta la clave secreta del webhook de licencias.');
  const urls={front:env.FRONT_BASE_URL||env.FRONT_BASE,back:env.BACK_BASE_URL||env.BACK_BASE};
  for(const k of Object.keys(urls)){try{const u=new URL(urls[k]);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error();urls[k]=u.origin;}catch{fail(503,'Configurá FRONT_BASE_URL y BACK_BASE_URL con HTTPS.');}}
  return{...urls,collectorId:env.MP_FEMPA_COLLECTOR_ID,liveMode:true};
 }
 async function request(path,method='GET',body){
  const token=await receptor.accessToken();
  try{const r=await fetcher('https://api.mercadopago.com'+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error();return await r.json();}
  catch{fail(502,'Mercado Pago no confirmó la operación. No repitas el cobro; comprobá el estado.');}
 }
 return{config,async verificar(){config();return receptor.verify();},
  async crear(intento,temporada){const c=config();const url=c.front+'/licencia?temporada='+temporada;
   const result=await request('/checkout/preferences','POST',{items:[{id:intento.id,title:'Licencia provincial FEMPA '+temporada,quantity:1,unit_price:intento.cotizacion.totalCentavos/100,currency_id:'ARS'}],external_reference:intento.id,back_urls:{success:url,failure:url,pending:url},auto_return:'approved',notification_url:c.back+'/licencias-anuales/webhook?source_news=webhooks',expires:true,expiration_date_to:new Date(intento.vence).toISOString(),statement_descriptor:'FEMPA'});
   let u;try{u=new URL(result.init_point);}catch{fail(502,'Checkout inválido. Solicitud conservada para revisión.');}
   if(u.protocol!=='https:'||u.hostname!=='www.mercadopago.com.ar'||!result.id)fail(502,'Checkout no reconocido. Solicitud conservada para revisión.');
   return{id:String(result.id),url:u.href};
  },async renovar(id,vence){const r=await request('/checkout/preferences/'+encodeURIComponent(id),'PUT',{expires:true,expiration_date_to:new Date(vence).toISOString()});if(String(r.id)!==String(id))fail(502,'No se confirmó la renovación del checkout.');},pago:id=>request('/v1/payments/'+encodeURIComponent(id)),
  async buscar(reference){const r=await request('/v1/payments/search?external_reference='+encodeURIComponent(reference)+'&limit=100&sort=date_created&criteria=desc');if(!Array.isArray(r.results)||!Number.isInteger(r.paging?.total)||r.paging.total>r.results.length)fail(502,'La consulta de pagos requiere revisión de Tesorería.');return r.results;}
 };
}
module.exports={api};
