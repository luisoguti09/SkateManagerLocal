'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {service} = require('../services/mercadopago/receptor');
const env = () => ({MP_CONNECTION_MODE:'direct', MP_FEMPA_ACCESS_TOKEN:'APP_USR-test-only-secret', MP_FEMPA_COLLECTOR_ID:'1847379019'});
test('directo: valida receptor sin revelar credenciales ni habilitar cobros', async()=>{
  const s=service({env:env(),provider:{me:async token=>{assert.equal(token,env().MP_FEMPA_ACCESS_TOKEN);return{id:1847379019,site_id:'MLA',nickname:'FEMPA'};}}});
  const result=await s.status(1);assert.equal(result.connected,true);assert.equal(result.cobrosHabilitados,false);
  assert.ok(!JSON.stringify(result).includes('secret'));assert.equal(result.connectionMode,'direct');
  assert.equal(await s.accessToken(1),env().MP_FEMPA_ACCESS_TOKEN);
  assert.equal((await s.verify(1)).connected,true);
});
test('directo: otra cuenta, otro país y usuarios de prueba no conectan',async()=>{
  for(const user of [{id:282036974,site_id:'MLA'},{id:1847379019,site_id:'MLB'},{id:1847379019,site_id:'MLA',tags:['test_user']}]){
    const s=service({env:env(),provider:{me:async()=>user}});
    assert.equal((await s.status()).connected,false);await assert.rejects(()=>s.verify());await assert.rejects(()=>s.accessToken());
  }
});
test('directo: token ausente o de prueba no consulta proveedor',async()=>{
  for(const token of ['', 'TEST-123', 'APP_USR-invalid with spaces']){
    const s=service({env:{...env(),MP_FEMPA_ACCESS_TOKEN:token},provider:{me:()=>{throw Error('no debe llamarse');}}});
    assert.equal((await s.status()).configured,false);await assert.rejects(()=>s.accessToken());
  }
});
test('directo: credencial revocada limpia estado y no filtra errores sensibles',async()=>{
  let valid=true;
  const s=service({env:env(),provider:{me:async()=>{if(!valid)throw Error(env().MP_FEMPA_ACCESS_TOKEN);return{id:1847379019,site_id:'MLA'};}}});
  assert.equal((await s.status()).connected,true);valid=false;
  const failed=await s.status();assert.equal(failed.connected,false);assert.ok(!JSON.stringify(failed).includes('secret'));
  await assert.rejects(()=>s.accessToken(),e=>!e.message.includes('secret'));
});
test('directo: no procesa tickets OAuth previos',async()=>{
  const s=service({env:env()});
  for(const action of ['begin','pending','confirm','callback'])await assert.rejects(()=>s[action](),e=>e.status===409);
});
test('OAuth se conserva por defecto; modo desconocido no cambia receptor',async()=>{
  const s=service({env:{},oauth:{status:async()=>({connected:true}),accessToken:async()=> 'oauth-token',begin:async()=>({url:'oauth-url'})}});
  assert.equal((await s.status()).connectionMode,'oauth');assert.equal(await s.accessToken(),'oauth-token');assert.equal((await s.begin()).url,'oauth-url');
  await assert.rejects(()=>service({env:{MP_CONNECTION_MODE:'typo'}}).status(),e=>e.status===503);
});
