// Ejecutar localmente. Nunca pegar secretos en chats ni subir .env al repositorio.
require('dotenv').config();
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs');
const clientId=process.env.GMAIL_CLIENT_ID,clientSecret=process.env.GMAIL_CLIENT_SECRET;
if(!clientId || !clientSecret)throw new Error('Configurá GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET en .env local.');
const state=crypto.randomBytes(24).toString('hex');
const redirect='http://localhost:8765/oauth2callback';
const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'https://www.googleapis.com/auth/gmail.send',access_type:'offline',prompt:'consent',state}).toString();
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,redirect);
  if(u.pathname!=='/oauth2callback' || u.searchParams.get('state')!==state){res.writeHead(400);res.end('Solicitud invalida');return;}
  try{
    if(!u.searchParams.get('code'))throw new Error('Autorización cancelada');
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code:u.searchParams.get('code'),redirect_uri:redirect,grant_type:'authorization_code'})});
    const data=await response.json();if(!response.ok || !data.refresh_token)throw new Error('Google no devolvió autorización persistente.');
    fs.writeFileSync('.gmail-credenciales.env','GMAIL_REFRESH_TOKEN='+data.refresh_token+'\n',{flag:'wx',mode:0o600});
    res.end('Autorizacion completada. Ya podes cerrar esta ventana.');
    console.log('Credencial guardada en .gmail-credenciales.env. Copiala a Variables del backend y conservá el archivo fuera de Git.');
  }catch(e){res.statusCode=400;res.end('No se pudo completar. Revisa la terminal.');console.error(e.message);}finally{server.close();}
});
server.listen(8765,'127.0.0.1',()=>console.log('Abrí este enlace y elegí la cuenta remitente:\n'+url.href));
setTimeout(()=>server.close(),300000).unref();
