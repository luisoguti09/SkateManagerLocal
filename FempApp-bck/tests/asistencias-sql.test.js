'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {Sequelize,DataTypes:D}=require('sequelize'),Module=require('node:module'),path=require('node:path');
const sequelize=new Sequelize('mysql://test:test@localhost/test',{logging:false});
const Usuario=sequelize.define('Usuario',{nombre:D.STRING,dni:D.STRING,club:D.STRING,rol:D.STRING,estado:D.STRING});
const Evento=sequelize.define('Evento',{nombre:D.STRING,titulo:D.STRING,lugar:D.STRING,fechaInicio:D.STRING,fechaFin:D.STRING});
const Asistencia=sequelize.define('Asistencia',{eventoId:D.INTEGER,usuarioId:D.INTEGER,scanBy:D.INTEGER,checkedAt:D.DATE});
Asistencia.belongsTo(Evento,{foreignKey:'eventoId'});Asistencia.belongsTo(Usuario,{foreignKey:'usuarioId'});Asistencia.belongsTo(Usuario,{as:'scanByUser',foreignKey:'scanBy'});
const sqls=[];sequelize.query=async sql=>{sqls.push(sql);return /count\(DISTINCT/i.test(sql)&&!/GROUP BY/.test(sql)?{count:0}:[];};
const original=Module._load;Module._load=function(req,parent,main){const key=path.basename(req).replace(/\.js$/,'');const map={'usuario.model':Usuario,'evento.model':Evento,'asistencias.model':Asistencia,'club.model':{findOne:async()=>({id:1})}};return map[key]||original.call(this,req,parent,main);};
const service=require('../services/asistencias-consulta');Module._load=original;
test('ORM real genera agregación y detalle con alias inequívocos, alcance y paginación',async()=>{
 try{
  await service.resumen({rol:'tecnico',club:'A'});
  assert.match(sqls[0],/COUNT\(DISTINCT\(`Asistencia`.`usuarioId`\)\)/);assert.match(sqls[0],/`Usuario`.`club` = 'A'/);assert.match(sqls[0],/GROUP BY/);
  assert.doesNotMatch(sqls[0],/`Usuario`.`password`/);
  await service.detalle({rol:'tecnico',club:'A'},'10',{pagina:'2',buscar:'Luna'});
  assert.ok(sqls.some(s=>s.includes('LIMIT 50, 50')));assert.ok(sqls.some(s=>s.includes("LIKE '%Luna%'")));
  assert.ok(sqls.slice(1).every(s=>s.includes("`Usuario`.`club` = 'A'")));
 }finally{await sequelize.close();}
});
