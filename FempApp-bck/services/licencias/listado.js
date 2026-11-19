const {fail}=require('../cuenta-reglas');
function filtrar(rows,estado){
 if(!['todos','confirmados','pendientes','exentos','revision'].includes(estado))fail(400,'Filtro de pagos inválido.');
 return rows.filter(u=>{const s=u.licencia?.estado;
  if(estado==='todos')return true;
  if(estado==='confirmados')return s==='conciliada';
  if(estado==='exentos')return s==='exenta';
  if(estado==='revision')return ['requiere_revision','pago_duplicado'].includes(s);
  return !['conciliada','exenta','requiere_revision','pago_duplicado'].includes(s);
 });
}
function resumen(rows){
 const aprobados=rows.filter(u=>u.licencia?.estado==='conciliada');
 const ids=new Set(),meses=new Map();let totalCentavos=0;
 for(const u of aprobados)for(const o of u.operaciones)if(o.aprobado===true&&o.estado==='approved'&&!o.reintegradoCentavos&&!ids.has(o.paymentId)){ids.add(o.paymentId);totalCentavos+=o.importeCentavos;const d=new Date(o.fechaAprobacion);if(Number.isFinite(d.getTime())){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit'}).formatToParts(d);const mes=parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;meses.set(mes,(meses.get(mes)||0)+o.importeCentavos);}}
 return {porMes:[...meses].sort(([a],[b])=>a.localeCompare(b)).map(([mes,centavos])=>({mes,centavos})),pendientes:filtrar(rows,'pendientes').filter(u=>u.licencia).length,sinIniciar:rows.filter(u=>!u.licencia).length,observados:filtrar(rows,'revision').length,pendienteCotizadoCentavos:filtrar(rows,'pendientes').reduce((sum,u)=>sum+(u.cotizacion?.totalCentavos||0),0),confirmados:aprobados.length,totalCentavos,exentos:rows.filter(u=>u.licencia?.estado==='exenta').length};
}
module.exports={filtrar,resumen};
