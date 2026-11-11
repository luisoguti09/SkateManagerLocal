'use strict';
const crypto = require('node:crypto');
const S = require('./seguridad');
const SLOT = 'fempa';
function service({db, Connection, Attempt, Audit, User, provider, configuration = S.config, now = () => Date.now()}) {
  async function actor(id, sv, t) {
    const u = await User.findByPk(id, {transaction: t, ...(t ? {lock: t.LOCK.UPDATE} : {})});
    if (!u || u.rol !== 'tesoreria' || u.estado !== 'aprobado' || !u.aprobado || (sv !== undefined && Number(u.sessionVersion) !== Number(sv))) S.fail(403, 'La autorización requiere una sesión vigente de Tesorería.');
    return u;
  }
  const audit = (id, action, collectorId, revision, t) => Audit.create({actorId: id, action, collectorId, revision}, {transaction: t});
  const context = id => 'mp-oauth/attempt/' + id;
  function validAttempt(a, c) {
    if (!a || new Date(a.expiresAt).getTime() <= now() || a.fingerprint !== c.fingerprint) S.fail(409, 'El intento venció o cambió la configuración. Iniciá una nueva conexión.');
  }
  function sameConnection(row, c) {
    if (!row?.tokens || row.fingerprint !== c.fingerprint || row.collectorId !== c.collector || row.clientId !== c.clientId || Boolean(row.live) !== c.live) S.fail(409, 'La cuenta requiere una nueva autorización.');
  }
  async function status(id) {
    await actor(id);
    let c;
    try { c = configuration(); } catch(e) { return {configured: false, connected: false, message: e.message, cobrosHabilitados: false}; }
    const row = await Connection.findByPk(SLOT);
    return {configured: true, connected: Boolean(row?.tokens && row.fingerprint === c.fingerprint), collectorId: c.collector, mode: c.live ? 'production' : 'test', nickname: row?.fingerprint === c.fingerprint ? row.nickname : null, expiresAt: row?.fingerprint === c.fingerprint ? row.expiresAt : null, verifiedAt: row?.fingerprint === c.fingerprint ? row.verifiedAt : null, cobrosHabilitados: false};
  }
  async function begin(id) {
    const c = configuration(), state = crypto.randomBytes(32).toString('base64url'), key = S.hash(state), verifier = crypto.randomBytes(48).toString('base64url');
    await db.transaction(async t => {
      const u = await actor(id, undefined, t);
      const row = await Connection.findByPk(SLOT, {transaction: t, lock: t.LOCK.UPDATE});
      if (!row) S.fail(503, 'Falta ejecutar la migración de conexión.');
      await Attempt.create({id: key, actorId: u.id, sessionVersion: u.sessionVersion, fingerprint: c.fingerprint, connectionRevision: row.revision, status: 'pending', secret: S.seal({verifier}, c.key, context(key)), expiresAt: new Date(now() + 10 * 60 * 1000)}, {transaction: t});
      await audit(id, 'autorizacion_iniciada', c.collector, row.revision, t);
    });
    const url = new URL('https://auth.mercadopago.com.ar/authorization');
    url.search = new URLSearchParams({client_id: c.clientId, response_type: 'code', platform_id: 'mp', redirect_uri: c.redirect, state, code_challenge: S.challenge(verifier), code_challenge_method: 'S256'}).toString();
    // Only the authenticated initiating browser keeps this ticket in sessionStorage.
    return {url: url.href, ticket: key};
  }
  async function callback(query) {
    const c = configuration();
    if (typeof query.state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(query.state)) S.fail(400, 'Respuesta de autorización inválida.');
    const key = S.hash(query.state);
    let a, verifier;
    await db.transaction(async t => {
      a = await Attempt.findByPk(key, {transaction: t, lock: t.LOCK.UPDATE});
      validAttempt(a, c);
      if (a.status !== 'pending') S.fail(409, 'Este intento ya fue utilizado.');
      await actor(a.actorId, a.sessionVersion, t);
      verifier = S.open(a.secret, c.key, context(key)).verifier;
      await a.update({status: 'processing', secret: null}, {transaction: t});
    });
    try {
      if (query.error !== undefined) S.fail(400, 'La autorización fue cancelada.');
      if (typeof query.code !== 'string' || query.code.length < 5 || query.code.length > 2048) S.fail(400, 'Código inválido.');
      const token = await provider.token(c, {grant_type: 'authorization_code', code: query.code, redirect_uri: c.redirect, code_verifier: verifier, test_token: !c.live});
      S.validateToken(token, c);
      const user = await provider.me(token.access_token); S.validateUser(user, c);
      const bundle = {access: token.access_token, refresh: token.refresh_token, expires: now() + token.expires_in * 1000};
      await db.transaction(async t => {
        const locked = await Attempt.findByPk(key, {transaction: t, lock: t.LOCK.UPDATE});
        validAttempt(locked, c); await actor(locked.actorId, locked.sessionVersion, t);
        if (locked.status !== 'processing') S.fail(409, 'Intento no disponible.');
        await locked.update({status: 'ready', secret: S.seal(bundle, c.key, context(key)), nickname: String(user.nickname || '').slice(0,255), collectorId: c.collector}, {transaction: t});
        await audit(locked.actorId, 'cuenta_verificada', c.collector, locked.connectionRevision, t);
      });
      return 'recibido';
    } catch(e) {
      await Attempt.update({status: 'failed', secret: null}, {where: {id: key, status: 'processing'}});
      throw e;
    }
  }
  async function pending(id, ticket) {
    const c = configuration();
    if (typeof ticket !== 'string' || !/^[a-f0-9]{64}$/.test(ticket)) S.fail(400, 'Intento inválido.');
    const a = await Attempt.findByPk(ticket); validAttempt(a, c);
    if (Number(a.actorId) !== Number(id)) S.fail(403, 'El intento pertenece a otra sesión.');
    await actor(id, a.sessionVersion);
    return {status: a.status, nickname: a.nickname, collectorId: a.collectorId, mode: c.live ? 'production' : 'test'};
  }
  async function confirm(id, ticket) {
    const c = configuration(); await pending(id, ticket);
    await db.transaction(async t => {
      // Same lock order as callback: attempt -> actor -> connection.
      const a = await Attempt.findByPk(ticket, {transaction: t, lock: t.LOCK.UPDATE}); validAttempt(a, c);
      await actor(id, a.sessionVersion, t);
      if (Number(a.actorId) !== Number(id) || a.status !== 'ready') S.fail(409, 'La autorización no está lista para confirmar.');
      const row = await Connection.findByPk(SLOT, {transaction: t, lock: t.LOCK.UPDATE});
      if (!row || row.revision !== a.connectionRevision) S.fail(409, 'La conexión cambió. Iniciá nuevamente.');
      const bundle = S.open(a.secret, c.key, context(ticket));
      if (bundle.expires <= now() + 30000) S.fail(409, 'La autorización venció. Iniciá nuevamente.');
      await row.update({tokens: S.seal(bundle, c.key, 'mp-oauth/connection/' + SLOT), fingerprint: c.fingerprint, clientId: c.clientId, collectorId: c.collector, nickname: a.nickname, live: c.live, expiresAt: new Date(bundle.expires), verifiedAt: new Date(now()), actorId: id, revision: row.revision + 1}, {transaction: t});
      await a.update({status: 'confirmed', secret: null}, {transaction: t});
      await audit(id, 'conexion_confirmada', c.collector, row.revision, t);
    });
    return status(id);
  }
  // Server-only accessor. Row lock serializes refreshes across workers/replicas.
  async function accessToken(id) {
    const c = configuration();
    return db.transaction(async t => {
      if (id !== undefined) await actor(id, undefined, t);
      const row = await Connection.findByPk(SLOT, {transaction: t, lock: t.LOCK.UPDATE}); sameConnection(row, c);
      let bundle = S.open(row.tokens, c.key, 'mp-oauth/connection/' + SLOT);
      if (bundle.expires <= now() + 300000) {
        const token = await provider.token(c, {grant_type: 'refresh_token', refresh_token: bundle.refresh});
        S.validateToken(token, c);
        bundle = {access: token.access_token, refresh: token.refresh_token, expires: now() + token.expires_in * 1000};
        // Persist rotated refresh token before /users/me: transient verification failure must not lose it.
        await row.update({tokens: S.seal(bundle, c.key, 'mp-oauth/connection/' + SLOT), expiresAt: new Date(bundle.expires)}, {transaction: t});
        await audit(id ?? null, 'token_renovado', c.collector, row.revision, t);
      }
      return bundle.access;
    });
  }
  async function verify(id) {
    const c = configuration(), token = await accessToken(id);
    const user = await provider.me(token); S.validateUser(user, c);
    await db.transaction(async t => {
      await actor(id, undefined, t);
      const row = await Connection.findByPk(SLOT, {transaction: t, lock: t.LOCK.UPDATE}); sameConnection(row, c);
      await row.update({verifiedAt: new Date(now())}, {transaction: t});
      await audit(id, 'conexion_comprobada', c.collector, row.revision, t);
    });
    return status(id);
  }
  return {status, begin, callback, pending, confirm, verify, accessToken};
}
let singleton;
function production() {
  if (!singleton) singleton = service({...require('../../models/mercadopago-oauth.model'), User: require('../../models/usuario.model'), provider: require('./api').api()});
  return singleton;
}
module.exports = {service, production};
