const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const multer=require('multer');
const sharp=require('sharp');
const {privateDir,publicDir}=require('../config/archivos');
const {fail}=require('./cuenta-reglas');
sharp.cache(false); sharp.concurrency(1);
const campos=['fotoPerfil','dniFrente','dniDorso','fichaMedica'];
const incoming=multer({storage:multer.memoryStorage(),limits:{fileSize:6*1024*1024,files:4,fields:5,parts:9}}).fields(campos.map(name=>({name,maxCount:1})));
let active=0;
function recibir(req,res,next) {
  if(active>=3) return res.status(429).json({error:'Hay varias cargas en curso. Reintentá en unos segundos.'});
  active++; let freed=false;const free=()=>{if(!freed){freed=true;active--;}};
  res.once('finish',free);res.once('close',free);
  incoming(req,res,e=>e?res.status(400).json({error:'Subí hasta cuatro archivos de hasta 6 MB cada uno.'}):next());
}
function filename(value,field) {
  if(typeof value!=='string') return null;
  const name=field==='fotoPerfil' ? value.replace(/^uploads\/usuarios\//,'') : value;
  return /^[a-f0-9-]{36}\.(jpg|pdf)$/.test(name)?name:null;
}
function fullpath(value,field) { const name=filename(value,field);return name?path.join(field==='fotoPerfil'?publicDir:privateDir,name):null; }
async function existe(value,field) { const p=fullpath(value,field);if(!p)return false;try{await fs.access(p);return true;}catch{return false;} }
async function borrar(value,field) { const p=fullpath(value,field);if(p)await fs.unlink(p).catch(e=>{if(e.code!=='ENOENT')console.error('[ARCHIVO_DELETE]',e.code);}); }
async function preparar(files) {
  const prepared={};
  try {
    for(const field of campos) {
      const file=files?.[field]?.[0];if(!file)continue;
      let buffer,ext='jpg';
      // PDF solo para ficha médica; los DNI siempre se decodifican y reescriben.
      if(field==='fichaMedica' && file.buffer.subarray(0,5).toString()==='%PDF-') {
        if(file.size>2*1024*1024)fail(400,'La ficha PDF no debe superar 2 MB.');
        buffer=file.buffer;ext='pdf';
      } else {
        try {
          const input=sharp(file.buffer,{limitInputPixels:25000000,animated:false});
          const meta=await input.metadata();
          if(!['jpeg','png','webp'].includes(meta.format) || (meta.pages || 1)>1)fail(400,'Formato no admitido.');
          buffer=await input.rotate().resize({width:field==='fotoPerfil'?1000:2400,height:field==='fotoPerfil'?1000:2400,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85,mozjpeg:true}).toBuffer();
        } catch(e) { if(e.status)throw e;fail(400,'Usá una imagen JPG, PNG o WebP válida.'); }
        if(buffer.length>2*1024*1024)fail(400,'La imagen optimizada supera 2 MB. Reducí su tamaño conservando la legibilidad.');
      }
      const name=crypto.randomUUID()+'.'+ext;
      const value=field==='fotoPerfil'?'uploads/usuarios/'+name:name;
      await fs.writeFile(fullpath(value,field),buffer,{flag:'wx',mode:0o600});prepared[field]=value;
    }
    if(!Object.keys(prepared).length)fail(400,'Seleccioná un archivo.');
    return prepared;
  } catch(e) { await Promise.all(Object.entries(prepared).map(([f,v])=>borrar(v,f)));throw e; }
}
async function guardar(usuarioId,files,actorId) {
  const Usuario=require('../models/usuario.model');
  const {historial,editable}=require('./cuenta');
  const prepared=await preparar(files);let old={};
  try {
    await Usuario.sequelize.transaction(async t=>{
      const u=await Usuario.findByPk(usuarioId,{transaction:t,lock:t.LOCK.UPDATE});
      if(!u || u.estado==='bloqueado')fail(403,'Cuenta no habilitada.');
      await editable(u,t);
      require('./cuenta-documentos').validarArchivos(u,files);
      for(const field of Object.keys(prepared))old[field]=u[field];
      await u.update({...prepared,documentacionAprobada:false,revision:u.revision+1},{transaction:t});
      await historial(u,actorId,'archivos_actualizados',Object.keys(prepared).join(', '),t);
    });
  } catch(e) { await Promise.all(Object.entries(prepared).map(([f,v])=>borrar(v,f)));throw e; }
  await Promise.all(Object.entries(old).map(([f,v])=>borrar(v,f)));
  return prepared;
}
module.exports={recibir,guardar,borrar,existe,fullpath,campos,preparar};
