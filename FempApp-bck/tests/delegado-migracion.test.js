'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const cambios=[],cols={rol:{type:"ENUM('administrador','tecnico','deportista','juez','tesoreria')",allowNull:false,defaultValue:'deportista'},rolSolicitado:{type:"ENUM('administrador','tecnico','deportista','juez','tesoreria')",allowNull:true,defaultValue:null}};
let rol=null,config=null,syncs=0;
const db={getQueryInterface:()=>({describeTable:async()=>cols,changeColumn:async(table,campo,data)=>{cambios.push({table,campo,data});cols[campo].type="ENUM("+data.type.values.map(x=>"'"+x+"'").join(',')+")";}}),close:async()=>{}};
require.cache[require.resolve('../config/database')]={exports:db};
require.cache[require.resolve('../models/rol.model')]={exports:{findOrCreate:async()=>{rol ||= {id:9,nombre:'delegado'};return [rol];}}};
require.cache[require.resolve('../models/licenciaconfiguracion.model')]={exports:{Config:{sync:async options=>{assert.equal(options,undefined);syncs++;},findOrCreate:async({defaults})=>{config ||= defaults;return [config];}},Audit:{sync:async options=>{assert.equal(options,undefined);syncs++;}}}};
const {main}=require('../scripts/migrar-delegado');
test('migración aditiva: diagnóstico no escribe, exige respaldo y repetir conserva propuesta',async()=>{
 const argv=process.argv;try{
 process.argv=['node','script'];await main();assert.equal(cambios.length,0);assert.equal(syncs,0);assert.equal(rol,null);
 process.argv.push('--aplicar');await assert.rejects(main(),/respaldo/);assert.equal(cambios.length,0);
 process.argv.push('--respaldo-verificado');await main();assert.equal(cambios.length,2);assert.equal(rol.id,9);assert.equal(config.datos.tramos[0].importe,115000);
 assert.ok(cambios[0].data.type.values.includes('juez'));assert.ok(cambios[0].data.type.values.includes('delegado'));
 config.datos=structuredClone(config.datos);config.datos.tramos[0].importe=120000;await main();assert.equal(cambios.length,2);assert.equal(config.datos.tramos[0].importe,120000);
 }finally{process.argv=argv;}
});
