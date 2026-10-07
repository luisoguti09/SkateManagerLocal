const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../services/tarifario-reglas');
const tarifa = { id: 1, individual1: '55000', individual2: '65000', individual3: '70000', pareja: '35000', conjunto: '30000' };
const p = (disciplina, modalidad = 'Individual') => ({ disciplina, modalidad });
test('individuales por escala; pareja y cada conjunto se suman; gestión única', () => {
  for (const [perfiles, total] of [
    [[p('Libre')], '57000.00'],
    [[p('Libre'),p('Figuras Obligatorias')], '67000.00'],
    [[p('Libre'),p('Danza'),p('In Line')], '72000.00'],
    [[p('Libre'),p('Parejas','Parejas')], '92000.00'],
    [[p('Libre'),p('Figuras Obligatorias'),p('Precisión','Show')], '97000.00'],
    [[p('Show','Grupos'),p('Cuarteto','Grupos')], '62000.00'],
    [[p('Parejas','Parejas')], '37000.00'],
    [[p('Danza','Parejas'),p('Libre','Parejas')], '72000.00'],
  ]) assert.equal(T.calcular(perfiles,tarifa,true).montoTotal,total);
});
test('gratuito sin tarifario; configuración ausente, cuatro individuales y perfiles ambiguos se rechazan', () => {
  assert.equal(T.calcular([p('Libre')],null,false).montoTotal,'0.00');
  assert.throws(() => T.calcular([p('Libre')],null,true), /publicar/);
  assert.throws(() => T.calcular(Array.from({length:4},()=>p('Libre')),tarifa,true), /tres/);
  assert.throws(() => T.calcular([p('Desconocida')],tarifa,true), /determinar/);
  assert.throws(() => T.calcular([p('Parejas','Show')],tarifa,true), /combina/);
  assert.throws(() => T.validar({...tarifa,conjunto:'30.001'}), /decimales/);
  assert.equal(T.calcular([p('Libre'),p('Show','Grupos')],{...tarifa,individual1:'10.10',conjunto:'20.20'},true).montoBase,'30.30');
});
