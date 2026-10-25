const Padron=require('../models/padron.model');
const Usuario=require('../models/usuario.model');
const Club=require('../models/club.model');
const normalizar=v=>String(v || '').replace(/\D/g,'');
function filtrar(padron,usuarios,club){
 const cuentas=new Map();
 for(const u of usuarios){const dni=normalizar(u.dni);if(dni)cuentas.set(dni,cuentas.has(dni)?null:u);}
 return padron.filter(p=>{const u=cuentas.get(normalizar(p.documentoN));
  return !!u && u.rol==='deportista' && u.estado==='aprobado' && u.club===club;
 });
}
async function deportistas(u){
 if(['administrador','juez'].includes(u.rol))return Padron.findAll();
 if(u.rol!=='tecnico' || !u.club)return [];
 const club=await Club.findOne({where:{nombre:u.club,activo:true}});if(!club)return [];
 const [padron,usuarios]=await Promise.all([Padron.findAll({attributes:['id','documentoN','apellidoYNombre','club','categoria']}),Usuario.findAll({attributes:['dni','rol','estado','club']})]);
 return filtrar(padron,usuarios,u.club).map(p=>({...p.toJSON(),club:u.club}));
}
module.exports={deportistas,filtrar};
