'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validar}=require('../services/perfil-catalogo-validacion');
const K=require('../services/perfil-catalogo');
const base={disciplina:'Libre',origenCategoria:'CAP',modalidad:'Individual',licencia:'Nacional',divisional:'Sub Divisional B',categoria:'Tercera',temporada:'2027'};
test('catálogo: rechaza variantes libres y combinaciones cruzadas',()=>{
 assert.equal(validar(base),base);
 for(const categoria of ['C3era','c3','tercera','Tercera GM'])assert.throws(()=>validar({...base,categoria}),{status:400});
 assert.throws(()=>validar({...base,origenCategoria:'ESPECIAL_FEMPA'}),{status:400});
 assert.throws(()=>validar({...base,disciplina:'Danza'}),{status:400});
});
test('catálogo: conserva categorías vigentes de Danza y Promos sin inventar FO Promos',()=>{
 validar({...base,disciplina:'Danza',divisional:'Danza Nacional',categoria:K.CATEGORIAS_DANZA_2026['Danza Nacional'][0]});
 const promo={...base,origenCategoria:'PROMOS_FEMPA',licencia:'Promocional',divisional:'Promos FEMPA',categoria:K.CATEGORIAS_PROMOS_FEMPA[0]};
 validar(promo);assert.throws(()=>validar({...promo,disciplina:'Figuras Obligatorias'}),{status:400});
});
