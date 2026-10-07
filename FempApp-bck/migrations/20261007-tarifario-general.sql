-- Ejecutar en la base del BACKEND que utiliza la app (Railway develop).
-- No precarga importes: Tesorería publica la primera versión desde la app.
CREATE TABLE IF NOT EXISTS tarifarios_generales (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 individual1 DECIMAL(12,2) NOT NULL,
 individual2 DECIMAL(12,2) NOT NULL,
 individual3 DECIMAL(12,2) NOT NULL,
 pareja DECIMAL(12,2) NOT NULL,
 conjunto DECIMAL(12,2) NOT NULL,
 actorId INT NOT NULL,
 createdAt DATETIME NOT NULL,
 updatedAt DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS tarifario_estado (
 id INT NOT NULL PRIMARY KEY,
 tarifarioId INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO tarifario_estado (id, tarifarioId) VALUES (1, NULL)
ON DUPLICATE KEY UPDATE id = 1;
-- Compatible con MySQL y MariaDB; reejecutable sin borrar cargos existentes.
SET @existe = (SELECT COUNT(*) FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos_inscripcion' AND COLUMN_NAME = 'liquidacionSnapshot');
SET @ddl = IF(@existe = 0, 'ALTER TABLE cargos_inscripcion ADD COLUMN liquidacionSnapshot JSON NULL', 'SELECT 1');
PREPARE stmt_tarifario FROM @ddl;
EXECUTE stmt_tarifario;
DEALLOCATE PREPARE stmt_tarifario;
