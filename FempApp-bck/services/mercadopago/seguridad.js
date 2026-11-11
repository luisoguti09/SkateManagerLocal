'use strict';
const crypto = require('node:crypto');
const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function config(env = process.env) {
  if (env.MP_OAUTH_ENABLED !== 'true') fail(503, 'La conexión está pendiente de configuración.');
  const required = ['MP_OAUTH_CLIENT_ID', 'MP_OAUTH_CLIENT_SECRET', 'MP_OAUTH_KEY', 'MP_OAUTH_REDIRECT_URI', 'MP_OAUTH_FRONTEND_URL', 'MP_OAUTH_COLLECTOR_ID', 'MP_OAUTH_MODE'];
  if (required.some(k => !env[k]?.trim())) fail(503, 'Falta completar la configuración de Mercado Pago en el servidor.');
  if (!/^\d+$/.test(env.MP_OAUTH_CLIENT_ID) || !/^\d+$/.test(env.MP_OAUTH_COLLECTOR_ID) || !/^[a-f\d]{64}$/i.test(env.MP_OAUTH_KEY) || !['test', 'production'].includes(env.MP_OAUTH_MODE)) fail(503, 'Configuración de Mercado Pago inválida.');
  let redirect, front;
  try { redirect = new URL(env.MP_OAUTH_REDIRECT_URI); front = new URL(env.MP_OAUTH_FRONTEND_URL); } catch { fail(503, 'URLs de Mercado Pago inválidas.'); }
  if ([redirect, front].some(u => u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) || redirect.pathname !== '/mercadopago/oauth/callback' || !['', '/'].includes(front.pathname)) fail(503, 'Usá HTTPS, el callback indicado y el origen del frontend sin parámetros.');
  const c = {clientId: env.MP_OAUTH_CLIENT_ID, secret: env.MP_OAUTH_CLIENT_SECRET, key: env.MP_OAUTH_KEY, redirect: redirect.href, front: front.origin, collector: env.MP_OAUTH_COLLECTOR_ID, live: env.MP_OAUTH_MODE === 'production'};
  // An in-flight grant cannot cross a server configuration change.
  c.fingerprint = hash(JSON.stringify([c.clientId, c.redirect, c.front, c.collector, c.live, hash(c.secret), hash(c.key)]));
  return c;
}
function seal(data, key, context) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(Buffer.from(context));
  const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}
function open(value, key, context) {
  try {
    const [version, iv, tag, body, extra] = value.split('.');
    if (version !== 'v1' || extra) throw new Error();
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8'));
  } catch { fail(503, 'No se pudo leer la conexión protegida. Revisá la clave del servidor.'); }
}
function challenge(verifier) { return crypto.createHash('sha256').update(verifier).digest('base64url'); }
function validateToken(token, c) {
  if (!token || typeof token.access_token !== 'string' || token.access_token.length < 10 || typeof token.refresh_token !== 'string' || token.refresh_token.length < 10 || !Number.isInteger(token.expires_in) || token.expires_in < 60 || token.expires_in > 366 * 86400 || token.live_mode !== c.live || String(token.user_id) !== c.collector || String(token.token_type).toLowerCase() !== 'bearer') fail(422, 'La autorización no corresponde a la cuenta o al ambiente esperado.');
  const scopes = String(token.scope || '').split(/\s+/);
  if (!['read', 'write', 'offline_access'].every(s => scopes.includes(s))) fail(422, 'La autorización requiere Lectura, Escritura y Acceso offline.');
}
function validateUser(user, c) {
  if (!user || String(user.id) !== c.collector || user.site_id !== 'MLA') fail(422, 'La cuenta autorizada no coincide con el receptor configurado en Argentina.');
  if (Array.isArray(user.tags) && user.tags.includes('test_user') && c.live) fail(422, 'Una cuenta de prueba no puede vincularse como receptor de producción.');
}
module.exports = {config, fail, hash, seal, open, challenge, validateToken, validateUser};
