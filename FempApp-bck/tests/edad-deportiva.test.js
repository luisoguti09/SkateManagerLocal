const {test}=require('node:test');
const assert=require('node:assert/strict');
const {edadDeportiva,requisitoWada}=require('../services/edad-deportiva');
const u={id:1,rol:'deportista',fechaNacimiento:'2011-05-15'};
test('cumple 16 en mayo de 2027: toda la temporada 2027 requiere WADA',()=>{
 assert.equal(edadDeportiva(u.fechaNacimiento,2027),16);
 assert.equal(requisitoWada(u,[],2027).obligatorio,true);
 assert.equal(requisitoWada(u,[],2026).obligatorio,false);
});
test('menor WS: solo perfiles propios activos de la temporada solicitada',()=>{
 const p={usuarioId:1,activa:true,temporada:'2027',origenCategoria:'CAP',licencia:'Internacional WS'};
 const menor={...u,fechaNacimiento:'2015-06-01'};
 assert.equal(requisitoWada(menor,[p],2027).obligatorio,true);
 for(const cambio of [{activa:false},{temporada:'2026'},{usuarioId:2},{licencia:'Nacional',origenCategoria:'CAP'}])assert.equal(requisitoWada(menor,[{...p,...cambio}],2027).obligatorio,false);
});
test('roles exentos y fecha faltante no equivale a una exención',()=>{
 for(const rol of ['tecnico','juez','administrador','tesoreria'])assert.equal(requisitoWada({...u,rol},[],2027).obligatorio,false);
 assert.equal(requisitoWada({...u,fechaNacimiento:null},[],2027).obligatorio,null);
});
test('fechas imposibles y temporadas ausentes se rechazan; 29 de febrero válido',()=>{
 for(const fecha of ['2011-02-29','2011-13-01','2030-01-01','2011-05-00'])assert.throws(()=>edadDeportiva(fecha,2027));
 assert.equal(edadDeportiva('2012-02-29',2028),16);
 assert.throws(()=>edadDeportiva(u.fechaNacimiento,undefined));
});
