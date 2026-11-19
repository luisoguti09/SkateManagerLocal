'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const N=require('../services/nombres');
function fixture(){
 const rows=[{id:38,rol:'administrador',estado:'aprobado',aprobado:true},{id:72,rol:'deportista',estado:'aprobado',aprobado:true,nombre:'DE LA CRUZ ANA MARÍA',apellido:null,nombres:null,revision:4,pago:'conciliada'}];const history=[];
 for(const r of rows)r.update=async d=>Object.assign(r,d);
 const C={Usuario:{findByPk:async id=>rows.find(r=>r.id===id),sequelize:{transaction:async fn=>{const before=rows.map(r=>({...r}));try{return await fn({LOCK:{UPDATE:1}});}catch(e){rows.forEach((r,i)=>Object.assign(r,before[i]));throw e;}}}},historial:async(...args)=>history.push(args),detalle:async u=>u};
 return {C,rows,history};
}
test('nombres compuestos conservados sin adivinar apellido',()=>{
 assert.deepEqual(N.validar({apellido:'  de la Cruz ',nombres:'Ana   María'}),{apellido:'de la Cruz',nombres:'Ana María',nombre:'de la Cruz Ana María'});
 for(const body of [{apellido:'',nombres:'Ana'},{apellido:'Cruz',nombres:''},{apellido:'A'.repeat(121),nombres:'Ana'},{apellido:'<script>',nombres:'Ana'}])assert.throws(()=>N.validar(body),e=>e.status===400);
});
test('Claudia corrige con historial sin alterar aprobación ni pago',async()=>{
 const {C,history}=fixture();const u=await N.corregir(C,38,72,{apellido:'de la Cruz',nombres:'Ana María',revision:4,rol:'administrador',aprobado:false});
 assert.equal(u.nombre,'de la Cruz Ana María');assert.equal(u.revision,5);assert.equal(u.rol,'deportista');assert.equal(u.aprobado,true);assert.equal(u.pago,'conciliada');assert.equal(history[0][1],38);assert.equal(JSON.parse(history[0][3]).anterior.nombre,'DE LA CRUZ ANA MARÍA');
});
test('otros administradores, roles y cuentas bloqueadas no pueden corregir',async()=>{
 for(const change of [{id:39},{rol:'tesoreria'},{estado:'bloqueado'},{aprobado:false}]){
 const {C,rows,history}=fixture();Object.assign(rows[0],change);
 await assert.rejects(N.corregir(C,rows[0].id,72,{apellido:'Cruz',nombres:'Ana',revision:4}),e=>e.status===403);assert.equal(rows[1].revision,4);assert.equal(history.length,0);
 }
});
test('revisión obsoleta y fallo de auditoría no dejan cambios parciales',async()=>{
 const {C,rows}=fixture();await assert.rejects(N.corregir(C,38,72,{apellido:'Cruz',nombres:'Ana',revision:3}),e=>e.status===409);
 C.historial=async()=>{throw Error('audit failed');};await assert.rejects(N.corregir(C,38,72,{apellido:'Cruz',nombres:'Ana',revision:4}));assert.equal(rows[1].nombre,'DE LA CRUZ ANA MARÍA');assert.equal(rows[1].revision,4);
});
test('migración aditiva repetible conserva la columna original',async()=>{
 const cols={nombre:{type:'VARCHAR(255)'}};const added=[];const seq={getQueryInterface:()=>({describeTable:async table=>{assert.equal(table,'Usuarios');return cols;},addColumn:async(table,key,def)=>{assert.equal(def.allowNull,true);added.push(key);cols[key]=def;}})};
 const {preparar}=require('../services/nombres-esquema');await preparar(seq);await preparar(seq);assert.deepEqual(added,['apellido','nombres']);assert.deepEqual(cols.nombre,{type:'VARCHAR(255)'});
});
test('pagos confirmados y exenciones no se mezclan; duplicados y reintegros no inflan total',()=>{
 const {filtrar,resumen}=require('../services/licencias/listado');
 const op={paymentId:'7',aprobado:true,estado:'approved',importeCentavos:11500000,reintegradoCentavos:0};
 const rows=[{licencia:{estado:'conciliada'},operaciones:[op]},{licencia:{estado:'exenta'},operaciones:[]},{licencia:null,operaciones:[]},{licencia:{estado:'requiere_revision'},operaciones:[{...op,paymentId:'8',reintegradoCentavos:100}]}];
 assert.equal(filtrar(rows,'confirmados').length,1);assert.equal(filtrar(rows,'pendientes').length,1);assert.equal(filtrar(rows,'exentos').length,1);assert.equal(filtrar(rows,'revision').length,1);assert.equal(resumen(rows).totalCentavos,11500000);assert.equal(resumen([...rows,rows[0]]).totalCentavos,11500000);assert.throws(()=>filtrar(rows,'cualquiera'),e=>e.status===400);
});
test('gráfico mensual usa fecha aprobada de Argentina y no cuenta exenciones como ingresos',()=>{
 const {resumen}=require('../services/licencias/listado');const op={paymentId:'9',aprobado:true,estado:'approved',importeCentavos:575000,reintegradoCentavos:0,fechaAprobacion:'2026-12-01T01:00:00Z'};
 const r=resumen([{licencia:{estado:'conciliada'},operaciones:[op]},{licencia:{estado:'exenta'},operaciones:[]}]);assert.deepEqual(r.porMes,[{mes:'2026-11',centavos:575000}]);assert.equal(r.totalCentavos,575000);assert.equal(r.exentos,1);
});
