'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken');
process.env.JWT_SECRET='solo-pruebas-locales-catalogo';
const users=[{id:1,rol:'administrador'},{id:2,rol:'delegado'},{id:3,rol:'deportista'},{id:4,rol:'tesoreria'}].map(u=>({...u,estado:'aprobado',aprobado:true,sessionVersion:0}));
const permisos=new Map([[2,{usuarioId:2,deportes:['STREET LUGE'],revision:1}]]);
let writes=0;
const cats=[{nombre:'STREET LUGE',activo:true,revision:0,disciplinas:[{nombre:'STREET LUGE',categorias:['MASCULINO','FEMENINO']}],toJSON(){return{...this};},async update(d){Object.assign(this,d);writes++;return this;}}];
const Catalogo={findByPk:async n=>cats.find(c=>c.nombre===n),findAll:async()=>cats,sequelize:{transaction:async fn=>fn({LOCK:{UPDATE:'UPDATE'}})}};
require.cache[require.resolve('../models/usuario.model')]={exports:{findByPk:async id=>users.find(u=>u.id===Number(id)),findAll:async()=>users}};
require.cache[require.resolve('../models/deportecatalogo.model')]={exports:{Catalogo,Historial:{create:async()=>{},findAll:async()=>[]}}};
require.cache[require.resolve('../models/deportepermiso.model')]={exports:{Permiso:{findByPk:async id=>permisos.get(id)},Historial:{}}};
require.cache[require.resolve('../services/cuenta')]={exports:{wrap:fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>res.status(e.status||500).json({error:e.message}))}};
const app=express();app.use(express.json());app.use('/catalogo',require('../routes/deportes-catalogo.router'));
let server,base;
after(()=>server?.close());
async function request(path,id,body){
 if(!server){server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;}
 const token=id?jwt.sign({id,sv:0,rol:'administrador'},process.env.JWT_SECRET,{expiresIn:'1h'}):null;
 const r=await fetch(base+'/catalogo'+path,{method:body?'PUT':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()};
}
test('HTTP: JWT con rol falso no amplía permisos; cuentas aprobadas sin concesión no administran',async()=>{
 assert.equal((await request('/')).status,200);
 assert.equal((await request('/administracion')).status,401);
 for(const id of [3,4])assert.equal((await request('/administracion',id)).status,403);
 const allowed=await request('/administracion',2);assert.equal(allowed.status,200);assert.deepEqual(allowed.data.map(d=>d.nombre),['STREET LUGE']);
 assert.equal((await request('/usuarios?buscar=Ana',2)).status,403);
 assert.equal((await request('/permisos/1',2)).status,403);
 assert.equal((await request('/permisos',2,{usuarioId:2,deportes:['HOCKEY INLINE']})).status,403);
 const data={nombre:'HOCKEY INLINE',activo:true,revision:0,disciplinas:[{nombre:'HOCKEY INLINE',categorias:[]}],motivo:'Cambiar catálogo ajeno'};
 assert.equal((await request('/',2,data)).status,403);assert.equal(writes,0);
 assert.equal((await request('/',2,{...data,nombre:'STREET LUGE',disciplinas:cats[0].disciplinas})).status,200);assert.equal(writes,1);
 permisos.delete(2);assert.equal((await request('/administracion',2)).status,403);assert.equal((await request('/',2,{...data,nombre:'STREET LUGE',revision:1})).status,403);
 users[0].estado='bloqueado';assert.equal((await request('/administracion',1)).status,403);
});
