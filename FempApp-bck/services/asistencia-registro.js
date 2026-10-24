'use strict';
async function registrar(model,eventoId,usuarioId){
  try{await model.create({eventoId,usuarioId,checkedAt:new Date()});return true;}
  catch(e){
    // Solo un conflicto único corroborado equivale a una asistencia existente.
    if(e.name==='SequelizeUniqueConstraintError' && await model.findOne({where:{eventoId,usuarioId}}))return false;
    throw e;
  }
}
module.exports={registrar};
