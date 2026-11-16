const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../services/licencias/propuesta');
test('corte 24/25 noviembre, continuidad y nuevos valores configurados',()=>{
 const c=structuredClone(P.inicial);
 assert.equal(P.cotizarActual(c,'2026-11-24').totalCentavos,11500000);
 assert.equal(P.cotizarActual(c,'2026-11-25').totalCentavos,13000000);
 assert.equal(P.cotizarActual(c,'2027-01-15').totalCentavos,13000000);
 assert.throws(()=>P.cotizarActual(c,'2026-11-04'));
 c.tramos.push({desde:'2027-02-01',hasta:'2027-03-31',importe:150000,vencimiento:'2027-03-31'});
 assert.equal(P.cotizarActual(c,'2027-01-31').totalCentavos,13000000);
 assert.equal(P.cotizarActual(c,'2027-02-01').totalCentavos,15000000);
 assert.equal(P.cotizarActual(c,'2027-04-01').totalCentavos,15000000);
 assert.equal(P.cotizarActual(c,'2026-11-24').fechaNacional,undefined);
});
