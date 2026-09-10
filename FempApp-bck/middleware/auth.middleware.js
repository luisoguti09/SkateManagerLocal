const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_change_me';

const ROLE_MAP = {
  1: 'deportista',
  2: 'administrador',
  3: 'tecnico',
  4: 'tecnico', // juez: compatibilidad vigente en auth.router.js
  5: 'tesoreria'
};

const ROLE_ALIASES = {
  admin: 'administrador',
  administrador: 'administrador',
  auditor: 'tecnico',
  tecnico: 'tecnico',
  juez: 'tecnico',
  deportista: 'deportista',
  tesorero: 'tesoreria',
  tesoreria: 'tesoreria'
};

const normalizeRole = (payload = {}) => {
  const rolId = Number(
    payload.rolId ?? payload.roleId ?? payload.role_id
  );

  let rol = (payload.rol || payload.role || '')
    .toString()
    .trim()
    .toLowerCase();

  if (rol) {
    rol = ROLE_ALIASES[rol] || rol;
  } else if (rolId && ROLE_MAP[rolId]) {
    rol = ROLE_MAP[rolId];
  }

  return {
    rolId: rolId || null,
    rol: rol || null
  };
};

const verifyToken = (req, res, next) => {
  const auth = req.header('Authorization') || '';

  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Acceso denegado, token faltante'
    });
  }

  const token = auth.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rolId, rol } = normalizeRole(decoded);

    req.auth = {
      id: decoded.id ?? decoded.userId ?? decoded.uid ?? null,
      dni: decoded.dni ?? null,
      email: decoded.email ?? null,
      rolId,
      rol,
      raw: decoded
    };

    req.user = {
      id: req.auth.id,
      dni: req.auth.dni,
      email: req.auth.email,
      rolId: req.auth.rolId,
      rol: req.auth.rol
    };

    return next();
  } catch (e) {
    return res.status(401).json({
      error: 'Token inválido'
    });
  }
};

const requireRole = (...rolesPermitidos) => {
  const goals = rolesPermitidos.map(r => String(r).toLowerCase());

  return (req, res, next) => {
    const rolName = (req.auth?.rol || '').toLowerCase();

    if (!rolName || !goals.includes(rolName)) {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };