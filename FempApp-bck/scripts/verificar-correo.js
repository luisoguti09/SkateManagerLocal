'use strict';
// Diagnóstico local o Railway. No imprime secretos ni consulta la base de datos.
require('dotenv').config({quiet:true});
const crypto=require('node:crypto');
async function main(){
 const required=['MAIL_FROM','MAIL_DATA_KEY','FRONTEND_URL','GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN'];
 const faltan=required.filter(k=>!process.env[k]?.trim());
 for(const k of required)console.log(k+': '+(faltan.includes(k)?'FALTA':'configurada'));
 console.log('MAIL_ENABLED: '+(process.env.MAIL_ENABLED==='true'?'activo':'desactivado'));
 if(faltan.length){process.exitCode=1;return;}
 if(!/^[a-fA-F0-9]{64}$/.test(process.env.MAIL_DATA_KEY))throw new Error('MAIL_DATA_KEY debe tener 64 caracteres hexadecimales. No reemplaces una clave que ya cifra correos pendientes.');
 const from=process.env.MAIL_FROM.trim();
 if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+$/.test(from))throw new Error('MAIL_FROM no es un correo válido.');
 const url=new URL(process.env.FRONTEND_URL);if(!['http:','https:'].includes(url.protocol))throw new Error('FRONTEND_URL inválida.');
 if(!process.argv.includes('--verificar') && !process.argv.includes('--enviar-prueba')){console.log('Configuración presente. Usá --verificar para comprobar OAuth sin enviar correos.');return;}
 const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID,client_secret:process.env.GMAIL_CLIENT_SECRET,refresh_token:process.env.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'})});
 const data=await auth.json();if(!auth.ok || !data.access_token)throw new Error('OAuth rechazó la autorización (HTTP '+auth.status+'). Revisá el cliente y la autorización de Google.');
 if(data.scope && !data.scope.split(' ').includes('https://www.googleapis.com/auth/gmail.send'))throw new Error('Falta el permiso gmail.send. Volvé a autorizar.');
 console.log('OAuth correcto. Esto todavía no confirma la entrega de correos.');
 if(!process.argv.includes('--enviar-prueba'))return;
 const body='Prueba de correo FEMPA. Si recibiste este mensaje, el envío de Gmail está conectado.\n\nAcceso a la aplicación: '+url.origin+'/login';
 const mime=[`From: FEMPA <${from}>`,`To: ${from}`,'Subject: Prueba de correo FEMPA',`Message-ID: <prueba-${crypto.randomUUID()}@${from.split('@')[1]}>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Buffer.from(body).toString('base64').match(/.{1,76}/g).join('\r\n')].join('\r\n');
 const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+data.access_token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(mime).toString('base64url')})});
 if(!r.ok)throw new Error('Gmail rechazó el envío (HTTP '+r.status+'). Revisá que Gmail API esté habilitada y que autorizaste la cuenta remitente.');
 console.log('Gmail aceptó el mensaje de prueba dirigido únicamente a MAIL_FROM. Comprobá su llegada en esa casilla.');
}
main().catch(e=>{console.error(e.name==='TypeError'?'No se pudo completar la conexión o la configuración es inválida.':e.message);process.exitCode=1;});
