const crypto=require('node:crypto');
const {Op}=require('sequelize');
const Correo=require('../models/cuentacorreo.model');
let running=false;
function key() {
  const hex=process.env.MAIL_DATA_KEY || '';
  if(!/^[a-fA-F0-9]{64}$/.test(hex)) throw new Error('MAIL_DATA_KEY debe tener 64 caracteres hexadecimales.');
  return Buffer.from(hex,'hex');
}
function seal(data) {
  const iv=crypto.randomBytes(12), c=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const b=Buffer.concat([c.update(JSON.stringify(data),'utf8'),c.final()]);
  return [iv,c.getAuthTag(),b].map(v=>v.toString('base64')).join('.');
}
function unseal(value) {
  const [iv,tag,body]=value.split('.').map(v=>Buffer.from(v,'base64'));
  const c=crypto.createDecipheriv('aes-256-gcm',key(),iv); c.setAuthTag(tag);
  return JSON.parse(Buffer.concat([c.update(body),c.final()]).toString('utf8'));
}
function frontUrl() {
  const url=new URL(process.env.FRONTEND_URL || '');
  if(url.protocol!=='https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('FRONTEND_URL requiere HTTPS.');
  return url.origin;
}
async function encolar(u,tipo,transaction,extra={}) {
  return Correo.create({usuarioId:u.id,tipo,estado:'pendiente',intentos:0,disponibleAt:new Date(),
    payload:seal({email:u.email,...extra})},{transaction});
}
const labels={pendiente:'Solicitud recibida',requiere_correcciones:'Tu solicitud requiere correcciones',aprobado:'Tu cuenta fue aprobada',bloqueado:'Tu cuenta fue bloqueada',reenviado:'Recibimos tus correcciones',documentacion:'Se actualizó la revisión de tus documentos'};
async function send(row) {
  const payload=unseal(row.payload), from=process.env.MAIL_FROM || '';
  if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+$/.test(from) || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+$/.test(payload.email)) throw new Error('EMAIL_CONFIG');
  if(payload.expires && Date.now()>payload.expires) return 'vencido';
  const subject=row.tipo==='reset' ? 'Recuperá tu acceso a FEMPA' : labels[row.tipo] || 'Novedades de tu cuenta FEMPA';
  const text=row.tipo==='reset' ? `Solicitaste cambiar tu contraseña. El enlace es válido durante 30 minutos y una sola vez.\n\n${frontUrl()}/recuperar-cuenta#token=${payload.token}\n\nSi no lo solicitaste, ignorá este correo.` : `${subject}.\n\nIngresá para consultar el estado y los próximos pasos:\n${frontUrl()}/login\n\nLas observaciones y documentos se consultan únicamente dentro de la aplicación.\nFederación Mendocina de Patín`;
  const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID || '',client_secret:process.env.GMAIL_CLIENT_SECRET || '',refresh_token:process.env.GMAIL_REFRESH_TOKEN || '',grant_type:'refresh_token'})});
  if(!auth.ok) throw new Error('OAUTH_'+auth.status);
  const {access_token}=await auth.json();
  const encodedSubject='=?UTF-8?B?'+Buffer.from(subject).toString('base64')+'?=';
  const mime=[`From: FEMPA <${from}>`,`To: ${payload.email}`,`Subject: ${encodedSubject}`,`Message-ID: <fempa-${row.id}@${from.split('@')[1]}>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Buffer.from(text).toString('base64').match(/.{1,76}/g).join('\r\n')].join('\r\n');
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(mime).toString('base64url')})});
  if(!response.ok) throw new Error('GMAIL_'+response.status);
  return 'enviado';
}
async function tick() {
  if(running || process.env.MAIL_ENABLED!=='true') return;
  running=true;
  let etapa='reservar';
  try {
    for(let n=0;n<10;n++) {
      etapa='reservar';
      const leaseId=crypto.randomUUID();
      const row=await Correo.sequelize.transaction(async t=>{
        const r=await Correo.findOne({where:{[Op.or]:[{estado:'pendiente',disponibleAt:{[Op.lte]:new Date()}},{estado:'enviando',leaseAt:{[Op.lt]:new Date(Date.now()-120000)}}]},order:[['id','ASC']],transaction:t,lock:t.LOCK.UPDATE,skipLocked:true});
        if(!r) return null;
        await r.update({estado:'enviando',leaseAt:new Date(),leaseId,intentos:r.intentos+1},{transaction:t});return r;
      });
      if(!row) break;
      try {
        etapa='enviar';
        const estado=await send(row);
        etapa='confirmar';
        await Correo.update({estado,enviadoAt:estado==='enviado'?new Date():null,payload:null,error:null,leaseId:null},{where:{id:row.id,leaseId}});
      } catch(e) {
        if(etapa==='confirmar')console.error('[MAIL_QUEUE]',require('./correo-diagnostico').diagnostico(e,etapa));
        etapa='reintentar';
        const error=/^(OAUTH|GMAIL)_\d+$/.test(e.message)?e.message:'ENVIO_FALLIDO';
        await Correo.update({estado:row.intentos>=8?'fallido':'pendiente',error,leaseId:null,disponibleAt:new Date(Date.now()+Math.min(3600000,30000*2**row.intentos))},{where:{id:row.id,leaseId}});
      }
    }
  } catch(e) { console.error('[MAIL_QUEUE]',require('./correo-diagnostico').diagnostico(e,etapa)); } finally { running=false; }
}
function start() { key();frontUrl();const timer=setInterval(tick,15000);timer.unref();return timer; }
module.exports={encolar,start,tick,seal,unseal};
