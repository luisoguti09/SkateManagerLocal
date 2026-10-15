const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');
const Usuario = require('../models/usuario.model');
function verificar(limitada) {
  return async (req,res,next) => {
    try {
      const header=req.get('Authorization') || '';
      if(!header.startsWith('Bearer ')) return res.status(401).json({error:'Iniciá sesión.'});
      const payload=jwt.verify(header.slice(7), JWT_SECRET, {algorithms:['HS256']});
      if(!Number.isSafeInteger(Number(payload.id)) || Number(payload.id)<=0) return res.status(401).json({error:'Sesión inválida.'});
      const u=await Usuario.findByPk(payload.id);
      if(!u || Number(payload.sv ?? 0)!==u.sessionVersion) return res.status(401).json({error:'Sesión vencida. Volvé a ingresar.'});
      if(u.estado==='bloqueado') return res.status(403).json({code:'ACCOUNT_BLOCKED',error:'Cuenta bloqueada. Contactá a la Federación.'});
      if(!limitada && (u.estado!=='aprobado' || !u.aprobado)) return res.status(403).json({code:'ACCOUNT_PENDING_APPROVAL',error:'Tu cuenta requiere aprobación.'});
      if(!['pendiente','requiere_correcciones','aprobado'].includes(u.estado)) return res.status(403).json({error:'Estado no habilitado.'});
      req.auth={id:u.id,dni:u.dni,email:u.email,rol:u.rol,rolId:u.rolId,estado:u.estado};
      req.auth.raw={...payload,...req.auth}; req.user=req.auth; req.cuenta=u;
      next();
    } catch(e) {
      if(['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(e.name)) return res.status(401).json({error:'Sesión inválida o vencida.'});
      console.error('[AUTH]',e.name); res.status(503).json({error:'No se pudo verificar tu sesión.'});
    }
  };
}
const verifyToken=verificar(false), verifySession=verificar(true);
const requireRole=(...roles)=>(req,res,next)=>roles.includes(req.auth?.rol) ? next() : res.status(403).json({error:'No tenés permiso.'});
module.exports={ verifyToken, verifySession, requireRole, authMiddleware:verifyToken };
