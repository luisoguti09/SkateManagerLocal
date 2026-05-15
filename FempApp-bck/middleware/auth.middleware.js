// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';

// Ajustá estos IDs a tu tabla real si no podés leerlos de DB:
const ROLE_MAP = {
  1: 'deportista',
  2: 'administrador',
  3: 'tecnico',
  4: 'validador'
};

const normalizeRole = (payload = {}) => {
  const rolId = Number(payload.rolId ?? payload.roleId ?? payload.role_id);
  let rol = (payload.rol || payload.role || '').toString().toLowerCase();

  if (!rol && rolId && ROLE_MAP[rolId]) rol = ROLE_MAP[rolId];
  return { rolId: rolId || null, rol: rol || null };
};

const verifyToken = (req, res, next) => {
  const auth = req.header('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado, token faltante' });
  }
  const token = auth.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // debe coincidir con el login
    const { rolId, rol } = normalizeRole(decoded);

    req.auth = {
      id: decoded.id ?? decoded.userId ?? decoded.uid ?? null,
      dni: decoded.dni ?? null,
      email: decoded.email ?? null,
      rolId,
      rol, // nombre normalizado: 'administrador' | 'tecnico' | 'deportista'
      raw: decoded
    };
    req.user =
      { id: req.auth.id, dni: req.auth.dni, email: req.auth.email, rolId: req.auth.rolId, rol: req.auth.rol };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const requireRole = (...rolesPermitidos) => {
  const goals = rolesPermitidos.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const rolName = (req.auth?.rol || '').toLowerCase();
    if (!rolName || !goals.includes(rolName)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };






/*const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const auth = req.header('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado, token faltante' });
  }

  const token = auth.slice(7); // quita "Bearer "
  try {
    const decoded = jwt.verify(token, 'secret_key'); // debe coincidir con el login
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Map opcional rolId → nombre
function idToRoleName(id) {
  const map = { 1: 'administrador', 2: 'tecnico', 3: 'deportista' };
  return map[id] || null;
}

const roleMiddleware = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rol = (req.user?.rol || idToRoleName(req.user?.rolId) || '').toLowerCase();
    if (!rol || !rolesPermitidos.map(r => r.toLowerCase()).includes(rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
};


exports.authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes((req.user?.rol || '').toLowerCase())) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};


const verifyToken = authMiddleware;

const requireRole = roleMiddleware;

module.exports = { authMiddleware, roleMiddleware, verifyToken, requireRole };
 middleware/auth.middleware.js */