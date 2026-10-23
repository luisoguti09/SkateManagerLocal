'use strict';
// HTTP real, JWT/bcrypt/sharp reales; modelos DB sustituidos en memoria.
// No reemplaza probar migración, bloqueos y transacciones en MySQL.
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),os=require('node:os'),fs=require('node:fs/promises');
const Module=require('node:module');
const jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs'),sharp=require('sharp'),express=require('express');
const {Op}=require('sequelize');
const R=require('../services/cuenta-reglas');
process.env.JWT_SECRET='fempa-tests-private-key-0123456789';
process.env.MAIL_DATA_KEY='12'.repeat(32);process.env.FRONTEND_URL='https://fempa.example';
process.env.API_PUBLIC_URL='https://api.fempa.example';process.env.MAIL_FROM='test@example.org';
process.env.MAIL_ENABLED='false';delete process.env.RAILWAY_ENVIRONMENT_ID;
const all=[];
function match(row,where={}){
 return Reflect.ownKeys(where).every(k=>{
  if(k===Op.or)return where[k].some(w=>match(row,w));
  const v=where[k],r=row[k];
  if(v && typeof v==='object' && !(v instanceof Date))return Reflect.ownKeys(v).every(op=>op===Op.ne?r!==v[op]:op===Op.gt?r>v[op]:op===Op.lt?r<v[op]:op===Op.lte?r<=v[op]:op===Op.like?String(r).includes(v[op].replaceAll('%','')):false);
  return v===null?r==null:String(r)===String(v);
 });
}
function model(name){
 const rows=[];
 const M={rows,name,sequelize:null,async create(data){const r={id:rows.length+1,revision:0,sessionVersion:0,createdAt:new Date(),intentos:0,...data};r.update=async function(d){Object.assign(this,d);return this;};r.save=async()=>r;r.toJSON=()=>Object.fromEntries(Object.entries(r).filter(([k,v])=>typeof v!=='function'));rows.push(r);return r;},async findByPk(id){return rows.find(r=>String(r.id)===String(id)) || null;},async findOne(o={}){return rows.find(r=>match(r,o.where)) || null;},async findAll(o={}){return rows.filter(r=>match(r,o.where));},async findAndCountAll(o){const rows=await M.findAll(o);return{rows,count:rows.length};},async update(data,o){let n=0;for(const r of rows)if(match(r,o.where)){await r.update(data);n++;}return[n];}};
 all.push(M);return M;
}
const U=model('Usuario'),H=model('CuentaHistorial'),Q=model('CuentaCorreo'),Reset=model('CuentaReset'),Rol=model('Rol'),Padron=model('Padron'),Club=model('Club');
const transaction=async fn=>{
 const snapshots=all.map(m=>({m,rows:[...m.rows],values:m.rows.map(r=>({...r}))}));
 try{return await fn({LOCK:{UPDATE:'UPDATE'}});}catch(e){for(const x of snapshots){x.m.rows.splice(0,x.m.rows.length,...x.rows);x.rows.forEach((r,i)=>{for(const k of Object.keys(r))delete r[k];Object.assign(r,x.values[i]);});}throw e;}
};
for(const m of all)m.sequelize={transaction};
const load=Module._load;
Module._load=function(request,parent,isMain){
 const map={'usuario.model':U,'cuentahistorial.model':H,'cuentacorreo.model':Q,'cuentareset.model':Reset,'rol.model':Rol,'padron.model':Padron,'club.model':Club};
 const key=path.basename(request).replace(/\.js$/,'');
 if(map[key])return map[key];return load.call(this,request,parent,isMain);
};
test('Flujo de cuentas, permisos, archivos y correo',async t=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'fempa-cuentas-'));process.env.DATA_DIR=temp;
 const C=require('../services/cuenta'),F=require('../services/cuenta-archivos'),Mail=require('../services/cuenta-correo');
 const {verifyToken}=require('../middleware/auth.middleware');
 const app=express();app.use(express.json());app.use('/auth',require('../routes/auth.router'));app.use('/cuenta',require('../routes/cuenta.router'));app.use('/documentacion',require('../routes/documentacion.router'));
 app.post('/negocio',verifyToken,(_req,res)=>res.json({ok:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const password=await bcrypt.hash('Mi contraseña de prueba',10);
 const admin=await U.create({nombre:'Admin',email:'admin@example.org',dni:'10000001',rol:'administrador',rolId:2,estado:'aprobado',aprobado:true,password});
 const user=await U.create({club:'Giol',nombre:'Atleta',edad:20,email:'atleta@example.org',dni:'10000002',rol:'deportista',rolId:1,estado:'pendiente',aprobado:false,password});
 const other=await U.create({nombre:'Otro',dni:'10000003',email:'otro@example.org',estado:'pendiente',rol:'deportista',rolId:1,password});
 await Club.create({nombre:'Giol',activo:true});
 await Rol.create({id:1,nombre:'deportista'});await Rol.create({id:2,nombre:'administrador'});
 const token=u=>jwt.sign({id:u.id,sv:u.sessionVersion},process.env.JWT_SECRET,{expiresIn:'1h'});
 const call=async(method,url,u,body)=>{
   const response=await fetch(base+url,{method,headers:{...(u?{Authorization:'Bearer '+(typeof u==='string'?u:token(u))}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
   const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return{status:response.status,data};
 };
 try{
 await t.test('administración filtra por club en el servidor',async()=>{
  const r=await call('GET','/cuenta/admin/usuarios?club=Giol&estado=pendiente',admin);
  assert.equal(r.status,200);assert.deepEqual(r.data.usuarios.map(x=>x.id),[user.id]);
  assert.equal(r.data.total,1);assert.equal(r.data.usuarios[0].club,'Giol');
  assert.equal((await call('GET','/cuenta/admin/usuarios?club=Inexistente',admin)).data.total,0);
  assert.equal((await call('GET','/cuenta/admin/usuarios?club=Giol',user)).status,403);
 });
 await t.test('roles separados: juez registra y accede como juez, tesorería envía sin foto',async()=>{
  await Rol.create({id:3,nombre:'tecnico'});await Rol.create({id:4,nombre:'juez'});
  const r=await call('POST','/auth/register',null,{nombre:'Juez nuevo',edad:35,email:'juez@example.org',dni:'22223333',password:'Contraseña123',rolId:4});
  assert.equal(r.status,201);assert.equal(r.data.usuario.rol,'juez');assert.equal(r.data.rolId,4);
  const juez=await U.findByPk(r.data.usuario.id);assert.equal(juez.solicitaLicenciaProvincial,false);
  // Model substitute doesn't run bcrypt hook; provide the real hash for login.
  juez.password=password;
  const login=await call('POST','/auth/login',null,{email:juez.email,password:'Mi contraseña de prueba'});
  assert.equal(login.status,200);assert.equal(login.data.usuario.rol,'juez');
  const politica=(await C.detalle(juez)).politicaDocumentos;
  assert.deepEqual(politica,{visibles:['fotoPerfil'],obligatorios:['fotoPerfil']});
  const tes=await U.create({nombre:'Tes',edad:30,dni:'33334444',email:'tes@example.org',rol:'tesoreria',rolId:5,estado:'pendiente'});
  const f=new FormData();f.append('datos',JSON.stringify({nombre:tes.nombre,edad:30,revision:0}));
  const envio=await fetch(base+'/cuenta/mia/enviar',{method:'POST',headers:{Authorization:'Bearer '+token(tes)},body:f});
  assert.equal(envio.status,200);assert.equal((await envio.json()).solicitudEnviada,true);
  assert.equal(tes.fotoPerfil,undefined);
  const P=require('../services/cuenta-documentos');
  assert.throws(()=>P.validarArchivos(tes,{dniFrente:[{}]}),e=>e.status===400);
  assert.deepEqual(P.politica({rol:'tecnico'}).visibles,['fotoPerfil','certificadoAntecedentes']);
 });
 await t.test('club: cuenta actual prevalece sobre padrón antiguo y no abre otros clubes',async()=>{
  const {filtrar}=require('../services/alcance-evaluaciones');
  const padron=[{id:1,documentoN:'12.345.678',club:'A'},{id:2,documentoN:'22222222',club:'A'},{id:3,documentoN:'33333333',club:'B'}];
  const cuentas=[{dni:'12345678',rol:'deportista',estado:'aprobado',club:'B'}];
  assert.deepEqual(filtrar(padron,cuentas,'A').map(p=>p.id),[2]);
  assert.deepEqual(filtrar(padron,cuentas,'B').map(p=>p.id),[1,3]);
 });
 await t.test('sesión pendiente válida, datos propios y sin password',async()=>{
  const r=await call('POST','/auth/login',null,{email:user.email,password:'Mi contraseña de prueba'});assert.equal(r.status,200);assert.ok(r.data.token);assert.equal(r.data.usuario.estado,'pendiente');assert.equal(r.data.usuario.password,undefined);
  assert.equal((await call('GET','/cuenta/mia',user)).status,200);
 });
 await t.test('pendiente no puede operar ni revisar como administrador',async()=>{
  assert.equal((await call('POST','/negocio',user)).status,403);assert.equal((await call('GET','/cuenta/admin/usuarios',user)).status,403);assert.equal((await call('GET','/cuenta/mia')).status,401);
 });
 await t.test('no puede consultar documentos de otra cuenta',async()=>{assert.equal((await call('GET',`/cuenta/${other.id}/archivo/dniFrente`,user)).status,403);assert.equal((await call('PUT',`/documentacion/${other.id}`,user,{})).status,403);});
 await t.test('no puede otorgarse rol ni aprobación desde su perfil',async()=>{const r=await call('PATCH','/cuenta/mia',user,{revision:user.revision,nombre:'Atleta',rol:'administrador',aprobado:true,estado:'aprobado'});assert.equal(r.status,200);assert.equal(user.rol,'deportista');assert.equal(user.estado,'pendiente');assert.equal(user.aprobado,false);});
 await H.create({usuarioId:user.id,accion:'enviado'});
 await t.test('solicitar correcciones exige motivo y campos',async()=>{
  const body={revision:user.revision,estado:'requiere_correcciones'};assert.equal((await call('PATCH',`/cuenta/admin/usuarios/${user.id}/estado`,admin,body)).status,400);
  const r=await call('PATCH',`/cuenta/admin/usuarios/${user.id}/estado`,admin,{...body,motivo:'La foto no se ve correctamente.',campos:['fotoPerfil']});assert.equal(r.status,200);assert.equal(user.estado,'requiere_correcciones');assert.equal(Q.rows.at(-1).tipo,'requiere_correcciones');assert.ok(Q.rows.at(-1).payload);assert.ok(!Q.rows.at(-1).payload.includes(user.email));
 });
 await t.test('revisión obsoleta no cambia el estado',async()=>{assert.equal((await call('PATCH',`/cuenta/admin/usuarios/${user.id}/estado`,admin,{revision:-1,estado:'bloqueado',motivo:'Suspensión de prueba.'})).status,409);});
 await t.test('reenviar requiere completar la foto',async()=>{assert.equal((await call('POST','/cuenta/mia/reenviar',user,{revision:user.revision})).status,400);});
 await t.test('imagen se reescribe, persiste y la reemplazada se elimina',async()=>{
   const buffer=await sharp({create:{width:40,height:40,channels:3,background:'#37a'}}).png().toBuffer();
   await F.guardar(user.id,{fotoPerfil:[{buffer,size:buffer.length}]},user.id);const old=user.fotoPerfil;
   assert.equal(await F.existe(old,'fotoPerfil'),true);
   await F.guardar(user.id,{fotoPerfil:[{buffer,size:buffer.length}],dniFrente:[{buffer,size:buffer.length}]},user.id);
   assert.equal(await F.existe(old,'fotoPerfil'),false);assert.equal(await F.existe(user.fotoPerfil,'fotoPerfil'),true);assert.equal(await F.existe(user.dniFrente,'dniFrente'),true);
   assert.equal(path.dirname(F.fullpath(user.dniFrente,'dniFrente')),path.join(temp,'privado'));
   assert.equal((await call('GET',`/cuenta/${user.id}/archivo/dniFrente`,user)).status,200);
 });
 await t.test('rechaza falsos JPG y rutas fuera del volumen',async()=>{
   const buffer=Buffer.from('<script>bad</script>');await assert.rejects(()=>F.guardar(user.id,{dniDorso:[{buffer,size:buffer.length}]},user.id),e=>e.status===400);
   assert.equal(F.fullpath('../../etc/passwd','dniFrente'),null);
 });
 await t.test('DNI opcional por política y obligatorio para licencia provincial',async()=>{
  user.solicitaLicenciaProvincial=true;assert.equal((await call('POST','/cuenta/mia/reenviar',user,{revision:user.revision})).status,400);
  process.env.REQUIRE_DNI_DOCUMENTS='false';assert.equal((await call('POST','/cuenta/mia/reenviar',user,{revision:user.revision})).status,200);assert.equal(user.estado,'pendiente');
  process.env.REQUIRE_DNI_DOCUMENTS='true';user.solicitaLicenciaProvincial=false;user.dniDorso=user.dniFrente;
 });
 await t.test('aprobar genera historial y aviso; habilita negocio',async()=>{
  const r=await call('PATCH',`/cuenta/admin/usuarios/${user.id}/estado`,admin,{estado:'aprobado',revision:user.revision,motivo:''});assert.equal(r.status,200);assert.equal(user.aprobado,true);assert.equal(Q.rows.at(-1).tipo,'aprobado');assert.ok(H.rows.some(h=>h.usuarioId===user.id && h.estado==='aprobado'));
  assert.equal((await call('POST','/negocio',user)).status,200);
 });
 await t.test('bloquear corta una sesión ya emitida',async()=>{
  const issued=token(user);assert.equal((await call('PATCH',`/cuenta/admin/usuarios/${user.id}/estado`,admin,{estado:'bloqueado',revision:user.revision,motivo:'Suspensión de prueba.'})).status,200);
  assert.equal((await call('POST','/negocio',issued)).status,403);assert.equal((await call('GET','/cuenta/mia',issued)).status,403);
 });
 await t.test('admin no puede bloquearse a sí mismo',async()=>{assert.equal((await call('PATCH',`/cuenta/admin/usuarios/${admin.id}/estado`,admin,{estado:'bloqueado',revision:admin.revision,motivo:'Suspensión de prueba.'})).status,400);});
 await t.test('recuperación genérica, token cifrado y uso único',async()=>{
  const missing=await call('POST','/auth/forgot-password',null,{email:'nadie@example.org'}),exists=await call('POST','/auth/forgot-password',null,{email:other.email});assert.deepEqual(missing,exists);
  const row=Q.rows.find(x=>x.tipo==='reset'),payload=Mail.unseal(row.payload);assert.equal(Reset.rows.at(-1).tokenHash,R.hashToken(payload.token));assert.ok(!row.payload.includes(payload.token));
  const issued=token(other);assert.equal((await call('POST','/auth/reset-password',null,{token:payload.token,password:'Mi nueva contraseña 123'})).status,200);assert.ok(await bcrypt.compare('Mi nueva contraseña 123',other.password));
  assert.equal((await call('GET','/cuenta/mia',issued)).status,401);assert.equal((await call('POST','/auth/reset-password',null,{token:payload.token,password:'Mi nueva contraseña 123'})).status,400);
 });
 await t.test('token vencido no cambia contraseña',async()=>{
  const token='a'.repeat(64);await Reset.create({usuarioId:other.id,tokenHash:R.hashToken(token),venceAt:new Date(Date.now()-1000)});assert.equal((await call('POST','/auth/reset-password',null,{token,password:'Mi nueva contraseña 123'})).status,400);
 });
 await t.test('alta pública administrador siempre pendiente y sin token',async()=>{
  const r=await call('POST','/auth/register',null,{nombre:'Nuevo Admin',edad:30,email:'nuevo@example.org',dni:'20000000',password:'Una contraseña extensa 1',rolId:2});assert.equal(r.status,201);assert.equal(r.data.usuario.aprobado,false);assert.equal(r.data.usuario.estado,'pendiente');assert.equal(r.data.token,undefined);
 });
 await t.test('correo conserva aprobación ante error y reintenta sin enviar realmente',async()=>{
  const originalFetch=global.fetch;const row=Q.rows.find(r=>r.tipo==='aprobado');row.estado='pendiente';row.disponibleAt=new Date(0);for(const q of Q.rows)if(q!==row)q.estado='enviado';process.env.MAIL_ENABLED='true';
  global.fetch=async()=>({ok:false,status:503});try{await Mail.tick();assert.equal(row.estado,'pendiente');assert.equal(row.error,'OAUTH_503');assert.equal(row.intentos,1);assert.equal(user.estado,'bloqueado');
  row.disponibleAt=new Date(0);global.fetch=async(url)=>url.includes('oauth2')?{ok:true,json:async()=>({access_token:'test'})}:{ok:true};await Mail.tick();assert.equal(row.estado,'enviado');assert.equal(row.payload,null);
 
 }finally{global.fetch=originalFetch;process.env.MAIL_ENABLED='false';}
 });
 await t.test('contraseñas cortas y bcrypt truncado no se admiten',()=>{assert.equal(R.passwordValida('123'),false);assert.equal(R.passwordValida('á'.repeat(40)),false);assert.equal(R.passwordValida('Una frase de prueba segura'),false);assert.equal(R.passwordValida('Abcdefg1'),true);assert.equal(R.passwordValida('Abcdef1'),false);assert.equal(R.passwordValida('12345678'),false);assert.equal(R.passwordValida('ábcdefg1'),true);assert.equal(R.passwordValida('a'.repeat(71)+'1'),true);assert.equal(R.passwordValida('a'.repeat(72)+'1'),false);});
 await t.test('envío único: clubes, borrador, DNI por rol, rollback y reintento',async()=>{
  const nuevo=await U.create({nombre:'Nueva',edad:21,club:'Giol',dni:'12345678',email:'nueva@example.org',rol:'deportista',estado:'pendiente'});
  const imagen=await sharp({create:{width:20,height:20,channels:3,background:'#fff'}}).png().toBuffer();
  const enviar=async(datos,keys=[])=>{
    const f=new FormData();f.append('datos',JSON.stringify(datos));
    for(const key of keys)f.append(key,new Blob([imagen],{type:'image/png'}),key+'.png');
    const r=await fetch(base+'/cuenta/mia/enviar',{method:'POST',headers:{Authorization:'Bearer '+token(nuevo)},body:f});return {status:r.status,data:await r.json()};
  };
  assert.equal((await call('GET','/cuenta/clubes',nuevo)).data[0].nombre,'Giol');
  assert.equal((await call('GET','/cuenta/mia',nuevo)).data.etapaSolicitud,'Por completar');
  assert.equal((await call('PATCH',`/cuenta/admin/usuarios/${nuevo.id}/estado`,admin,{estado:'aprobado',revision:nuevo.revision})).status,409);
  const datos={nombre:'Nueva',edad:21,club:'Giol',revision:0,solicitaLicenciaProvincial:false,categoria:'IGNORAR'};
  const before=await fs.readdir(path.join(temp,'privado'));
  assert.equal((await enviar(datos,['fotoPerfil','dniFrente'])).status,400);
  assert.deepEqual(await fs.readdir(path.join(temp,'privado')),before);
  assert.equal(nuevo.revision,0);assert.equal(nuevo.fotoPerfil,undefined);
  assert.equal((await enviar({...datos,club:'Inventado'},['fotoPerfil','dniFrente','dniDorso'])).status,400);
  const count=Q.rows.length;
  const result=await enviar(datos,['fotoPerfil','dniFrente','dniDorso']);assert.equal(result.status,200);assert.equal(result.data.solicitudEnviada,true);assert.equal(result.data.etapaSolicitud,'En revisión');assert.equal(nuevo.solicitaLicenciaProvincial,true);assert.equal(nuevo.categoria,undefined);
  assert.equal(Q.rows.length,count+1);
  assert.equal((await enviar(datos)).status,200);assert.equal(Q.rows.length,count+1);
  assert.equal((await call('PATCH','/cuenta/mia',nuevo,{revision:nuevo.revision,nombre:'Cambio'})).status,409);
  const rev=await call('PATCH',`/cuenta/admin/usuarios/${nuevo.id}/estado`,admin,{estado:'requiere_correcciones',revision:nuevo.revision,motivo:'Completá el teléfono',campos:['telefono']});assert.equal(rev.status,200);
  assert.equal((await enviar({...datos,revision:nuevo.revision})).status,400);
  assert.equal((await enviar({...datos,revision:nuevo.revision,telefono:'2611234567'})).status,200);
  assert.equal(Q.rows.at(-1).tipo,'reenviado');
 });
 await t.test('administrador no requiere DNI; aprobación no emite licencia ni pago',async()=>{
  const a=await U.create({nombre:'Admin nuevo',edad:22,dni:'11112222',email:'admin2@example.org',rol:'administrador',estado:'pendiente'});
  const imagen=await sharp({create:{width:20,height:20,channels:3,background:'#fff'}}).png().toBuffer();
  const f=new FormData();f.append('datos',JSON.stringify({nombre:a.nombre,edad:22,revision:0}));f.append('fotoPerfil',new Blob([imagen],{type:'image/png'}),'foto.png');
  const r=await fetch(base+'/cuenta/mia/enviar',{method:'POST',headers:{Authorization:'Bearer '+token(a)},body:f});assert.equal(r.status,200);const d=await r.json();assert.equal(d.requiereDni,false);assert.equal(d.solicitaLicenciaProvincial,false);assert.equal(a.aprobado,false);
 });
 await t.test('antecedentes: edad cumplida, carga privada, renovación y permisos',async()=>{
  const P=require('../services/cuenta-documentos');
  assert.equal(P.edadCumplida('2010-10-24','2026-10-23'),15);
  assert.equal(P.edadCumplida('2010-10-23','2026-10-23'),16);
  assert.equal(P.edadCumplida('2010-02-30'),null);
  const tec=await U.create({nombre:'Técnica',email:'tec@example.org',dni:'44556677',rol:'tecnico',club:'Giol',fechaNacimiento:'2000-01-01',estado:'aprobado',aprobado:true});
  const segunda=await U.create({rol:'tecnico',club:'Giol',estado:'aprobado',aprobado:true});
  const tes=await U.create({rol:'tesoreria',estado:'aprobado',aprobado:true});
  const juez=await U.create({rol:'juez',estado:'aprobado',aprobado:true});
  const renovar=async(u,revision,bytes=Buffer.from('%PDF-1.4\n%%EOF'))=>{
   const f=new FormData();f.append('revision',String(revision));f.append('certificadoAntecedentes',new Blob([bytes],{type:'application/pdf'}),'certificado.pdf');
   return fetch(base+'/cuenta/mia/certificado-antecedentes',{method:'POST',headers:{Authorization:'Bearer '+token(u)},body:f});
  };
  await assert.rejects(()=>C.completa(tec),/certificado de antecedentes/);
  assert.equal((await renovar(tec,0)).status,200);
  assert.equal(tec.estado,'aprobado');assert.equal(tec.documentacionAprobada,false);
  assert.equal((await C.detalle(tec)).documentos.certificadoAntecedentes,true);
  assert.equal(R.perfil({certificadoAntecedentes:'forged.pdf'}).certificadoAntecedentes,undefined);
  assert.equal(R.safe(tec).certificadoAntecedentes,undefined);
  const url='/cuenta/'+tec.id+'/archivo/certificadoAntecedentes';
  for(const forbidden of [segunda,tes,juez,user,null])assert.equal((await call('GET',url,forbidden)).status,forbidden?403:401);
  assert.equal((await call('GET',url,tec)).status,200);assert.equal((await call('GET',url,admin)).status,200);
  assert.equal(H.rows.filter(h=>h.usuarioId===tec.id && h.accion==='certificado_antecedentes_consultado').length,2);
  const old=tec.certificadoAntecedentes,files=await fs.readdir(path.join(temp,'privado'));
  assert.equal((await renovar(tec,0)).status,409);
  assert.deepEqual(await fs.readdir(path.join(temp,'privado')),files);
  assert.equal((await renovar(tec,tec.revision,Buffer.from('<html>malicioso</html>'))).status,400);
  assert.equal((await renovar(tec,tec.revision)).status,200);assert.equal(await F.existe(old,'certificadoAntecedentes'),false);
  assert.equal((await renovar(tes,tes.revision)).status,403);
  // New technical application must include the certificate and a valid date.
  const nueva=await U.create({nombre:'Nueva técnica',email:'newtec@example.org',dni:'55667788',rol:'tecnico',club:'Giol',estado:'pendiente',fechaNacimiento:'2000-01-01'});
  const image=await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer();
  const submit=async(cert)=>{const f=new FormData();f.append('datos',JSON.stringify({nombre:nueva.nombre,club:'Giol',revision:0,fechaNacimiento:'2000-01-01'}));f.append('fotoPerfil',new Blob([image],{type:'image/png'}),'foto.png');if(cert)f.append('certificadoAntecedentes',new Blob([Buffer.from('%PDF-1.4\n%%EOF')],{type:'application/pdf'}),'cert.pdf');return fetch(base+'/cuenta/mia/enviar',{method:'POST',headers:{Authorization:'Bearer '+token(nueva)},body:f});};
  assert.equal((await submit(false)).status,400);assert.equal((await submit(true)).status,200);
 });
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));Module._load=load;await fs.rm(temp,{recursive:true,force:true});}
});
