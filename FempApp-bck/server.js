
//require('dotenv').config({ path: './pagos.env' });
//import { osmRouter } from './routes/osm.router';

require('dotenv').config();

if (process.env.NODE_ENV === 'local') {
  const forbiddenHosts = [
    'railway',
    'proxy.rlwy.net',
    'tramway.proxy.rlwy.net',
    'containers-us-west',
    'containers-us-east'
  ];

  const dbHost = process.env.DB_HOST || '';
  const dbName = process.env.DB_NAME || '';

  if (!dbName) {
    throw new Error('Falta DB_NAME en .env local.');
  }

  if (!dbHost) {
    throw new Error('Falta DB_HOST en .env local.');
  }

  const isForbiddenHost = forbiddenHosts.some(term =>
    dbHost.toLowerCase().includes(term)
  );

  if (dbName === 'railway' || isForbiddenHost) {
    throw new Error('PELIGRO: Local Dev está conectado a Railway. Abortando.');
  }

  console.log(`🛡️ Local Dev usando base: ${dbName} en host: ${dbHost}`);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
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

db.sequelize.query('SELECT DATABASE() AS dbActual')
  .then(([rows]) => {
    console.log('DB ACTUAL:', rows);
  })
  .catch(err => console.error('Error consultando DB actual:', err));

//console.log('MODELOS CARGADOS:', Object.keys(db));

// Middlewares

const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://fempapp-production.up.railway.app',
  'https://fempapp-production.up.railway.app:8080',
  'https://fempapp-develop.up.railway.app',
  'https://fempapp-develop.up.railway.app:8080'
];

app.use(cors({
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
  credentials: true
}));

app.options('*', cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));


// Rutas
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
app.use('/asistencias', require('./routes/asistencias.router'));
app.use('/perfiles-deportivos', perfilesDeportivosRouter);
app.use('/evaluaciones', evaluacionesRouter);
app.use('/clubes', clubesRouter);
app.use('/padron-import', padronImportRouter);
//app.use('/api/osm', osmRouter);


// Ruta base
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de Patinadores!');
});

// Iniciar servidor y sincronizar base de datos
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
});
db.sequelize.sync().then(() => {
  console.log('✅ Base de datos sincronizada correctamente.');

}).catch(err => {
  console.error('❌ Error al sincronizar base de datos:', err);
});
