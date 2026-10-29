const {test}=require('node:test');
const assert=require('node:assert/strict');
const {habilitacionAsistencia:h}=require('../services/asistencia-habilitacion');
const evento={inscripcionesConfirmadasAt:'2026-10-29',inscripcionRequierePago:true};
const filas=[{estadoInscripcion:'confirmada'}];
test('asistencia: nómina confirmada, inscripción vigente y cargo conciliado',()=>{
 assert.equal(h(evento,filas,{estado:'pagado'}).disponible,true);
 assert.equal(h(evento,[],{estado:'pagado'}).disponible,false);
 assert.equal(h(evento,[{estadoInscripcion:'baja'}],{estado:'pagado'}).disponible,false);
 assert.equal(h(evento,[...filas,{estadoInscripcion:'provisoria'}],{estado:'pagado'}).disponible,false);
 assert.equal(h({...evento,inscripcionesConfirmadasAt:null},filas,{estado:'pagado'}).disponible,false);
 assert.equal(h(evento,filas,null).disponible,false);
 assert.equal(h({...evento,inscripcionRequierePago:false},filas,null).disponible,true);
 assert.equal(h({...evento,checkinOpenAt:'2026-11-01',checkinCloseAt:'2026-11-02'},filas,{estado:'pagado'},new Date('2026-10-29')).disponible,false);
});
