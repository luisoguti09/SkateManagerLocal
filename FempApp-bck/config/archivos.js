const path = require('node:path');
const fs = require('node:fs');
const root=path.resolve(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname,'../storage'));
if(process.env.RAILWAY_ENVIRONMENT_ID && !process.env.RAILWAY_VOLUME_MOUNT_PATH) throw new Error('No se detecta un volumen Railway montado.');
if(process.env.RAILWAY_ENVIRONMENT_ID) {
  const mount=path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH);
  if(root!==mount && !root.startsWith(mount+path.sep))throw new Error('DATA_DIR debe estar dentro del volumen montado.');
}
const privateDir=path.join(root,'privado'), publicDir=path.join(root,'publico');
for(const dir of [privateDir,publicDir]) fs.mkdirSync(dir,{recursive:true,mode:0o700});
const dniRequerido=()=>process.env.REQUIRE_DNI_DOCUMENTS!=='false';
module.exports={root,privateDir,publicDir,dniRequerido};
