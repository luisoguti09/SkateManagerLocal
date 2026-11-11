'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
test('migración OAuth: diagnóstico no escribe, exige respaldo y repetir conserva conexión',async()=>{
 let writes=0,closed=0;const rows=new Map();const db={getQueryInterface:()=>({showAllTables:async()=>[]}),close:async()=>closed++};
 const model=name=>({tableName:name,sync:async options=>{assert.equal(options,undefined);writes++;}});
 const Connection={...model('mp_oauth_conexiones'),findOrCreate:async({where,defaults})=>{if(!rows.has(where.id))rows.set(where.id,{...where,...defaults});return[rows.get(where.id),false];}};
 const original=Module._load;Module._load=function(request,parent,isMain){if(request.endsWith('mercadopago-oauth.model'))return{db,Connection,Attempt:model('mp_oauth_intentos'),Audit:model('mp_oauth_historial')};return original.call(this,request,parent,isMain);};
 const argv=process.argv;
 try{const{main}=require('../scripts/migrar-mercadopago-oauth');process.argv=['node','script'];await main();assert.equal(writes,0);process.argv.push('--aplicar');await assert.rejects(main());assert.equal(writes,0);process.argv.push('--respaldo-verificado');await main();rows.get('fempa').tokens='existing-encrypted';rows.get('fempa').revision=3;await main();assert.equal(writes,6);assert.equal(rows.get('fempa').tokens,'existing-encrypted');assert.equal(rows.get('fempa').revision,3);assert.equal(closed,4);}finally{Module._load=original;process.argv=argv;}
});
