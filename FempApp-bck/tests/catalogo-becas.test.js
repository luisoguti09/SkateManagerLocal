'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {service:catalogo,validarDatos}=require('../services/deportes-catalogo');
const {service:becas,aplicar,validar}=require('../services/licencias/becas');
function fixture(){
 const rows=[],audits=[],users=[{id:1,rol:'deportista'},{id:2,rol:'tecnico'},{id:3,rol:'administrador'},{id:4,rol:'delegado'}];let tail=Promise.resolve();
 const model={async findByPk(nombre){return rows.find(r=>r.nombre===nombre);},async findOne(o){return rows.find(r=>Object.entries(o.where).every(([k,v])=>r[k]===v));},async findAll(){return rows;},async create(data){const row={id:rows.length+1,...data,toJSON(){const {update,toJSON,...d}=this;return structuredClone(d);},async update(d){Object.assign(this,d);return this;}};rows.push(row);return row;},sequelize:{async transaction(fn){const previous=tail;let release;tail=new Promise(r=>release=r);await previous;const before=rows.map(r=>r.toJSON()),auditBefore=audits.length;try{return await fn({LOCK:{UPDATE:'UPDATE'}});}catch(e){rows.length=0;for(const r of before)await model.create(r);audits.length=auditBefore;throw e;}finally{release();}}}};
 return{model,rows,audits,Historial:{async create(d){audits.push(d);}},Usuario:{async findByPk(id){return users.find(u=>u.id===id);}}};
}
test('catálogo: crear, editar, desactivar y auditar sin perder registros',async()=>{
 const f=fixture(),s=catalogo({Catalogo:f.model,Historial:f.Historial});
 const data={nombre:'Hockey inline',activo:true,disciplinas:[{nombre:'HOCKEY INLINE',categorias:[]}],revision:0,motivo:'Habilitar registro'};
 const row=await s.guardar(data,9);assert.equal(row.nombre,'HOCKEY INLINE');assert.equal(f.audits[0].actorId,9);
 assert.equal((await s.registro('HOCKEY INLINE')).activo,true);
 const p={deporte:'HOCKEY INLINE',disciplina:'HOCKEY INLINE',temporada:'2027'};assert.equal(await s.perfil(p),'HOCKEY INLINE');
 await assert.rejects(()=>s.perfil({...p,divisional:'A'}));await assert.rejects(()=>s.perfil({...p,categoria:'Inventada'}));
 await s.guardar({...data,nombre:row.nombre,revision:1,disciplinas:[{nombre:'HOCKEY INLINE',categorias:['Mayor']}],motivo:'Publicar categorías'},9);
 assert.equal(await s.perfil({...p,categoria:'Mayor'}),'HOCKEY INLINE');await assert.rejects(()=>s.perfil(p));
 await s.guardar({...data,nombre:row.nombre,revision:2,activo:false},9);await assert.rejects(()=>s.registro(row.nombre));assert.equal(f.rows.length,1);assert.equal(f.audits.length,3);
});
test('catálogo: revisión concurrente, rollback y validación de estructura',async()=>{
 const f=fixture(),s=catalogo({Catalogo:f.model,Historial:f.Historial}),d={nombre:'NUEVO',activo:true,disciplinas:[{nombre:'Libre',categorias:[]}],revision:0,motivo:'Crear deporte'};
 const results=await Promise.allSettled([s.guardar(d,9),s.guardar(d,10)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.audits.length,1);
 for(const extra of [{nombre:'PATINAJE ARTÍSTICO'},{disciplinas:[]},{disciplinas:[{nombre:'D',categorias:['A','a']}]},{disciplinas:[{nombre:'D',categorias:[]},{nombre:'d',categorias:[]}]}])assert.throws(()=>validarDatos({...d,...extra}));
 const bad=catalogo({Catalogo:f.model,Historial:{create:async()=>{throw Error('audit unavailable');}}});await assert.rejects(()=>bad.guardar({...d,revision:1,activo:false},9));assert.equal(f.rows[0].activo,true);
});
test('beca: temporada y persona independientes; modificar, revocar y auditar',async()=>{
 const f=fixture(),s=becas({Beca:f.model,Historial:f.Historial,Usuario:f.Usuario});
 const data={usuarioId:1,temporada:2027,porcentaje:100,activa:true,alcance:'licencia_anual',revision:0,motivo:'Exención autorizada'};
 const b=await s.guardar(data,9);assert.equal(b.revision,1);assert.equal(f.audits[0].antes,null);
 assert.equal(aplicar(13000000,b,1,2027).totalCentavos,0);assert.equal(aplicar(13000000,b,1,2027).exento,true);
 await assert.rejects(()=>s.guardar({...data,usuarioId:3},9),e=>e.status===404);
 await assert.rejects(()=>s.guardar(data,9),e=>e.status===409);
 await s.guardar({...data,revision:1,porcentaje:25},9);assert.equal(aplicar(13000000,f.rows[0],1,2027).totalCentavos,9750000);
 await s.guardar({...data,revision:2,activa:false},9);assert.equal(aplicar(13000000,f.rows[0],1,2027).totalCentavos,13000000);
 assert.equal(f.audits.length,3);await s.guardar({...data,temporada:2028},9);assert.equal(f.rows.length,2);
});
test('beca: no aplica a otra persona, temporada o eventos; redondeo entero',()=>{
 const b={id:1,usuarioId:1,temporada:2027,porcentaje:50,activa:true,alcance:'licencia_anual',revision:1};
 assert.equal(aplicar(101,b,1,2027).beneficioCentavos,51);
 assert.throws(()=>aplicar(100,b,2,2027));assert.throws(()=>aplicar(100,b,1,2028));assert.throws(()=>aplicar(100,{...b,alcance:'evento'},1,2027));
 for(const porcentaje of [0,101,0.5,'100'])assert.throws(()=>validar({...b,porcentaje,motivo:'Motivo válido'}));
 assert.equal(aplicar(100,null,1,2027).totalCentavos,100);
});
test('beca: doble envío no duplica ni sobreescribe; fallo de auditoría revierte',async()=>{
 const f=fixture(),s=becas({Beca:f.model,Historial:f.Historial,Usuario:f.Usuario}),d={usuarioId:1,temporada:2027,porcentaje:100,activa:true,alcance:'licencia_anual',revision:0,motivo:'Exención autorizada'};
 const results=await Promise.allSettled([s.guardar(d,9),s.guardar(d,10)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.rows.length,1);
 const bad=becas({Beca:f.model,Usuario:f.Usuario,Historial:{create:async()=>{throw Error('audit unavailable');}}});await assert.rejects(()=>bad.guardar({...d,revision:1,activa:false},9));assert.equal(f.rows[0].activa,true);
});
test('migración: diagnóstico sin cambios, respaldo requerido y semillas idempotentes',async()=>{
 const {migrar,columnas}=require('../scripts/migrar-catalogo-becas');
 const tables=new Set(),seeds=new Map();let writes=0;
 const c={async query(sql,args=[]){
  if(sql==='SHOW TABLES')return[[...tables].map(name=>({name}))];
  if(sql.startsWith('SHOW COLUMNS')){const name=sql.match(/`([^`]+)`/)[1];return[columnas[name].map(Field=>({Field}))];}
  if(sql.startsWith('SHOW INDEX'))return[[{Non_unique:0,Seq_in_index:1,Column_name:'usuarioId'},{Non_unique:0,Seq_in_index:2,Column_name:'temporada'}]];
  if(sql.startsWith('CREATE TABLE')){tables.add(sql.match(/`([^`]+)`/)[1]);writes++;return[{}];}
  if(sql.startsWith('INSERT INTO deportes_catalogo')){if(!seeds.has(args[0]))seeds.set(args[0],args[1]);writes++;return[{}];}
  throw Error('SQL inesperado');
 },async beginTransaction(){},async commit(){},async rollback(){}};
 await migrar(c,false,false);assert.equal(writes,0);await assert.rejects(()=>migrar(c,true,false));
 await migrar(c,true,true);assert.equal(tables.size,6);assert.equal(seeds.size,5);
 seeds.set('HOCKEY INLINE','configuración propia');await migrar(c,true,true);assert.equal(seeds.get('HOCKEY INLINE'),'configuración propia');assert.equal(seeds.size,5);
});
test('becas juntas o separadas: no traslada porcentajes y limita por evento y temporada',async()=>{
 const f=fixture(),s=becas({Beca:f.model,Historial:f.Historial,Usuario:f.Usuario});
 const d={usuarioId:1,temporada:2027,porcentaje:100,porcentajeInscripciones:25,todosEventos:false,eventos:[12,13],activa:true,alcance:'licencia_anual',revision:0,motivo:'Resolución conjunta'};
 const b=await s.guardar(d,9);
 assert.equal(aplicar(10000,b,1,2027).totalCentavos,0);
 assert.equal(aplicar(10000,b,1,2027,{tipo:'inscripcion',eventoId:12}).totalCentavos,7500);
 assert.equal(aplicar(10000,b,1,2027,{tipo:'inscripcion',eventoId:99}).totalCentavos,10000);
 assert.throws(()=>aplicar(100,b,1,2028,{tipo:'inscripcion',eventoId:12}));
 await s.guardar({...d,revision:1,porcentaje:0,porcentajeInscripciones:100},9);
 assert.equal(aplicar(10000,b,1,2027).totalCentavos,10000);
 assert.equal(aplicar(10000,b,1,2027,{tipo:'inscripcion',eventoId:12}).exento,true);
 await s.guardar({...d,revision:2,porcentajeInscripciones:0,eventos:[]},9);
 assert.equal(aplicar(10000,b,1,2027).exento,true);
 assert.equal(aplicar(10000,b,1,2027,{tipo:'inscripcion',eventoId:12}).totalCentavos,10000);
 await s.guardar({...d,revision:3,todosEventos:true,eventos:[]},9);
 assert.equal(aplicar(10000,b,1,2027,{tipo:'inscripcion',eventoId:99}).totalCentavos,7500);
 assert.equal(f.audits.length,4);assert.equal(f.audits[1].antes.porcentajeInscripciones,25);
 for(const cambio of [{porcentajeInscripciones:-1},{porcentajeInscripciones:101},{eventos:[]},{eventos:[12,12]},{eventos:['12']},{todosEventos:true}])assert.throws(()=>validar({...d,...cambio}));
});
test('Freestyle editable: categoría nueva se valida desde catálogo, no desde constante antigua',async()=>{
 const f=fixture(),s=catalogo({Catalogo:f.model,Historial:f.Historial});
 await s.guardar({nombre:'ROLLER FREESTYLE',activo:true,disciplinas:[{nombre:'STREET',categorias:['AMATEUR']}],revision:0,fuente:'Resolución de prueba',motivo:'Categoría autorizada'},9);
 assert.equal((await s.todos()).filter(d=>d.nombre==='ROLLER FREESTYLE').length,1);
 assert.equal(await s.perfil({deporte:'ROLLER FREESTYLE',disciplina:'STREET',categoria:'AMATEUR',temporada:'2027'}),'ROLLER FREESTYLE');
 await assert.rejects(()=>s.perfil({deporte:'ROLLER FREESTYLE',disciplina:'STREET',categoria:'PRO FEMENINO',temporada:'2027'}));
});
test('permisos deportivos: asignación, aislamiento, revocación, revisión y auditoría',async()=>{
 const f=fixture();f.model.findByPk=async id=>f.rows.find(r=>r.usuarioId===id);
 const p=require('../services/deportes-permisos').service({Permiso:f.model,Historial:f.Historial,Usuario:{findByPk:async id=>id===7?{id,estado:'aprobado',aprobado:true}:null},Catalogo:{findByPk:async d=>['STREET LUGE','ROLLER FREESTYLE'].includes(d)?{nombre:d}:null}});
 const d={usuarioId:7,deportes:['STREET LUGE'],revision:0,motivo:'Presidenta deportes urbanos'};
 await p.guardar(d,9);const a=await p.acceso({id:7,rol:'tecnico'});p.permitir(a,'STREET LUGE');assert.throws(()=>p.permitir(a,'ROLLER FREESTYLE'),e=>e.status===403);assert.throws(()=>p.permitir(a,'PATINAJE ARTÍSTICO'));
 assert.equal((await p.acceso({id:7,rol:'administrador'})).general,true);
 await assert.rejects(()=>p.guardar(d,9),e=>e.status===409);
 await assert.rejects(()=>p.guardar({...d,revision:1,deportes:['PATINAJE ARTÍSTICO']},9));
 await p.guardar({...d,revision:1,deportes:[]},9);assert.equal((await p.acceso({id:7,rol:'tecnico'})).deportes.length,0);assert.equal(f.audits.length,2);
});

test('becas: técnicas y delegados reciben beneficio anual buscados por cuenta',async()=>{
 const f=fixture(),s=becas({Beca:f.model,Historial:f.Historial,Usuario:f.Usuario});for(const usuarioId of [2,4]){const b=await s.guardar({usuarioId,temporada:2027,porcentaje:100,porcentajeInscripciones:0,activa:true,alcance:'licencia_anual',revision:0,motivo:'Licencia nacional vigente'},9);assert.equal(aplicar(3000000,b,usuarioId,2027).exento,true);assert.equal(b.porcentajeInscripciones,0);}
});
