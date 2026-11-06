// Catálogo generado de FempApp/src/app/constants/perfil-deportivo.options.ts.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORIAS_PROMOS_FEMPA = exports.CATEGORIAS_DANZA_2026 = exports.LICENCIAS = exports.EFICIENCIAS_POR_DIVISIONAL = exports.DIVISIONALES = exports.MODALIDADES = exports.DISCIPLINAS = void 0;
exports.categoriasPerfil = categoriasPerfil;
exports.DISCIPLINAS = [
    'Libre',
    'Danza',
    'Figuras Obligatorias',
    'Parejas',
    'In Line',
    'Precisión'
];
exports.MODALIDADES = [
    'Individual',
    'Parejas',
    'Grupos',
    'Adaptados',
    'Show',
    'Adultos'
];
exports.DIVISIONALES = [
    'World Skate / Internacional',
    'Sub Divisional A',
    'Sub Divisional B',
    'Copa Roberto Rodriguez',
    'Copa Gonzalez Molina',
    'Danza Nacional',
    'Adultos',
    'Adaptados'
];
exports.EFICIENCIAS_POR_DIVISIONAL = {
    'Sub Divisional B': [
        'Promocional',
        'Tercera',
        'Segunda',
        'Primera'
    ],
    'Sub Divisional A': [
        'Nacional',
        'Elite'
    ],
    'Copa Roberto Rodriguez': [
        'Escuela Formativa',
        'Quinta',
        'Cuarta'
    ],
    'Copa Gonzalez Molina': [
        'Tercera GM',
        'Segunda GM',
        'Primera GM'
    ],
    'World Skate / Internacional': [
        'Internacional / WS'
    ]
};
// Catálogo explícito CAP 2026 y Promos FEMPA 2023 (vigente hasta reemplazo).
// Mantener versiones históricas al actualizar; no migrar perfiles ni cobros automáticamente.
exports.LICENCIAS = ['Provincial', 'Provincial Promocional', 'Nacional', 'Promocional', 'Adaptado'];
const DANZA_JOVENES = ['Tots / Pre Mini', 'Mini Infantil', 'Infantil', 'Cadete', 'Juvenil', 'Junior', 'Senior'];
const DANZA_ADULTOS = ['Clásico', 'Novicio', 'Profesional', 'Máster', 'Experto', 'Decano', 'Idóneo'];
const DANZA_EDADES = [...DANZA_JOVENES, ...DANZA_ADULTOS];
exports.CATEGORIAS_DANZA_2026 = {
    'Danza Nacional': [
        ...DANZA_JOVENES.map(e => `Básico · ${e} · Combinada`),
        ...DANZA_JOVENES.map(e => `Intermedia · ${e} · Combinada`),
        ...['Básico', 'Intermedia'].flatMap(n => DANZA_ADULTOS.flatMap(e => ['Danza obligatoria', 'Free Dance'].map(p => `${n} · ${e} · ${p}`))),
        'Élite · Junior B · Combinada', 'Élite · Senior B · Combinada', 'Élite · Leyenda · Combinada'
    ],
    'Copa Gonzalez Molina': [
        ...DANZA_EDADES.map(e => `Básico · ${e} · Danza obligatoria`),
        ...DANZA_EDADES.flatMap(e => ['Danza obligatoria', 'Combinada'].map(p => `Avanzado · ${e} · ${p}`))
    ],
    // Sin traducir requisitos de Rollart a categorías de competencia.
    'World Skate / Internacional': ['Tots', 'Minis', 'Espoir (Infantil)', 'Cadet (Cadete)', 'Youth (Juvenil)', 'Junior', 'Senior']
};
exports.CATEGORIAS_PROMOS_FEMPA = [0, 1, 2, 3].flatMap(n => ['Infantiles (hasta 13 años)', 'Mayores (desde 14 años)'].map(e => `Promo ${n} · ${e}`));
function categoriasPerfil(disciplina, origen, divisional) {
    if (origen === 'PROMOS_FEMPA')
        return disciplina === 'Libre' && divisional === 'Promos FEMPA' ? exports.CATEGORIAS_PROMOS_FEMPA : [];
    if (disciplina === 'Danza')
        return exports.CATEGORIAS_DANZA_2026[divisional] || [];
    return exports.EFICIENCIAS_POR_DIVISIONAL[divisional] || [];
}
