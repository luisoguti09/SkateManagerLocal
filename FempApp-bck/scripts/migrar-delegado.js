'use strict';
require('dotenv').config({quiet:true});
async function main(){
 const db=require('../config/database'),{DataTypes:D}=require('sequelize');
 try{
  const qi=db.getQueryInterface(),cols=await qi.describeTable('Usuarios');
  const aplicar=process.argv.includes('--aplicar');
  console.log(JSON.stringify({modo:aplicar?'aplicar':'diagnostico',rolDelegado:String(cols.rol.type).includes("'delegado'")}));
  if(!aplicar)return;
  if(!process.argv.includes('--respaldo-verificado'))throw new Error('Se requiere respaldo verificado.');
  for(const campo of ['rol','rolSolicitado']){
   const c=cols[campo];if(!c || !/^ENUM/i.test(String(c.type)))continue;
   const values=[...String(c.type).matchAll(/'([^']+)'/g)].map(m=>m[1]);
   if(!values.includes('delegado'))await qi.changeColumn('Usuarios',campo,{type:D.ENUM(...values,'delegado'),allowNull:c.allowNull,...(c.defaultValue != null ? {defaultValue:c.defaultValue} : {})});
  }
  const Rol=require('../models/rol.model');
  const [rol]=await Rol.findOrCreate({where:{nombre:'delegado'}});
  const {Config,Audit}=require('../models/licenciaconfiguracion.model');
  await Config.sync();await Audit.sync();
  await Config.findOrCreate({where:{id:2027},defaults:{revision:0,datos:require('../services/licencias/propuesta').inicial}});
  console.log(JSON.stringify({rolDelegadoListo:true,rolId:rol.id,propuestaLicenciasLista:true,cobrosHabilitados:false}));
 }finally{await db.close();}
}
if(require.main===module)main().catch(()=>{console.error('No se completó la migración de delegado. Revisá conexión y esquema.');process.exitCode=1;});
module.exports={main};
