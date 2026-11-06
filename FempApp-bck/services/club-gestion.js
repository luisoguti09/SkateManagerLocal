'use strict';
const { R, db } = require('./circuito');
function mismoClub(actor, deportista) {
  return !!actor && !!deportista && ['tecnico','delegado'].includes(actor.rol) && actor.estado==='aprobado' && !!actor.aprobado && deportista.rol==='deportista' && deportista.estado==='aprobado' && !!deportista.aprobado && typeof actor.club==='string' && !!actor.club.trim() && actor.club===deportista.club;
}
async function miembro(actorId, usuarioId, t, escritura=false) {
  const opts={transaction:t,...(t?{lock:t.LOCK.UPDATE}:{})};
  const actor=await db.Usuario.findByPk(R.id(actorId),opts);
  const u=await db.Usuario.findByPk(R.id(usuarioId),opts);
  if(!mismoClub(actor,u) || (escritura && actor.rol!=='tecnico'))R.fail(403,'Esta operación solo corresponde a deportistas aprobadas de tu club actual.');
  const club=await db.Club.findOne({where:{nombre:actor.club,activo:true},transaction:t});
  if(!club)R.fail(403,'El club debe estar activo.');
  return u;
}
function exigirAbm(ev) {
  if(R.etapa(ev)!=='abm' || ev.inscripcionesConfirmadasAt)R.fail(409,'La técnica puede editar únicamente durante ABM, antes de confirmar las inscripciones.');
}
function versionPerfil(p){return require('node:crypto').createHash('sha256').update(JSON.stringify(['usuarioId','disciplina','origenCategoria','licencia','modalidad','divisional','categoria','temporada','activa','clubId','clubSedeId'].map(k=>p[k]??null))).digest('hex');}
module.exports={mismoClub,miembro,exigirAbm,versionPerfil};
