'use strict';
require('dotenv').config({quiet:true});
const mysql=require('mysql2/promise');
async function migrar(c,aplicar=false,respaldo=false){
 if(aplicar&&!respaldo)throw new Error('Falta respaldo verificado.');
 const tablas=['Usuarios','perfiles_deportivos'],faltan=[];
 for(const tabla of tablas){
  const [cols]=await c.query('SHOW COLUMNS FROM `'+tabla+'` LIKE \'deporte\'');
  if(cols.length && !/^varchar\(80\)$/i.test(cols[0].Type))throw new Error('La columna existente requiere revisión.');
  if(!cols.length)faltan.push(tabla);
 }
 console.log(JSON.stringify({modo:aplicar?'aplicar':'diagnostico',columnasPendientes:faltan}));
 if(!aplicar)return;
 for(const tabla of faltan)await c.query('ALTER TABLE `'+tabla+'` ADD COLUMN deporte VARCHAR(80) NULL');
 await c.beginTransaction();
 try{
  const [u]=await c.query("UPDATE Usuarios SET deporte=? WHERE rol='deportista' AND deporte IS NULL",['PATINAJE ARTÍSTICO']);
  const [p]=await c.query('UPDATE perfiles_deportivos SET deporte=? WHERE deporte IS NULL',['PATINAJE ARTÍSTICO']);
  await c.commit();console.log(JSON.stringify({deportesListos:true,cuentasAsignadas:u.affectedRows,perfilesAsignados:p.affectedRows}));
 }catch(e){await c.rollback();throw e;}
}
async function main(){
 for(const k of ['DB_HOST','DB_NAME','DB_USER'])if(!process.env[k])throw new Error('Configuración incompleta.');
 const c=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4',...(process.env.NODE_ENV==='local'?{}:{ssl:{rejectUnauthorized:false}})});
 try{await migrar(c,process.argv.includes('--aplicar'),process.argv.includes('--respaldo-verificado'));}finally{await c.end();}
}
module.exports={migrar};
if(require.main===module)main().catch(()=>{console.error('No se completó la migración de deportes. No publicar.');process.exitCode=1;});
