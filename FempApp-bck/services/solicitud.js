'use strict';
// El envío es una única transacción: datos, referencias de archivos, historial y aviso.
const C=require('./cuenta');
const F=require('./cuenta-archivos');
const Club=require('../models/club.model');
async function enviar(id,body,files) {
  const data=C.R.perfil(body);
  // Las categorías competitivas pertenecen a PerfilDeportivo.
  delete data.categoria;
  const hayArchivos=Object.values(files || {}).some(v=>v?.length);
  const prepared=hayArchivos?await F.preparar(files):{};
  const anteriores={};let aplicado=false;
  try {
    await C.Usuario.sequelize.transaction(async t=>{
      const u=await C.Usuario.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
      if(!u || !['pendiente','requiere_correcciones'].includes(u.estado))C.R.fail(409,'Esta cuenta no tiene una solicitud para enviar.');
      // Reintentar una respuesta perdida no duplica el historial ni el correo.
      if(await C.presentada(u,t))return;
      if(!Number.isInteger(body.revision) || body.revision!==u.revision)C.R.fail(409,'La solicitud cambió. Actualizá el estado antes de enviar.');
      require('./cuenta-documentos').validarArchivos(u,files);
      const deportiva=C.deportiva(u);
      if(deportiva || u.rol==='tecnico') {
        if(typeof data.club!=='string' || !data.club.trim())C.R.fail(400,'Seleccioná un club activo del listado.');
        const club=await Club.findOne({where:{nombre:data.club,activo:true},transaction:t});
        if(!club)C.R.fail(400,'Seleccioná un club activo del listado.');
        data.club=club.nombre;
      }
      data.solicitaLicenciaProvincial=deportiva;
      if(u.rol!=='tecnico')delete data.nivel;
      const propuesta={...C.R.safe(u),...Object.fromEntries(F.campos.map(k=>[k,u[k]])),...data,...prepared};
      await C.completa(propuesta);
      for(const field of Object.keys(prepared))anteriores[field]=u[field];
      const correccion=u.estado==='requiere_correcciones';
      await u.update({...data,...prepared,...(hayArchivos?{documentacionAprobada:false}:{}),estado:'pendiente',aprobado:false,revision:u.revision+1,correcciones:null,camposCorregir:[]},{transaction:t});
      await C.historial(u,id,correccion?'reenviado':'enviado',null,t);
      await C.encolar(u,correccion?'reenviado':'pendiente',t);
      aplicado=true;
    });
  } catch(e) {
    await Promise.all(Object.entries(prepared).map(([k,v])=>F.borrar(v,k)));throw e;
  }
  await Promise.all(Object.entries(aplicado?anteriores:prepared).map(([k,v])=>F.borrar(v,k)));
  return C.detalle(await C.Usuario.findByPk(id));
}
module.exports={enviar};
