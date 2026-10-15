// Límite por proceso: para escalar a varias réplicas usar un almacén compartido.
const buckets = new Map();
const timer = setInterval(() => { const now=Date.now(); for(const [k,v] of buckets) if(v.until<=now) buckets.delete(k); }, 60000);
timer.unref();
function limite(nombre, max, ventana = 900000, clave = req => req.ip) {
  return (req,res,next) => {
    const key = nombre+':'+String(clave(req)); const now=Date.now();
    let v=buckets.get(key); if(!v || v.until<=now) { v={count:0,until:now+ventana}; buckets.set(key,v); }
    if(++v.count>max) return res.set('Retry-After',String(Math.ceil((v.until-now)/1000))).status(429).json({error:'Demasiados intentos. Esperá unos minutos.'});
    next();
  };
}
module.exports = { limite };
