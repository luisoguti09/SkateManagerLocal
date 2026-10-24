'use strict';
require('dotenv').config();
const sequelize=require('../config/database');
const Correo=require('../models/cuentacorreo.model');
const {diagnostico}=require('../services/correo-diagnostico');
async function main(){
  await sequelize.authenticate();
  const [version]=await sequelize.query('SELECT VERSION() AS version',{logging:false});
  console.log('Versión de base:',version[0].version);
  const columnas=await sequelize.getQueryInterface().describeTable(Correo.getTableName());
  const faltantes=Object.keys(Correo.rawAttributes).filter(k=>!columnas[k]);
  console.log('Columnas faltantes en CuentaCorreo:',faltantes.length?faltantes.join(', '):'ninguna');
  console.log('Payload permite NULL:',columnas.payload?.allowNull===true?'sí':'no');
  // Lectura de metadatos solamente: no muestra ni envía correos, no modifica tablas.
  console.log('Diagnóstico de estructura terminado. No se modificaron datos.');
}
main().catch(e=>{console.error('[MAIL_DIAGNOSTICO]',diagnostico(e,'reservar'));process.exitCode=1;}).finally(()=>sequelize.close());
