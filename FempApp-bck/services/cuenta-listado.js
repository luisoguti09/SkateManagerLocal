'use strict';
const {Op}=require('sequelize');
const {fail}=require('./cuenta-reglas');
async function filtrarEtapa(where,etapa,Historial){
 if(!etapa)return where;
 if(!['en_revision','por_completar'].includes(etapa))fail(400,'Etapa inválida.');
 const enviados=await Historial.findAll({where:{accion:{[Op.in]:['enviado','reenviado']}},attributes:['usuarioId'],group:['usuarioId'],raw:true});
 where.estado='pendiente';
 where.id={[etapa==='en_revision'?Op.in:Op.notIn]:enviados.map(x=>x.usuarioId)};
 return where;
}
module.exports={filtrarEtapa};
