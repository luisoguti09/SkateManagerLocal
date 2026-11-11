'use strict';
const express = require('express');
const {verifyToken, requireRole} = require('../middleware/auth.middleware');
const {limite} = require('../middleware/cuenta-limites');
const S = require('../services/mercadopago/seguridad');
function router(service = require('../services/mercadopago/conexion').production()) {
  const r = express.Router();
  r.use((_req,res,next) => {res.set({'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'}); next();});
  r.get('/oauth/callback', limite('mp-callback', 30, 600000), async (req,res) => {
    let c;
    try { c = S.config(); } catch { return res.status(503).type('text/plain').send('Conexión pendiente de configuración. Volvé a Tesorería.'); }
    let result = 'error';
    try { result = await service.callback(req.query); } catch { /* No code, state or provider errors in logs. */ }
    return res.redirect(303, c.front + '/tesoreria/mercadopago?resultado=' + result);
  });
  r.use(verifyToken, requireRole('tesoreria'));
  const wrap = fn => async (req,res) => {try {res.json(await fn(req));} catch(e) {res.status(e.status || 503).json({error: e.status ? e.message : 'No se pudo procesar la conexión. Revisá la migración y configuración.'});}};
  r.get('/conexion', wrap(req => service.status(req.auth.id)));
  r.post('/oauth/iniciar', limite('mp-iniciar', 10, 600000, req => req.auth.id), wrap(req => service.begin(req.auth.id)));
  r.post('/oauth/pendiente', wrap(req => service.pending(req.auth.id, req.body.ticket)));
  r.post('/oauth/confirmar', limite('mp-confirmar', 10, 600000, req => req.auth.id), wrap(req => service.confirm(req.auth.id, req.body.ticket)));
  r.post('/conexion/verificar', limite('mp-verificar', 10, 600000, req => req.auth.id), wrap(req => service.verify(req.auth.id)));
  return r;
}
module.exports = {router};
