//require('dotenv').config({ path: './pagos.env' });
//import { osmRouter } from './routes/osm.router';

require('dotenv').config();

if (process.env.NODE_ENV === 'local') {
  const forbiddenHosts = [
    'railway',
    'proxy.rlwy.net',
    'tramway.proxy.rlwy.net',
    'containers-us-west',
    'containers-us-east',
  ];

  const dbHost = process.env.DB_HOST || '';
  const dbName = process.env.DB_NAME || '';

  if (!dbName) {
    throw new Error('Falta DB_NAME en .env local.');
  }

  if (!dbHost) {
    throw new Error('Falta DB_HOST en .env local.');
  }

  const isForbiddenHost = forbiddenHosts.some((term) =>
    dbHost.toLowerCase().includes(term),
  );

  /*if (dbName === 'railway' || isForbiddenHost) {
    throw new Error('PELIGRO: Local Dev está conectado a Railway. Abortando.');
  }*/

  console.log(`🛡️ Local Dev usando base: ${dbName} en host: ${dbHost}`);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
// Railway proxy: use 1 only behind its single public ingress.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
const archivos=require('./config/archivos');
const port = process.env.PORT || 3000;

const padronImportRouter = require('./routes/padronImport.router');
const eventosRouter = require('./routes/eventos.router');
const pagosRouter = require('./routes/pagos.router');
const evaluacionesRouter = require('./routes/evaluaciones.router');
const rolRouter = require('./routes/rol.router');

const perfilesDeportivosRouter = require('./routes/perfilesdeportivos.router');
const preciosParticipacionRouter = require('./routes/preciosParticipacion.router');
const clubesRouter = require('./routes/clubes.router');

// DB: Importa todos los modelos y relaciones
const db = require('./models');

db.sequelize
  .query('SELECT DATABASE() AS dbActual')
  .then(([rows]) => {
    console.log('DB ACTUAL:', rows);
  })
  .catch((err) => console.error('Error consultando DB actual:', err));

//console.log('MODELOS CARGADOS:', Object.keys(db));

// Middlewares

const allowedOrigins = [
  ...(process.env.FRONTEND_URL ? [new URL(process.env.FRONTEND_URL).origin] : []),
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  //'https://fempapp-production.up.railway.app',
  //'https://fempapp-production.up.railway.app:8080',
  'https://fempapp-develop.up.railway.app',
  'https://fempapp-develop.up.railway.app:8080',
  'https://fempapp-back-develop.up.railway.app',
  'https://fempapp-back-develop.up.railway.app:8080',
  'http://localhost:8100',
  'http://localhost',
  'capacitor://localhost',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requests sin origin: Postman, navegador directo, health checks, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.options(
  '*',
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads/usuarios', express.static(archivos.publicDir, {index:false,dotfiles:'deny',setHeaders:res=>res.setHeader('X-Content-Type-Options','nosniff')}));
app.use('/uploads', (_req,res)=>res.status(404).end());

// Rutas
const {verifyToken,requireRole}=require('./middleware/auth.middleware');
app.use('/patinadores',verifyToken,requireRole('administrador','juez'));
app.use('/padron-import',verifyToken,requireRole('administrador'));
app.use(['/roles','/clubes'],(req,res,next)=>['GET','HEAD','OPTIONS'].includes(req.method)?next():verifyToken(req,res,()=>requireRole('administrador')(req,res,next)));
app.use(['/asistencias','/perfiles-deportivos','/evaluaciones','/elementos','/componentes'],verifyToken);
app.use(['/elementos','/componentes'],(req,res,next)=>['GET','HEAD'].includes(req.method)?next():requireRole('administrador','juez')(req,res,next));
app.use('/pagos', pagosRouter);
app.use('/eventos', eventosRouter);
app.use('/precios-participacion', preciosParticipacionRouter);
app.use('/patinadores', require('./routes/patinadores.router'));
app.use('/elementos', require('./routes/elementos.router'));
app.use('/componentes', require('./routes/componentes.router'));
app.use('/padron', require('./routes/padron.router'));
app.use('/roles', require('./routes/rol.router'));
app.use('/documentacion', require('./routes/documentacion.router'));
app.use('/usuarios', require('./routes/usuarios.router'));
app.use('/auth', require('./routes/auth.router'));
app.use('/cuenta', require('./routes/cuenta.router'));
app.use('/tecnica', require('./routes/tecnica.router'));
app.use('/asistencias', require('./routes/asistencias.router'));
app.use('/perfiles-deportivos', perfilesDeportivosRouter);
app.use('/evaluaciones', evaluacionesRouter);
app.use('/clubes', clubesRouter);
app.use('/padron-import', padronImportRouter);
app.use('/clubes', require('./routes/clubes.router'));
//app.use('/api/osm', osmRouter);

// Ruta base
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de Patinadores!');
});


// No comenzar a atender con un esquema incompleto.
async function start() {
  await db.sequelize.authenticate();
  await db.Usuario.findOne({attributes:['id','sessionVersion','revision','camposCorregir','solicitaLicenciaProvincial']});
  await db.CuentaCorreo.count();await db.CuentaHistorial.count();await db.CuentaReset.count();
  require('./services/cuenta-correo').start();
  app.listen(port,'0.0.0.0',()=>console.log('FEMPA API lista. Archivos persistentes configurados.'));
}
start().catch(e=>{console.error('No se pudo iniciar. Revisá migración y variables:',e.name,e.message);process.exitCode=1;});
