-- FempApp: columnas utilizadas por el listado y los filtros de Tesoreria.
-- Aplicada manualmente el 2026-09-14 en Railway develop (conexion railway 2).
-- Registro versionado del cambio YA aplicado: no volver a ejecutarlo alli.
-- Para otro entorno: verificar primero su esquema y seleccionar su base.
-- Se ejecuta una sola vez; las nueve columnas deben estar ausentes.
-- ALTER TABLE realiza commit implicito en MySQL.
-- No modifica importes, estados ni identificadores de los pagos existentes.
-- cantidadParticipaciones admite NULL temporalmente para no asignar una
-- cantidad ficticia a registros historicos. Pendiente: recuperar cantidades
-- y perfiles desde evidencia guardada y luego evaluar NOT NULL DEFAULT 1,
-- conforme al modelo Pago. Los snapshots historicos tambien quedan pendientes.

ALTER TABLE pagos
  ADD COLUMN cantidadParticipaciones INT NULL DEFAULT NULL,
  ADD COLUMN perfilDeportivoIds JSON NULL,
  ADD COLUMN deportistaNombreSnapshot VARCHAR(255) NULL,
  ADD COLUMN deportistaDniSnapshot VARCHAR(255) NULL,
  ADD COLUMN eventoNombreSnapshot VARCHAR(255) NULL,
  ADD COLUMN clubId INT NULL,
  ADD COLUMN clubSedeId INT NULL,
  ADD COLUMN clubSnapshot VARCHAR(255) NULL,
  ADD COLUMN clubSedeSnapshot VARCHAR(255) NULL;
