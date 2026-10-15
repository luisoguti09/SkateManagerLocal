const router=require('express').Router();
const {verifySession}=require('../middleware/auth.middleware');
const C=require('../services/cuenta');
const F=require('../services/cuenta-archivos');
const {limite}=require('../middleware/cuenta-limites');
router.put('/:id',verifySession,(req,res,next)=>Number(req.params.id)===req.auth.id?next():res.status(403).json({error:'Solo podés cargar tus documentos.'}),limite('documentos',30,3600000,req=>req.auth.id),F.recibir,C.wrap(async(req,res)=>{
  await F.guardar(req.auth.id,req.files,req.auth.id);res.json(await C.detalle(await C.Usuario.findByPk(req.auth.id)));
}));
module.exports=router;
