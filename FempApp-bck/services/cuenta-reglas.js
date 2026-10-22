const crypto = require('node:crypto');
const ESTADOS = ['pendiente', 'requiere_correcciones', 'aprobado', 'bloqueado'];
const CAMPOS = ['nombre', 'edad', 'club', 'categoria', 'nivel', 'domicilio', 'telefono', 'fechaNacimiento', 'fotoPerfil', 'dniFrente', 'dniDorso', 'fichaMedica'];
const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
function passwordValida(p) { return typeof p === 'string' && p.length >= 8 && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(p) && /[0-9]/.test(p) && Buffer.byteLength(p) <= 72; }
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function decision(u, body, actor) {
  if (!ESTADOS.includes(body.estado)) fail(400, 'Estado inválido.');
  if (Number(body.revision) !== u.revision) fail(409, 'La solicitud cambió. Actualizá antes de decidir.');
  if (Number(u.id) === Number(actor)) fail(400, 'No podés revisar tu propia cuenta.');
  if (u.estado === body.estado) fail(409, 'La cuenta ya tiene ese estado.');
  if (body.estado === 'requiere_correcciones' && !['pendiente','requiere_correcciones'].includes(u.estado)) fail(409, 'Las correcciones corresponden a una solicitud pendiente.');
  if (u.estado === 'requiere_correcciones' && body.estado === 'aprobado') fail(409, 'Esperá el reenvío de las correcciones.');
  if (body.estado === 'pendiente' && u.estado !== 'bloqueado') fail(409, 'Solo se devuelve a revisión una cuenta bloqueada.');
  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : '';
  if (motivo.length > 2000) fail(400, 'El motivo no debe superar 2000 caracteres.');
  if (['requiere_correcciones','bloqueado'].includes(body.estado) && motivo.length < 5) fail(400, 'Explicá el motivo (al menos 5 caracteres).');
  const campos = [...new Set(Array.isArray(body.campos) ? body.campos : [])];
  const docs=['fotoPerfil','dniFrente','dniDorso','fichaMedica'];
  if(campos.some(k=>docs.includes(k) && !require('./cuenta-documentos').politica(u).visibles.includes(k)))fail(400,'El documento seleccionado no corresponde al rol.');
  if (campos.some(c => !CAMPOS.includes(c))) fail(400, 'Campo de corrección inválido.');
  if (body.estado === 'requiere_correcciones' && !campos.length) fail(400, 'Seleccioná qué campos debe corregir.');
  return { estado: body.estado, aprobado: body.estado === 'aprobado', correcciones: motivo || null,
    camposCorregir: body.estado === 'requiere_correcciones' ? campos : [], revision: u.revision + 1 };
}
function perfil(body) {
  const allowed = [...CAMPOS, 'instagram','facebook','tiktok'].filter(c => !['fotoPerfil','dniFrente','dniDorso','fichaMedica'].includes(c));
  const data = {};
  for (const k of allowed) if (k in body) {
    if (body[k] === null && !['nombre','edad'].includes(k)) { data[k]=null; continue; }
    if (k === 'edad') {
      if (body[k] === '' || !Number.isInteger(Number(body[k])) || Number(body[k]) < 0 || Number(body[k]) > 120) fail(400,'Edad inválida.');
      data[k] = Number(body[k]);
    } else {
      if (typeof body[k] !== 'string' || body[k].length > 255) fail(400, 'Dato inválido: '+k);
      data[k] = body[k].trim();
    }
  }
  if ('nombre' in data && !data.nombre) fail(400, 'Completá el nombre.');
  if (data.fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(data.fechaNacimiento)) fail(400,'Fecha inválida.');
  if (data.fechaNacimiento === '') data.fechaNacimiento = null;
  if ('solicitaLicenciaProvincial' in body) {
    if (typeof body.solicitaLicenciaProvincial !== 'boolean') fail(400,'Solicitud de licencia inválida.');
    data.solicitaLicenciaProvincial = body.solicitaLicenciaProvincial;
  }
  return data;
}
const safe = u => Object.fromEntries(['id','dni','nombre','edad','email','rol','rolId','club','categoria','nivel','estado','aprobado','domicilio','telefono','fechaNacimiento','fotoPerfil','documentacionAprobada','solicitaLicenciaProvincial','revision','correcciones','camposCorregir','rolSolicitado','qrJti','instagram','facebook','tiktok'].map(k=>[k,u[k]]));
module.exports = { ESTADOS, CAMPOS, fail, passwordValida, hashToken, decision, perfil, safe };
