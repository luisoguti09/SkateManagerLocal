# SkateManagerLocal
# Backend FempApp

## Cambios de base de datos — septiembre de 2026

Commit relacionado: 153f641.

En la base local skate_manager_local se agregaron estas columnas
a perfiles_deportivos:

| Columna | Tipo | Permite NULL |
|---------|------|--------------|
| origenCategoria | VARCHAR(50) | Sí |
| clubId | INT | Sí |
| clubSedeId | INT | Sí |

Las tablas clubes y club_sedes ya existían.
Queda pendiente revisar las claves foráneas de las nuevas columnas.
Los clubes guardados como texto no se vincularon automáticamente.

En los datos locales de prueba se asignó CAP a origenCategoria
de los perfiles 1, 2 y 3. Esta asignación no debe copiarse por ID
a otras bases: cada entorno tiene sus propios registros.

En el esquema llamado railway se había renombrado circuito
a origenCategoria. Su estructura completa debe comprobarse
antes de desplegar.

## Criterios funcionales

origenCategoria identifica la procedencia de la categoría.
Se prevén CAP, PROMOS_FEMPA y ESPECIAL_FEMPA.

La licencia se gestiona independientemente de la categoría.
El catálogo administrable todavía está pendiente.

## Verificación realizada

PUT /perfiles-deportivos/1 guardó origenCategoria = CAP
y devolvió correctamente el perfil en el entorno local.

## Otros entornos

Este documento registra cambios ya realizados; no es una
migración automática. Antes de modificar otra base, comprobar
su conexión, columnas y relaciones existentes.