// Migración aditiva e idempotente: no divide ni reemplaza nombres históricos.
async function preparar(sequelize){
 const {DataTypes}=require('sequelize');
 const qi=sequelize.getQueryInterface();
 const table='Usuarios';
 const cols=await qi.describeTable(table);
 for(const key of ['apellido','nombres'])if(!cols[key]){
  try{await qi.addColumn(table,key,{type:DataTypes.STRING(120),allowNull:true});}
  catch(e){if(!(await qi.describeTable(table))[key])throw e;}
 }
}
module.exports={preparar};
