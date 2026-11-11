'use strict';
const {fail} = require('./seguridad');
function api(fetcher = globalThis.fetch) {
  async function request(path, options) {
    let response;
    try { response = await fetcher('https://api.mercadopago.com' + path, {...options, redirect: 'error', signal: AbortSignal.timeout(12000)}); }
    catch { fail(502, 'Mercado Pago no respondió. Volvé a intentar la conexión.'); }
    // Never forward provider bodies, headers or tokens to application logs or clients.
    if (!response.ok) fail(502, 'Mercado Pago rechazó la operación. Volvé a autorizar si persiste.');
    try { return await response.json(); } catch { fail(502, 'Respuesta de Mercado Pago inválida.'); }
  }
  return {
    token: (c, body) => request('/oauth/token', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({client_id: c.clientId, client_secret: c.secret, ...body})}),
    me: token => request('/users/me', {headers: {Authorization: 'Bearer ' + token}})
  };
}
module.exports = {api};
