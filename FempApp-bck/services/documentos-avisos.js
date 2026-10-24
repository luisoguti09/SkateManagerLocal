'use strict';
const {Op}=require('sequelize');
const V=require('./documentos-vigencia');
function hito(dias){return dias<0?'vencido':dias<=7?'7':dias<=30?'30':null;}
let running=false;
async function tick(){
 if(running||process.env.MAIL_ENABLED!=='true')return;
 running=true;
 try{
  const U=require('../models/usuario.model'),A=require('../models/documentoaviso.model');
  let ultimo=0;
  for(;;){
   const rows=await U.findAll({where:{id:{[Op.gt]:ultimo},rol:'deportista',estado:'aprobado'},attributes:['id','email','fichaMedica','fichaMedicaFecha','certificadoWada','wadaFecha'],order:[['id','ASC']],limit:100});
   if(!rows.length)break;
   for(const row of rows){
    ultimo=row.id;
    await U.sequelize.transaction(async t=>{
     const u=await U.findByPk(row.id,{transaction:t,lock:t.LOCK.UPDATE});
     if(!u||u.estado!=='aprobado'||u.rol!=='deportista')return;
     for(const d of V.resumen(u)){
      if(d.dias===null||!await require('./cuenta-archivos').existe(u[d.campo],d.campo))continue;const etapa=hito(d.dias);if(!etapa)continue;
      const clave=`${u.id}:${d.campo}:${d.expedicion}:${etapa}`;
      if(await A.findByPk(clave,{transaction:t}))continue;
      await A.create({clave,usuarioId:u.id},{transaction:t});
      await require('./cuenta-correo').encolar(u,'vencimiento_documental',t,{documento:d.campo,expedicion:d.expedicion,vence:d.vence,etapa});
     }
    });
   }
   if(rows.length<100)break;
  }
 }catch(e){console.error('[DOCUMENTOS_AVISOS]',require('./correo-diagnostico').diagnostico(e,'reservar'));}finally{running=false;}
}
function start(){const timer=setInterval(tick,3600000);timer.unref();void tick();return timer;}
module.exports={hito,tick,start};
