'use strict';
// Ejecutar primero sobre una copia restaurada. Sin --aplicar es solo diagnóstico.
require('dotenv').config({quiet:true});
const mysql=require('mysql2/promise');
async function main(){
 for(const key of ['DB_HOST','DB_NAME','DB_USER'])if(!process.env[key])throw new Error('Configuración de base incompleta.');
 const apply=process.argv.includes('--aplicar');
 if(apply && !process.argv.includes('--respaldo-verificado'))throw new Error('Falta --respaldo-verificado: verificá antes la restauración aislada del respaldo.');
 const c=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,...(process.env.NODE_ENV==='local'?{}:{ssl:{rejectUnauthorized:false}})});
 try{
  const [tables]=await c.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND LOWER(TABLE_NAME)='usuarios'");
  if(tables.length!==1)throw new Error('No se identificó una única tabla Usuarios.');
  const table='`'+tables[0].TABLE_NAME.replace(/`/g,'``')+'`';
  const [columns]=await c.query('SHOW COLUMNS FROM '+table+" LIKE 'cuil'");
  console.log(JSON.stringify({modo:apply?'aplicar':'diagnostico',columnaCuilExiste:columns.length===1}));
  if(columns.length && !/^varchar\(11\)$/i.test(columns[0].Type))throw new Error('La columna CUIL existente requiere revisión manual.');
  if(!apply)return;
  if(!columns.length)await c.query('ALTER TABLE '+table+' ADD COLUMN cuil VARCHAR(11) NULL');
  // DDL MySQL tiene commit implícito: el reintento reconoce la columna ya creada.
  await c.beginTransaction();
  try{
   // Una aprobación previa incluye los documentos de ese momento. No aprobar
   // renovaciones/observaciones posteriores ni cuentas con estados inconsistentes.
   const [rows]=await c.query(`SELECT u.id,u.revision FROM ${table} u
    WHERE u.estado='aprobado' AND u.aprobado=1 AND COALESCE(u.documentacionAprobada,0)=0
    AND NOT EXISTS (SELECT 1 FROM CuentaHistorial h WHERE h.usuarioId=u.id
      AND h.accion IN ('documentos_renovados','certificado_antecedentes_actualizado','archivos_actualizados','documentacion_observada')
      AND h.id > COALESCE((SELECT MAX(a.id) FROM CuentaHistorial a WHERE a.usuarioId=u.id AND a.accion='estado_actualizado' AND a.estado='aprobado'),0)) FOR UPDATE`);
   for(const row of rows){
    await c.query(`UPDATE ${table} SET documentacionAprobada=1,revision=revision+1,updatedAt=NOW() WHERE id=?`,[row.id]);
    await c.query("INSERT INTO CuentaHistorial (usuarioId,actorId,accion,estado,motivo,revision,createdAt,updatedAt) VALUES (?,NULL,'aprobacion_unificada_migracion','aprobado','Aprobación previa de cuenta incluye documentación; sin cambios en pago o licencia.',?,NOW(),NOW())",[row.id,Number(row.revision)+1]);
   }
   await c.commit();console.log(JSON.stringify({columnaCuilLista:true,aprobacionesPreviasAlineadas:rows.length}));
  }catch(e){await c.rollback();throw e;}
 }finally{await c.end();}
}
module.exports={main};
if(require.main===module)main().catch(()=>{console.error('No se completó la migración. Revisá conexión, esquema y respaldo; no se imprimen credenciales ni SQL.');process.exitCode=1;});
