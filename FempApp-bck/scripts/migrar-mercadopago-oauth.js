'use strict';
require('dotenv').config({quiet: true});
async function main() {
  const {db, Connection, Attempt, Audit} = require('../models/mercadopago-oauth.model');
  try {
    const tables = (await db.getQueryInterface().showAllTables()).map(t => String(t.tableName || t));
    console.log(JSON.stringify({modo: process.argv.includes('--aplicar') ? 'aplicar' : 'diagnostico', tablas: [Connection, Attempt, Audit].map(m => ({nombre: m.tableName, existe: tables.includes(m.tableName)}))}));
    if (!process.argv.includes('--aplicar')) return;
    if (!process.argv.includes('--respaldo-verificado')) throw new Error('Respaldo requerido');
    for (const m of [Connection, Attempt, Audit]) await m.sync(); // additive only, never force/alter
    await Connection.findOrCreate({where: {id: 'fempa'}, defaults: {revision: 0}});
    console.log(JSON.stringify({conexionPreparada: true, cobrosHabilitados: false, autorizacionesEjecutadas: false}));
  } finally { await db.close(); }
}
if (require.main === module) main().catch(() => {console.error('No se completó la migración OAuth. Revisá conexión y respaldo.');process.exitCode=1;});
module.exports = {main};
