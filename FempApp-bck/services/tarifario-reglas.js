const R = require('./circuito-reglas');
const campos = ['individual1', 'individual2', 'individual3', 'pareja', 'conjunto'];
function validar(body) {
  const out = {};
  for (const campo of campos) {
    const valor = R.centavos(body[campo]);
    if (valor <= 0) R.fail(400, 'Todos los aranceles deben ser mayores a cero.');
    out[campo] = (valor / 100).toFixed(2);
  }
  return out;
}
const normalizar = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
function tipo(p) {
  const d = normalizar(p.disciplina), m = normalizar(p.modalidad);
  const pareja = /\bpareja(s)?\b/.test(d + ' ' + m);
  const conjunto = /\b(show|cuarteto(s)?|sincro|sincronizado|sincronizada|precision|grupo(s)?)\b/.test(d + ' ' + m);
  if (pareja && conjunto) R.fail(409, `El perfil ${p.perfilDeportivoId || p.id || ''} combina pareja y conjunto. Revisá su disciplina y modalidad.`);
  if (pareja) return 'pareja';
  if (conjunto) return 'conjunto';
  if (['libre', 'danza', 'figuras obligatorias', 'escuela', 'fo', 'in line', 'inline'].includes(d) && ['', 'individual', 'adaptados', 'adultos'].includes(m)) return 'individual';
  R.fail(409, `No se puede determinar el arancel del perfil ${p.perfilDeportivoId || p.id || ''}. Revisá su disciplina y modalidad.`);
}
function calcular(participaciones, tarifario, conCosto) {
  if (!conCosto) return { ...R.montos(null, false), liquidacionSnapshot: { gratuito: true } };
  if (!tarifario) R.fail(409, 'Tesorería debe publicar el tarifario general antes de confirmar la nómina.');
  const cantidades = { individual: 0, pareja: 0, conjunto: 0 };
  for (const p of participaciones) cantidades[tipo(p)]++;
  if (!participaciones.length) R.fail(409, 'No hay participaciones para liquidar.');
  if (cantidades.individual > 3) R.fail(409, 'El tarifario contempla hasta tres participaciones individuales. Tesorería debe revisar este caso.');
  const valores = validar(tarifario);
  const detalle = [];
  if (cantidades.individual) detalle.push({ concepto: 'individual', cantidad: cantidades.individual, importe: valores['individual' + cantidades.individual] });
  for (const concepto of ['pareja', 'conjunto']) if (cantidades[concepto]) detalle.push({ concepto, cantidad: cantidades[concepto], unitario: valores[concepto], importe: (R.centavos(valores[concepto]) * cantidades[concepto] / 100).toFixed(2) });
  const base = detalle.reduce((sum, item) => sum + R.centavos(item.importe), 0);
  if (!Number.isSafeInteger(base) || base + 200000 > 999999999999) R.fail(409, 'El importe excede el máximo permitido.');
  return { ...R.montos((base / 100).toFixed(2), true), liquidacionSnapshot: { tarifarioId: tarifario.id, detalle, gestion: '2000.00' } };
}
module.exports = { campos, validar, tipo, calcular };
