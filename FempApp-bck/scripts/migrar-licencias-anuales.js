'use strict';
require('dotenv').config({quiet:true});
const stamp='createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL';
const tablas={
 licencias_anuales:`id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, usuarioId INT NOT NULL, temporada INT NOT NULL, fechaNacional DATE NULL, estado VARCHAR(40) NOT NULL DEFAULT 'solicitada', revision INT NOT NULL DEFAULT 0, exencion JSON NULL, ${stamp}, UNIQUE KEY uq_licencia_persona_temporada (usuarioId,temporada)`,
 licencias_intentos:`id VARCHAR(36) NOT NULL PRIMARY KEY, licenciaId INT NOT NULL, cotizacion JSON NOT NULL, estado VARCHAR(40) NOT NULL, preferenceId VARCHAR(255) NULL, checkoutUrl TEXT NULL, vence DATETIME NOT NULL, ${stamp}, UNIQUE KEY uq_intento_licencia (licenciaId)`,
 licencias_operaciones:`paymentId VARCHAR(30) NOT NULL PRIMARY KEY, licenciaId INT NOT NULL, intentoId VARCHAR(36) NOT NULL, datos JSON NOT NULL, webhook TINYINT(1) NOT NULL DEFAULT 0, ${stamp}, INDEX idx_operacion_licencia (licenciaId)`,
 licencias_historial:`id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, licenciaId INT NOT NULL, actorId INT NULL, accion VARCHAR(50) NOT NULL, datos JSON NOT NULL, ${stamp}, INDEX idx_historial_licencia (licenciaId)`
};
const columnas={licencias_anuales:['id','usuarioId','temporada','fechaNacional','estado','revision','exencion'],licencias_intentos:['id','licenciaId','cotizacion','estado','preferenceId','checkoutUrl','vence'],licencias_operaciones:['paymentId','licenciaId','intentoId','datos','webhook'],licencias_historial:['id','licenciaId','actorId','accion','datos']};
async function verificar(c,name){const [cols]=await c.query('SHOW COLUMNS FROM `'+name+'`');for(const col of [...columnas[name],'createdAt','updatedAt'])if(!cols.some(x=>x.Field===col))throw Error('Esquema incompatible en '+name+': '+col);
 const esperado={licencias_anuales:['uq_licencia_persona_temporada','usuarioId,temporada'],licencias_intentos:['uq_intento_licencia','licenciaId'],licencias_operaciones:['PRIMARY','paymentId']}[name];
 if(esperado){const [idx]=await c.query('SHOW INDEX FROM `'+name+'` WHERE Key_name=?',[esperado[0]]);if(!idx.length||idx.some(x=>Number(x.Non_unique)!==0)||idx.sort((a,b)=>a.Seq_in_index-b.Seq_in_index).map(x=>x.Column_name).join(',')!==esperado[1])throw Error('Falta restricción única en '+name);}
}
async function migrar(c,aplicar=false,respaldo=false){if(aplicar&&!respaldo)throw Error('Falta respaldo verificado.');const [ts]=await c.query('SHOW TABLES');const names=ts.map(x=>Object.values(x)[0]);
 for(const name of ['Usuarios','licencias_becas','licencias_configuracion'])if(!names.includes(name))throw Error('Falta tabla previa: '+name);
 for(const name of Object.keys(tablas))if(names.includes(name))await verificar(c,name);
 console.log(JSON.stringify({modo:aplicar?'aplicar':'diagnostico',tablasPendientes:Object.keys(tablas).filter(n=>!names.includes(n))}));if(!aplicar)return;
 for(const [name,ddl] of Object.entries(tablas)){await c.query('CREATE TABLE IF NOT EXISTS `'+name+'` ('+ddl+') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');await verificar(c,name);}
 console.log('Licencias anuales preparadas. No se crearon cobros ni se modificaron aranceles o cuentas.');
}
async function main(){for(const k of ['DB_HOST','DB_NAME','DB_USER'])if(!process.env[k])throw Error('Configuración incompleta: '+k);const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,...(process.env.NODE_ENV==='local'?{}:{ssl:{rejectUnauthorized:false}})});try{await migrar(c,process.argv.includes('--aplicar'),process.argv.includes('--respaldo-verificado'));}finally{await c.end();}}
if(require.main===module)main().catch(e=>{console.error('Migración detenida:',e.code||e.message);process.exitCode=1;});
module.exports={migrar,tablas,columnas};
