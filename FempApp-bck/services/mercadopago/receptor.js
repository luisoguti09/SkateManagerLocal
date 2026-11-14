'use strict';
const S = require('./seguridad');
// Explicit selection; never silently substitute credentials for an OAuth failure.
function service({env = process.env, provider = require('./api').api(), oauth, now = Date.now} = {}) {
  function directConfig() {
    const token = env.MP_FEMPA_ACCESS_TOKEN?.trim();
    const collector = env.MP_FEMPA_COLLECTOR_ID?.trim();
    if (!token || !collector) S.fail(503, 'Configurá el Access Token de producción y el ID de la cuenta FEMPA en el servidor.');
    if (!/^APP_USR-[A-Za-z0-9_-]+$/.test(token) || !/^\d+$/.test(collector)) S.fail(503, 'Revisá las credenciales de producción y el ID de FEMPA en el servidor.');
    return {token, collector, live: true};
  }
  function mode() {
    const value = env.MP_CONNECTION_MODE || 'oauth';
    if (!['oauth', 'direct'].includes(value)) S.fail(503, 'MP_CONNECTION_MODE debe ser oauth o direct.');
    return value;
  }
  async function verified() {
    const c = directConfig();
    let user;
    try { user = await provider.me(c.token); }
    catch { S.fail(502, 'No se pudo verificar la credencial con Mercado Pago. Revisá el Access Token de producción de FEMPA y volvé a comprobar.'); }
    S.validateUser(user, c);
    return {c, user};
  }
  async function status(id) {
    if (mode() === 'oauth') return {...await oauth.status(id), connectionMode: 'oauth'};
    const base = {connectionMode: 'direct', mode: 'production', cobrosHabilitados: false};
    let c;
    try { c = directConfig(); }
    catch(e) { return {...base, configured: false, connected: false, message: e.message}; }
    try {
      const {user} = await verified();
      return {...base, configured: true, connected: true, collectorId: c.collector, nickname: user.nickname, verifiedAt: new Date(now()).toISOString()};
    } catch(e) {
      return {...base, configured: true, connected: false, collectorId: c.collector, message: e.message};
    }
  }
  async function verify(id) {
    if (mode() === 'oauth') return {...await oauth.verify(id), connectionMode: 'oauth'};
    const result = await status(id);
    if (!result.connected) S.fail(422, result.message);
    return result;
  }
  const api = {status, verify, async accessToken(id) {
    if (mode() === 'oauth') return oauth.accessToken(id);
    return (await verified()).c.token;
  }};
  for (const action of ['begin', 'pending', 'confirm', 'callback']) api[action] = async (...args) => {
    if (mode() !== 'oauth') S.fail(409, 'La conexión usa credenciales institucionales. Usá Comprobar conexión.');
    return oauth[action](...args);
  };
  return api;
}
let singleton;
function production() {
  if (!singleton) singleton = service({oauth: require('./conexion').production()});
  return singleton;
}
module.exports = {service, production};
