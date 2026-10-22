const {test}=require('node:test');const assert=require('node:assert/strict');const Module=require('node:module');
const rows=[{id:11,email:'naty@gmail.com',rol:'tecnico',rolId:3,estado:'aprobado',aprobado:true,sessionVersion:2,revision:5},{id:15,email:'otra-persona@example.org',rol:'tecnico',rolId:3,estado:'pendiente',aprobado:false,sessionVersion:0,revision:0},{id:8,email:'luisoguti09@gmail.com',rol:'administrador',rolId:2,estado:'aprobado',aprobado:true,sessionVersion:0,revision:0}];
rows.forEach(u=>u.update=async data=>Object.assign(u,data));let changes=0;const history=[];
const columns={rol:{type:"ENUM('administrador','tecnico','deportista','tesoreria')"},rolSolicitado:{type:'VARCHAR(255)'}};
const db={getQueryInterface:()=>({describeTable:async()=>columns,changeColumn:async()=>{changes++;columns.rol.type="ENUM('administrador','tecnico','juez','deportista','tesoreria')";}}),transaction:async fn=>fn({LOCK:{UPDATE:1}})};
const load=Module._load;Module._load=function(req,parent,isMain){
 if(req.endsWith('/rol.model'))return {findByPk:async id=>({nombre:id===3?'tecnico':'juez'})};
 if(req.endsWith('/usuario.model'))return {findByPk:async id=>rows.find(u=>u.id===id)};
 if(req.endsWith('/cuentahistorial.model'))return {create:async data=>history.push(data)};
 return load.call(this,req,parent,isMain);
};
test('migración conserva estado, invalida sesión, verifica identidad y es repetible',async()=>{
 const {migrar}=require('../scripts/migrar-roles');await migrar(db);await migrar(db);
 assert.equal(changes,1);assert.equal(history.length,1);
 assert.equal(rows[0].rol,'juez');assert.equal(rows[0].rolId,4);assert.equal(rows[0].sessionVersion,3);assert.equal(rows[0].revision,6);
 assert.equal(rows[0].estado,'aprobado');assert.equal(rows[0].aprobado,true);
 assert.equal(rows[1].rol,'tecnico');assert.equal(rows[2].rol,'administrador');
});
