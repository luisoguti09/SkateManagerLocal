'use strict';
const crypto=require('node:crypto');
const P=require('./propuesta');
// Dos hitos por fecha y destinatario, independientes de la cantidad de reinicios.
function pendientes(datos,hoy=P.hoyArgentina()){
 if(datos.correoTesoreria!==true)return [];
 return P.alertas(datos,hoy).map(a=>({...a,temporada:datos.temporada,etapa:a.dias<0?'vencido':'previo'}));
}
function clave(usuarioId,a){return crypto.createHash('sha256').update(JSON.stringify([usuarioId,a.temporada,a.tipo,a.fecha,a.etapa])).digest('hex');}
async function procesar({Config,Aviso,Usuario,encolar},hoy=P.hoyArgentina()){
 const rows=await Config.findAll({order:[['id','ASC']]});let cantidad=0;
 for(const row of rows){
  if(row.datos.correoTesoreria!==true)continue;
  await Config.sequelize.transaction(async t=>{
   const actual=await Config.findByPk(row.id,{transaction:t,lock:t.LOCK.UPDATE});
   if(!actual)return;
   const avisos=pendientes(actual.datos,hoy);if(!avisos.length)return;
   const usuarios=await Usuario.findAll({where:{rol:'tesoreria',estado:'aprobado',aprobado:true},attributes:['id','email'],transaction:t});
   for(const u of usuarios)for(const aviso of avisos){
    const k=clave(u.id,aviso);if(await Aviso.findByPk(k,{transaction:t}))continue;
    await Aviso.create({clave:k,usuarioId:u.id,temporada:row.id},{transaction:t});
    await encolar(u,'licencia_config_aviso',t,{aviso});cantidad++;
   }
  });
 }return cantidad;
}
async function vigente(usuarioId,payload){
 const Usuario=require('../../models/usuario.model'),{Config}=require('../../models/licenciaconfiguracion.model');
 const u=await Usuario.findByPk(usuarioId),a=payload.aviso;
 if(!u||u.rol!=='tesoreria'||u.estado!=='aprobado'||!u.aprobado||u.email!==payload.email||!a)return false;
 const row=await Config.findByPk(a.temporada);
 return !!row&&pendientes(row.datos).some(p=>p.tipo===a.tipo&&p.fecha===a.fecha&&p.etapa===a.etapa);
}
let running=false;
async function tick(){
 if(running||process.env.MAIL_ENABLED!=='true')return;
 running=true;
 try{await procesar({...require('../../models/licenciaconfiguracion.model'),Aviso:require('../../models/licenciaaviso.model'),Usuario:require('../../models/usuario.model'),encolar:require('../cuenta-correo').encolar});}
 catch(e){console.error('[LICENCIAS_AVISOS] No se pudieron preparar los recordatorios. Revisar migración y correo.');}
 finally{running=false;}
}
function start(){const timer=setInterval(tick,3600000);timer.unref();void tick();return timer;}
module.exports={pendientes,clave,procesar,vigente,tick,start};
