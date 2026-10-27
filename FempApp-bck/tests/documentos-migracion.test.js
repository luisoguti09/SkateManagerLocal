'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
const added=[],synced=new Set();let finished;
const columns={estado:{type:"ENUM('pendiente','requiere_correcciones','aprobado','bloqueado')"}};
for(const k of ['certificadoAntecedentes','sessionVersion','revision','correcciones','camposCorregir','solicitaLicenciaProvincial'])columns[k]={};
const qi={describeTable:async()=>columns,addColumn:async(table,name,def)=>{assert.equal(table,'Usuarios');assert.equal(def.allowNull,true);added.push(name);columns[name]=def;},changeColumn:async()=>assert.fail('No cambiar estado'),showIndex:async()=>[{name:'cuenta_historial_usuario'},{name:'cuenta_correo_pendientes'},{name:'cuenta_reset_usuario'}]};
const db={authenticate:async()=>{},getQueryInterface:()=>qi,close:async()=>finished()};
const original=Module._load;
Module._load=function(req,parent,isMain){const key=path.basename(req).replace(/\.js$/,'');if(req==='dotenv')return {config:()=>{}};if(key==='database')return db;if(key==='usuario.model')return {getTableName:()=> 'Usuarios'};if(key==='migrar-roles')return {migrar:async()=>{}};if(['documentoaviso.model','cuentahistorial.model','cuentacorreo.model','cuentareset.model'].includes(key))return {sync:async opts=>{assert.equal(opts,undefined);synced.add(key);}};return original.call(this,req,parent,isMain);};
test('migración documental agrega nullable una sola vez y no recrea Usuarios',async()=>{
 try{for(let i=0;i<2;i++){const done=new Promise(r=>finished=r);delete require.cache[require.resolve('../scripts/migrar-cuentas')];require('../scripts/migrar-cuentas');await done;}
 assert.deepEqual(added.sort(),['certificadoAntecedentesFecha','certificadoWada','fichaMedicaFecha','wadaFecha']);assert.ok(synced.has('documentoaviso.model'));
 }finally{Module._load=original;}
});
