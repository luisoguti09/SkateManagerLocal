'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
test('migración CUIL: diagnóstico sin escrituras, idempotencia, auditoría y rollback',async()=>{
 const original=Module._load,argv=process.argv,env={...process.env};let column=false,aligned=false,fail=false;const sql=[];let commits=0,rollbacks=0;
 const c={async query(q){sql.push(q);if(q.startsWith('SELECT TABLE_NAME'))return [[{TABLE_NAME:'Usuarios'}]];if(q.startsWith('SHOW COLUMNS'))return [column?[{Type:'varchar(11)'}]:[]];if(q.startsWith('ALTER TABLE')){column=true;return [{}];}if(q.startsWith('SELECT u.id'))return [aligned?[]:[{id:64,revision:2}]];if(q.startsWith('INSERT INTO')){if(fail)throw Error('simulado');aligned=true;}return [{affectedRows:1}];},async beginTransaction(){},async commit(){commits++;},async rollback(){rollbacks++;},async end(){}};
 Module._load=function(n,p,m){if(n==='mysql2/promise')return {createConnection:async()=>c};if(n==='dotenv')return {config(){}};return original.call(this,n,p,m);};
 try{
  process.env.DB_HOST='isolated.invalid';process.env.DB_USER='demo';process.env.DB_NAME='demo';
  const {main}=require('../scripts/migrar-cuil');process.argv=['node','migrar-cuil.js'];await main();assert.ok(sql.every(x=>/^(SELECT|SHOW)/.test(x)));
  process.argv.push('--aplicar');await assert.rejects(main(),/respaldo/);
  process.argv.push('--respaldo-verificado');await main();await main();
  assert.equal(sql.filter(x=>x.startsWith('ALTER TABLE')).length,1);assert.equal(sql.filter(x=>x.startsWith('INSERT INTO')).length,1);assert.equal(commits,2);
  fail=true;aligned=false;await assert.rejects(main());assert.equal(rollbacks,1);
  assert.ok(!sql.some(x=>/DROP|TRUNCATE|DELETE|FOREIGN_KEY_CHECKS/.test(x)));
 }finally{Module._load=original;process.argv=argv;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);}
});
