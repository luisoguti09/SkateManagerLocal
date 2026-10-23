// Por defecto solo informa. --apply borra archivos UUID propios SIN referencia,
// con más de 24 horas. No toca uploads antiguos, MySQL ni otros directorios.
require('dotenv').config();
const fs=require('node:fs/promises'),path=require('node:path');
const Usuario=require('../models/usuario.model');
const {privateDir,publicDir}=require('../config/archivos');
async function main(){
 const rows=await Usuario.findAll({attributes:require('../services/cuenta-archivos').campos,raw:true});
 const used=new Set(rows.flatMap(u=>Object.values(u).filter(Boolean).map(v=>path.basename(v))));
 let count=0,bytes=0;
 for(const dir of [privateDir,publicDir])for(const name of await fs.readdir(dir)){
   if(!/^[a-f0-9-]{36}\.(jpg|pdf)$/.test(name) || used.has(name))continue;
   const p=path.join(dir,name),stat=await fs.lstat(p);
   if(!stat.isFile() || Date.now()-stat.mtimeMs<86400000)continue;
   count++;bytes+=stat.size;if(process.argv.includes('--apply'))await fs.unlink(p);
 }
 console.log({modo:process.argv.includes('--apply')?'aplicado':'solo diagnóstico',archivos:count,bytes});
}
main().catch(e=>{console.error(e.name);process.exitCode=1;}).finally(()=>Usuario.sequelize.close());
