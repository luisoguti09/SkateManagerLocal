const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('predeploy prepara columnas antes de consultar usuarios en roles, también al repetir',async()=>{
 const cols={estado:{type:"ENUM('requiere_correcciones')"}};let consultas=0;
 for(let run=0;run<2;run++){
  let close;const done=new Promise(r=>close=r);const proc={exitCode:0};
  const qi={describeTable:async()=>cols,addColumn:async(t,k,d)=>{cols[k]=d;},showIndex:async()=>[],addIndex:async()=>{}};
  const seq={authenticate:async()=>{},getQueryInterface:()=>qi,close:async()=>close()};
  const req=n=>{
   if(n==='dotenv')return {config(){}};
   if(n==='sequelize')return require('sequelize');
   if(n.includes('config/database'))return seq;
   if(n.includes('usuario.model'))return {getTableName:()=> 'Usuarios'};
   if(n.includes('nombres-esquema'))return require('../services/nombres-esquema');
   if(n==='./migrar-roles')return {migrar:async()=>{assert.ok(cols.apellido,'Unknown column apellido');assert.ok(cols.nombres,'Unknown column nombres');consultas++;}};
   return {sync:async()=>{}};
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../scripts/migrar-cuentas.js'),'utf8'),{require:req,console:{log(){},error(){}},process:proc});
  await done;assert.equal(proc.exitCode,0);assert.equal(consultas,run+1);
 }
});
