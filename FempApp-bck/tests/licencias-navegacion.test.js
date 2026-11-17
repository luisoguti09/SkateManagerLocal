'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const front=path.resolve(__dirname,'../../FempApp');
const ts=require(path.join(front,'node_modules/typescript')),rx=require(path.join(front,'node_modules/rxjs'));
function guard({rol='deportista',estado='aprobado',requierePago=true,error=false,logged=true}={}){
 const Router={},AuthService={},HttpClient={};let calls=0;
 const router={createUrlTree:(parts,opts)=>({path:parts[0],query:opts?.queryParams})};
 const auth={isLoggedIn:()=>logged,getToken:()=> 'test-only',refreshSession:()=>rx.of({usuario:{rol,estado}})};
 const http={get:()=>{calls++;return error?rx.throwError(()=>Error('offline')):rx.of({requierePago,temporada:2027});}};
 const code=ts.transpileModule(fs.readFileSync(path.join(front,'src/app/guards/auth.guard.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,require:n=>n==='@angular/router'?{Router}:n==='@angular/core'?{inject:t=>t===Router?router:t===AuthService?auth:http}:n==='rxjs'?rx:n==='@angular/common/http'?{HttpClient}:n.includes('environment')?{environment:{SERVER_API:'https://example.invalid'}}:{AuthService}});
 return {async go(url,roles){const r=exports.authGuard({data:{roles}},{url});return rx.isObservable(r)?await rx.firstValueFrom(r):r;},get calls(){return calls;}};
}
test('aprobadas nuevas y antiguas van a pago, para cada rol alcanzado',async()=>{
 for(const rol of ['deportista','delegado','tecnico'])assert.equal((await guard({rol}).go(rol==='deportista'?'/dashboard-deport':'/dashboard-prof')).path,'/licencia');
});
test('pagada, exenta o cobro cerrado permite panel; administradores no pagan',async()=>{
 for(const rol of ['deportista','delegado','tecnico'])assert.equal(await guard({rol,requierePago:false}).go('/dashboard-deport'),true);
 const g=guard({rol:'administrador'});assert.equal(await g.go('/admin'),true);assert.equal(g.calls,0);
});
test('pago y perfil no tienen bucle; error permite consultar estado y reintentar',async()=>{
 const g=guard();assert.equal(await g.go('/licencia?temporada=2027'),true);assert.equal(await g.go('/perfil'),true);assert.equal(g.calls,0);assert.equal((await guard({error:true}).go('/dashboard-deport')).path,'/licencia');
});
test('pendientes no pagan y el rol no obtiene rutas ajenas',async()=>{
 assert.equal((await guard({estado:'pendiente'}).go('/licencia')).path,'/mi-solicitud');assert.equal((await guard().go('/admin',['administrador'])).path,'/mi-solicitud');assert.equal((await guard({logged:false}).go('/licencia')).path,'/login');
});

test('mis datos pendientes abre perfil independiente, sin cargar el dashboard',async()=>{assert.equal((await guard().go('/dashboard-deport/mis-datos')).path,'/perfil');assert.equal(await guard({requierePago:false}).go('/dashboard-deport/mis-datos'),true);});
