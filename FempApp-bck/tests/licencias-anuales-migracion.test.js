'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {migrar,columnas}=require('../scripts/migrar-licencias-anuales');
test('migración anual: exige respaldo y esquema previo, es repetible y no inserta pagos',async()=>{
 const names=new Set(['Usuarios','licencias_becas','licencias_configuracion']);let writes=0;
 const c={async query(sql,args){if(sql==='SHOW TABLES')return[[...names].map(name=>({name}))];const name=sql.match(/`([^`]+)`/)?.[1];if(sql.startsWith('SHOW COLUMNS'))return[[...columnas[name],'createdAt','updatedAt'].map(Field=>({Field}))];if(sql.startsWith('SHOW INDEX'))return[({licencias_anuales:['usuarioId','temporada'],licencias_intentos:['licenciaId'],licencias_operaciones:['paymentId']}[name]||[]).map((Column_name,i)=>({Column_name,Seq_in_index:i+1,Non_unique:0}))];if(sql.startsWith('CREATE TABLE IF NOT EXISTS')){names.add(name);writes++;return[{}];}throw Error('SQL inesperado');}};
 await migrar(c);assert.equal(writes,0);await assert.rejects(()=>migrar(c,true,false));await migrar(c,true,true);await migrar(c,true,true);assert.equal(names.size,7);assert.equal(writes,8);
 names.delete('licencias_becas');await assert.rejects(()=>migrar(c,true,true));
});
