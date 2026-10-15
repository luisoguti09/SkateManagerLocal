// dotenv se carga en server.js antes de importar las rutas.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || !JWT_SECRET.trim() || JWT_SECRET === 'dev_only_change_me' || JWT_SECRET === 'secret_key') {
  throw new Error('Configurá JWT_SECRET con un secreto privado antes de iniciar el backend.');
}
module.exports = { JWT_SECRET };
