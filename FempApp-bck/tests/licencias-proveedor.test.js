'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {api}=require('../services/licencias/proveedor');
const env={MP_CONNECTION_MODE:'direct',MP_FEMPA_COLLECTOR_ID:'1847379019',MP_LICENCIAS_WEBHOOK_SECRET:'local-test',FRONT_BASE_URL:'https://frontend.test',BACK_BASE_URL:'https://backend.test'};
test('proveedor: env y receptor, preferencia con monto exacto, referencia, retorno y webhook dedicado',async()=>{
 let sent;const provider=api({env,receptor:{accessToken:async()=>'token-local',verify:async()=>({connected:true})},fetcher:async(url,o)=>{sent={url,...o};return{ok:true,json:async()=>({id:'pref',init_point:'https://www.mercadopago.com.ar/checkout/v1/test'})};}});
 await provider.crear({id:'reference',vence:new Date('2026-11-14T20:00:00Z'),cotizacion:{totalCentavos:5850000}},2027);
 const b=JSON.parse(sent.body);assert.equal(sent.url,'https://api.mercadopago.com/checkout/preferences');assert.equal(b.items[0].unit_price,58500);assert.equal(b.external_reference,'reference');assert.equal(b.notification_url,'https://backend.test/licencias-anuales/webhook?source_news=webhooks');assert.equal(b.back_urls.success,'https://frontend.test/licencia?temporada=2027');assert.equal(b.expires,true);assert.equal(b.marketplace_fee,undefined);
 assert.throws(()=>api({env:{...env,MP_LICENCIAS_WEBHOOK_SECRET:''},receptor:{}}).config());assert.throws(()=>api({env:{...env,BACK_BASE_URL:'http://unsafe'},receptor:{}}).config());
});
test('proveedor: no expone secreto ante error, no sigue redirects y rechaza búsqueda truncada',async()=>{
 const p=api({env,receptor:{accessToken:async()=>'secreto'},fetcher:async(_url,opts)=>{assert.equal(opts.redirect,'error');throw Error('secreto');}});await assert.rejects(()=>p.pago('123'),e=>e.status===502&&!e.message.includes('secreto'));
 const p2=api({env,receptor:{accessToken:async()=>'local'},fetcher:async()=>({ok:true,json:async()=>({paging:{total:2},results:[{id:1}]})})});await assert.rejects(()=>p2.buscar('r'),e=>e.status===502);
});
