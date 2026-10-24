'use strict';
// No registrar SQL, parámetros, mensajes del motor, direcciones ni payloads.
function diagnostico(error,etapa){
  const db=error?.original||error?.parent||{};
  const names=['SequelizeDatabaseError','SequelizeConnectionError','SequelizeConnectionRefusedError','SequelizeConnectionAcquireTimeoutError','SequelizeUniqueConstraintError','SequelizeValidationError'];
  const codes=['ER_BAD_FIELD_ERROR','ER_NO_SUCH_TABLE','ER_PARSE_ERROR','ER_ACCESS_DENIED_ERROR','ER_TABLEACCESS_DENIED_ERROR','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT','ER_BAD_NULL_ERROR','ER_DATA_TOO_LONG','ER_TRUNCATED_WRONG_VALUE','ER_DUP_ENTRY','ECONNREFUSED','ETIMEDOUT','ECONNRESET','PROTOCOL_CONNECTION_LOST'];
  return {etapa:['reservar','enviar','confirmar','reintentar'].includes(etapa)?etapa:'desconocida',tipo:names.includes(error?.name)?error.name:'Error',codigo:codes.includes(db.code)?db.code:'NO_CLASIFICADO',numero:Number.isSafeInteger(db.errno)?db.errno:null};
}
module.exports={diagnostico};
