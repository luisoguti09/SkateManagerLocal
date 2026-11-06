'use strict';
require('dotenv').config({quiet:true});
async function main(){const db=require('../config/database');try{
 const tablas=await db.getQueryInterface().showAllTables();const existe=tablas.some(t=>String(t.tableName||t)==='licencias_avisos');
 console.log(JSON.stringify({avisosTesoreria:existe,modo:process.argv.includes('--aplicar')?'aplicar':'diagnostico'}));
 if(!process.argv.includes('--aplicar'))return;
 if(!process.argv.includes('--respaldo-verificado'))throw new Error('Falta respaldo verificado.');
 await require('../models/licenciaaviso.model').sync();
 console.log(JSON.stringify({avisosTesoreriaListos:true,enviosEjecutados:false}));
}finally{await db.close();}}
if(require.main===module)main().catch(()=>{console.error('No se pudo preparar la tabla de avisos. No continuar con el despliegue.');process.exitCode=1;});
module.exports={main};
