'use strict';
require('dotenv').config({quiet:true});
const mysql=require('mysql2/promise');
const timestamps='createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL';
const tablas={
 deportes_permisos:`usuarioId INT NOT NULL PRIMARY KEY, deportes JSON NOT NULL, revision INT NOT NULL DEFAULT 0, ${timestamps}`,
 deportes_permisos_historial:`id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, usuarioId INT NOT NULL, actorId INT NOT NULL, antes JSON NULL, despues JSON NOT NULL, motivo VARCHAR(500) NOT NULL, ${timestamps}`,

 deportes_catalogo:`nombre VARCHAR(80) NOT NULL PRIMARY KEY, activo TINYINT(1) NOT NULL DEFAULT 1, disciplinas JSON NOT NULL, fuente VARCHAR(1000) NOT NULL DEFAULT '', revision INT NOT NULL DEFAULT 0, ${timestamps}`,
 deportes_catalogo_historial:`id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, deporte VARCHAR(80) NOT NULL, actorId INT NOT NULL, antes JSON NULL, despues JSON NOT NULL, motivo VARCHAR(500) NOT NULL, ${timestamps}`,
 licencias_becas:`id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, usuarioId INT NOT NULL, temporada INT NOT NULL, porcentaje INT NOT NULL, porcentajeInscripciones INT NOT NULL DEFAULT 0, todosEventos TINYINT(1) NOT NULL DEFAULT 0, eventos JSON NOT NULL, activa TINYINT(1) NOT NULL DEFAULT 1, alcance VARCHAR(40) NOT NULL DEFAULT 'licencia_anual', revision INT NOT NULL DEFAULT 0, ${timestamps}, UNIQUE KEY uq_beca_usuario_temporada (usuarioId,temporada)`,
 licencias_becas_historial:`id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, becaId INT NOT NULL, actorId INT NOT NULL, antes JSON NULL, despues JSON NOT NULL, motivo VARCHAR(500) NOT NULL, ${timestamps}`
};
const columnas={deportes_permisos:['usuarioId','deportes','revision','createdAt','updatedAt'],deportes_permisos_historial:['id','usuarioId','actorId','antes','despues','motivo','createdAt','updatedAt'],deportes_catalogo:['nombre','activo','disciplinas','fuente','revision','createdAt','updatedAt'],deportes_catalogo_historial:['id','deporte','actorId','antes','despues','motivo','createdAt','updatedAt'],licencias_becas:['id','usuarioId','temporada','porcentaje','porcentajeInscripciones','todosEventos','eventos','activa','alcance','revision','createdAt','updatedAt'],licencias_becas_historial:['id','becaId','actorId','antes','despues','motivo','createdAt','updatedAt']};
async function verificar(c,tabla){
 const [cols]=await c.query('SHOW COLUMNS FROM `'+tabla+'`');
 if(columnas[tabla].some(k=>!cols.some(c=>c.Field===k)))throw Error('Esquema existente incompatible: '+tabla);
 if(tabla==='licencias_becas'){
  const [indices]=await c.query('SHOW INDEX FROM licencias_becas WHERE Key_name=?',['uq_beca_usuario_temporada']);
  if(indices.length!==2||indices.some(x=>Number(x.Non_unique)!==0)||indices.sort((a,b)=>a.Seq_in_index-b.Seq_in_index).map(x=>x.Column_name).join(',')!=='usuarioId,temporada')throw Error('Falta índice único de becas.');
 }
}
async function migrar(c,aplicar=false,respaldo=false){
 if(aplicar&&!respaldo)throw Error('Falta respaldo verificado.');
 const [existing]=await c.query('SHOW TABLES');const names=existing.map(r=>Object.values(r)[0]);
 for(const name of Object.keys(tablas))if(names.includes(name))await verificar(c,name);
 console.log(JSON.stringify({modo:aplicar?'aplicar':'diagnostico',tablasPendientes:Object.keys(tablas).filter(n=>!names.includes(n))}));
 if(!aplicar)return;
 for(const [name,ddl] of Object.entries(tablas)){await c.query('CREATE TABLE IF NOT EXISTS `'+name+'` ('+ddl+') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');await verificar(c,name);}
 await c.beginTransaction();
 try{
  const D=require('../services/deportes');
  const fuentes={
   'DOWNHILL LONGBOARD':'World Skate · Downhill Skateboarding and Street Luge Rulebook · junio 2026 · 1.2, 1.3. Divisiones Male/Female. La edad mínima de competencia internacional no restringe el alta provincial.',
   'STREET LUGE':'World Skate · Downhill Skateboarding and Street Luge Rulebook · junio 2026 · 1.2, 1.3. Divisiones Male/Female.',
   'ROLLER FREESTYLE':'Reglamento Oficial Roller Freestyle · San Juan 2026 · secciones 1 y 2. Categorías según convocatoria.',
   'INLINE DOWNHILL':'Pendiente de reglamento y validación de la comisión deportiva.',
   'HOCKEY INLINE':'Pendiente de reglamento y validación de la comisión deportiva.'
  };
  for(const [nombre,fuente] of Object.entries(fuentes)){
   const disciplinas=nombre===D.FREESTYLE?D.disciplinas.map(nombre=>({nombre,categorias:D.categorias})): [{nombre,categorias:['DOWNHILL LONGBOARD','STREET LUGE'].includes(nombre)?['MASCULINO','FEMENINO']:[]}];
   await c.query('INSERT INTO deportes_catalogo (nombre,activo,disciplinas,fuente,revision,createdAt,updatedAt) VALUES (?,1,?,?,0,NOW(),NOW()) ON DUPLICATE KEY UPDATE nombre=nombre',[nombre,JSON.stringify(disciplinas),fuente]);
  }
  await c.commit();
 }catch(e){await c.rollback();throw e;}
 console.log('Catálogo y becas preparados. No se alteraron cuentas, perfiles ni pagos.');
}
async function main(){
 for(const key of ['DB_HOST','DB_NAME','DB_USER'])if(!process.env[key])throw Error('Configuración incompleta.');
 const c=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4',...(process.env.NODE_ENV==='local'?{}:{ssl:{rejectUnauthorized:false}})});
 try{await migrar(c,process.argv.includes('--aplicar'),process.argv.includes('--respaldo-verificado'));}finally{await c.end();}
}
module.exports={migrar,tablas,columnas};
if(require.main===module)main().catch(()=>{console.error('No se completó la migración de catálogo y becas. No publicar.');process.exitCode=1;});
